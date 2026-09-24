import { sql } from "@/lib/db";
import { generateReference, isReferenceCollision } from "@/lib/reference";
import { createManageToken } from "@/lib/tokens";
import { melbourneToUtc, daysInclusive, fmtDateTime } from "@/lib/time";
import { formatAuMobile } from "@/lib/validation/booking";
import type { BookingData } from "@/lib/validation/booking";
import { summariseHours } from "@/lib/hours";
import { actorId, actorLabel, type AuditActor } from "@/lib/audit";
import type { BookingEmailData } from "@/lib/email";

type Row = Record<string, unknown>;

const MAX_REFERENCE_ATTEMPTS = 5;

/** Melbourne dates touched by an active booking, as "YYYY-MM-DD". Optionally ignores one booking (when changing its dates). */
export async function getUnavailableDates(excludeBookingId: string | null = null): Promise<string[]> {
  const rows = (await sql`
    SELECT DISTINCT to_char(d, 'YYYY-MM-DD') AS d
    FROM bookings b,
         generate_series(
           (b.pickup_at AT TIME ZONE 'Australia/Melbourne')::date,
           (b.return_at AT TIME ZONE 'Australia/Melbourne')::date,
           INTERVAL '1 day'
         ) AS d
    WHERE b.status IN ('confirmed', 'picked_up')
      AND b.return_at > NOW() - INTERVAL '1 day'
      AND (${excludeBookingId}::uuid IS NULL OR b.id <> ${excludeBookingId}::uuid)
    ORDER BY 1
  `) as Row[];
  return rows.map((r) => r.d as string);
}

/** Look up org by name. Returns category and whether they are invoiced. */
export async function lookupOrganisation(name: string) {
  const rows = (await sql`
    SELECT id, category, invoicing_frequency
    FROM organisations
    WHERE LOWER(name) = LOWER(${name.trim()})
    LIMIT 1
  `) as Row[];
  if (!rows[0]) return null;
  return {
    id: rows[0].id as string,
    category: rows[0].category as "a" | "c",
    isInvoicedOrg: rows[0].invoicing_frequency !== null,
  };
}

/** Fetch current pricing snapshot */
export async function getPricingSnapshot() {
  const [zones, settings] = await Promise.all([
    sql`SELECT id, zone_name, examples, rate_per_day, display_order
        FROM pricing_zones ORDER BY display_order ASC` as Promise<Row[]>,

    sql`SELECT additional_day_rate FROM system_settings LIMIT 1` as Promise<Row[]>,
  ]);
  return {
    zones: zones.map((r) => ({
      id: r.id as string,
      zoneName: r.zone_name as string,
      examples: r.examples as string | null,
      ratePerDay: Number(r.rate_per_day),
      displayOrder: Number(r.display_order),
    })),
    additionalDayRate: Number(settings[0]?.additional_day_rate ?? 68),
  };
}

/** Current conditions of use */
export async function getCurrentConditions() {
  const rows = (await sql`
    SELECT id, version, content FROM conditions_of_use WHERE is_current = TRUE LIMIT 1
  ` as Row[]);
  if (!rows[0]) return null;
  return {
    id: rows[0].id as string,
    version: Number(rows[0].version),
    content: rows[0].content as string,
  };
}

// ── Create ──────────────────────────────────────────────────

export interface CreatedBooking {
  id: string;
  reference: string;
  token: string;
  amountDue: number;
  category: "a" | "c";
  isInvoicedOrg: boolean;
  zoneName: string;
}

/**
 * Inserts the booking, its driver and an audit entry in one statement (atomic over Neon's HTTP driver).
 * Throws a Postgres exclusion_violation (23P01) if the period overlaps an active booking.
 */
export async function createBooking(
  d: BookingData,
  ctx: {
    zone: { id: string; zoneName: string; ratePerDay: number };
    additionalDayRate: number;
    org: { id: string; category: "a" | "c"; isInvoicedOrg: boolean } | null;
    conditionsId: string | null;
  },
): Promise<CreatedBooking> {
  const category = ctx.org?.category ?? "a";
  const isInvoicedOrg = ctx.org?.isInvoicedOrg ?? false;
  const days = daysInclusive(d.startDate, d.endDate);
  const amountDue = category === "c" ? 0 : ctx.zone.ratePerDay * days;
  const pickupAt = melbourneToUtc(d.startDate, d.pickupTime).toISOString();
  const returnAt = melbourneToUtc(d.endDate, d.returnTime).toISOString();
  const bookerName = d.organisation ?? d.contactName;

  for (let attempt = 1; ; attempt++) {
    const reference = generateReference();
    const { token, hash } = createManageToken();
    try {
      const rows = (await sql`
        WITH b AS (
          INSERT INTO bookings (
            reference, organisation_id, organisation_name, booker_name, contact_person, contact_phone,
            booker_email, contact_address, category, is_invoiced_org, status,
            zone_id, zone_name, rate_per_day, additional_day_rate,
            start_date, end_date, pickup_time, dropoff_time, pickup_at, return_at,
            destination, amount_due, conditions_version_id, conditions_accepted_at, manage_token_hash
          ) VALUES (
            ${reference}, ${ctx.org?.id ?? null}::uuid, ${d.organisation}::text, ${bookerName}, ${d.contactName}, ${d.contactMobile},
            ${d.contactEmail}, ${d.contactAddress}, ${category}::booking_category, ${isInvoicedOrg}, 'confirmed',
            ${ctx.zone.id}::uuid, ${ctx.zone.zoneName}, ${ctx.zone.ratePerDay}, ${ctx.additionalDayRate},
            ${d.startDate}::date, ${d.endDate}::date, ${d.pickupTime}::time, ${d.returnTime}::time,
            ${pickupAt}::timestamptz, ${returnAt}::timestamptz,
            ${d.destination}, ${amountDue}, ${ctx.conditionsId}::uuid, NOW(), ${hash}
          )
          RETURNING id
        ), drv AS (
          INSERT INTO booking_drivers (booking_id, full_name, mobile, licence_number, licence_state, licence_expiry, home_address, age_confirmed)
          SELECT id, ${d.driverName}, ${d.driverMobile}, ${d.licenceNumber}, ${d.licenceState}, ${d.licenceExpiry}::date, ${d.driverAddress}, ${d.ageConfirmed}
          FROM b
        ), log AS (
          INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_label, details)
          SELECT 'booking', id::text, id, 'created', 'Customer',
                 jsonb_build_object('reference', ${reference}::text, 'pickup_at', ${pickupAt}::text, 'return_at', ${returnAt}::text,
                                    'conditions_version_id', ${ctx.conditionsId}::text)
          FROM b
        )
        SELECT id FROM b
      `) as Row[];

      return {
        id: rows[0].id as string,
        reference,
        token,
        amountDue,
        category,
        isInvoicedOrg,
        zoneName: ctx.zone.zoneName,
      };
    } catch (err) {
      if (isReferenceCollision(err) && attempt < MAX_REFERENCE_ATTEMPTS) continue;
      throw err;
    }
  }
}

// ── Manage link ─────────────────────────────────────────────

export interface ManageableBooking {
  id: string;
  reference: string;
  startDate: string;
  endDate: string;
  pickupTime: string;
  returnTime: string;
  pickupAt: string;
  returnAt: string;
  destination: string;
  zoneName: string;
  contactName: string;
  amountDue: number;
  ratePerDay: number;
  category: "a" | "c";
  isInvoicedOrg: boolean;
}

/** Looks up a booking by manage-token hash. Only confirmed bookings are manageable. */
export async function getManageableBooking(tokenHash: string): Promise<ManageableBooking | null> {
  const rows = (await sql`
    SELECT id, reference, start_date::text AS start_date, end_date::text AS end_date,
           to_char(pickup_time, 'HH24:MI') AS pickup_time, to_char(dropoff_time, 'HH24:MI') AS return_time,
           pickup_at, return_at, destination, zone_name, contact_person, amount_due, rate_per_day,
           category, is_invoiced_org
    FROM bookings
    WHERE manage_token_hash = ${tokenHash} AND status = 'confirmed'
    LIMIT 1
  `) as Row[];
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id as string,
    reference: r.reference as string,
    startDate: r.start_date as string,
    endDate: r.end_date as string,
    pickupTime: r.pickup_time as string,
    returnTime: r.return_time as string,
    pickupAt: new Date(r.pickup_at as string).toISOString(),
    returnAt: new Date(r.return_at as string).toISOString(),
    destination: r.destination as string,
    zoneName: r.zone_name as string,
    contactName: r.contact_person as string,
    amountDue: Number(r.amount_due),
    ratePerDay: Number(r.rate_per_day),
    category: r.category as "a" | "c",
    isInvoicedOrg: r.is_invoiced_org as boolean,
  };
}

/** Issues a fresh manage token (invalidating the old one). Returns null unless the booking is confirmed. */
export async function rotateManageToken(bookingId: string): Promise<string | null> {
  const { token, hash } = createManageToken();
  const rows = (await sql`
    UPDATE bookings SET manage_token_hash = ${hash}
    WHERE id = ${bookingId}::uuid AND status = 'confirmed'
    RETURNING id
  `) as Row[];
  return rows[0] ? token : null;
}

// ── Lifecycle ───────────────────────────────────────────────

/**
 * Cancels a booking and kills its manage link. Customers can only cancel confirmed bookings;
 * staff can also cancel one that's been picked up. Returns false if nothing was cancelled.
 */
export async function cancelBooking(
  bookingId: string,
  actor: AuditActor,
  opts: { reason?: string; allowPickedUp?: boolean } = {},
): Promise<boolean> {
  const rows = (await sql`
    WITH c AS (
      UPDATE bookings
      SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_user_id = ${actorId(actor)}::uuid,
          cancellation_reason = ${opts.reason ?? null}::text, manage_token_hash = NULL
      WHERE id = ${bookingId}::uuid
        AND (status = 'confirmed' OR (${opts.allowPickedUp ?? false} AND status = 'picked_up'))
      RETURNING id, reference, status
    ), log AS (
      INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_user_id, actor_label, details)
      SELECT 'booking', id::text, id, 'cancelled', ${actorId(actor)}::uuid, ${actorLabel(actor)},
             jsonb_build_object('reference', reference, 'reason', ${opts.reason ?? null}::text)
      FROM c
    )
    SELECT id FROM c
  `) as Row[];
  return rows.length > 0;
}

export type ModifyResult =
  | { ok: true; bookingId: string; reference: string; token: string }
  | { ok: false; reason: "not_modifiable" };

/**
 * Changes a booking's dates by cancelling it and creating a replacement with a new reference
 * and manage token, all in one statement. The old row stays (cancelled, pointing at nothing,
 * with the replacement's replaces_booking_id pointing back) so staff can turn away anyone
 * holding the old confirmation.
 *
 * Throws a Postgres exclusion_violation (23P01) if the new period overlaps another booking.
 */
export async function modifyBookingDates(
  bookingId: string,
  p: { startDate: string; endDate: string; pickupTime: string; returnTime: string },
  actor: AuditActor,
): Promise<ModifyResult> {
  const days = daysInclusive(p.startDate, p.endDate);
  const pickupAt = melbourneToUtc(p.startDate, p.pickupTime).toISOString();
  const returnAt = melbourneToUtc(p.endDate, p.returnTime).toISOString();
  const aId = actorId(actor);
  const aLabel = actorLabel(actor);

  for (let attempt = 1; ; attempt++) {
    const reference = generateReference();
    const { token, hash } = createManageToken();
    try {
      const rows = (await sql`
        WITH old AS (
          UPDATE bookings
          SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_user_id = ${aId}::uuid,
              cancellation_reason = ${`Dates changed; replaced by ${reference}`}, manage_token_hash = NULL
          WHERE id = ${bookingId}::uuid AND status = 'confirmed'
          RETURNING *
        ), nb AS (
          INSERT INTO bookings (
            reference, organisation_id, organisation_name, booker_name, contact_person, contact_phone,
            booker_email, contact_address, category, is_invoiced_org, status,
            zone_id, zone_name, rate_per_day, additional_day_rate,
            start_date, end_date, pickup_time, dropoff_time, pickup_at, return_at,
            destination, purpose, passenger_count, amount_due,
            conditions_version_id, conditions_accepted_at, manage_token_hash, replaces_booking_id,
            payment_method, paid_at, paid_recorded_by_user_id
          )
          SELECT
            ${reference}, organisation_id, organisation_name, booker_name, contact_person, contact_phone,
            booker_email, contact_address, category, is_invoiced_org, 'confirmed',
            zone_id, zone_name, rate_per_day, additional_day_rate,
            ${p.startDate}::date, ${p.endDate}::date, ${p.pickupTime}::time, ${p.returnTime}::time,
            ${pickupAt}::timestamptz, ${returnAt}::timestamptz,
            destination, purpose, passenger_count,
            CASE WHEN category = 'c' THEN 0 ELSE rate_per_day * ${days} END,
            conditions_version_id, conditions_accepted_at, ${hash}, id,
            payment_method, paid_at, paid_recorded_by_user_id
          FROM old
          RETURNING id, reference, replaces_booking_id
        ), drv AS (
          INSERT INTO booking_drivers (booking_id, full_name, mobile, licence_number, licence_state, licence_expiry, home_address, age_confirmed)
          SELECT nb.id, d.full_name, d.mobile, d.licence_number, d.licence_state, d.licence_expiry, d.home_address, d.age_confirmed
          FROM nb JOIN booking_drivers d ON d.booking_id = nb.replaces_booking_id
        ), log AS (
          INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_user_id, actor_label, details)
          SELECT 'booking', x.id::text, x.id, x.action, ${aId}::uuid, ${aLabel}, x.details
          FROM (
            SELECT old.id, 'dates_changed' AS action,
                   jsonb_build_object('replaced_by', ${reference}::text,
                                      'old_pickup_at', old.pickup_at, 'old_return_at', old.return_at) AS details
            FROM old
            UNION ALL
            SELECT nb.id, 'created',
                   jsonb_build_object('replaces', (SELECT reference FROM old),
                                      'pickup_at', ${pickupAt}::text, 'return_at', ${returnAt}::text)
            FROM nb
          ) x
        )
        SELECT id, reference FROM nb
      `) as Row[];

      if (!rows[0]) return { ok: false, reason: "not_modifiable" };
      return { ok: true, bookingId: rows[0].id as string, reference, token };
    } catch (err) {
      if (isReferenceCollision(err) && attempt < MAX_REFERENCE_ATTEMPTS) continue;
      throw err;
    }
  }
}

// ── Settings used by the booking flow ───────────────────────

export async function getBookingSettings() {
  const rows = (await sql`
    SELECT self_cancel_cutoff_hours, admin_notify_email, email_reply_to FROM system_settings LIMIT 1
  `) as Row[];
  return {
    selfCancelCutoffHours: Number(rows[0]?.self_cancel_cutoff_hours ?? 0),
    adminNotifyEmail: (rows[0]?.admin_notify_email as string | null) ?? null,
    replyTo: (rows[0]?.email_reply_to as string | null) ?? null,
  };
}

/** Where admin notifications go: the settings address(es) if set, otherwise every active admin. */
export async function getAdminNotifyEmails(): Promise<string[]> {
  const { adminNotifyEmail } = await getBookingSettings();
  if (adminNotifyEmail?.trim()) {
    return adminNotifyEmail.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean);
  }
  const rows = (await sql`SELECT email FROM users WHERE role = 'admin' AND is_active = TRUE`) as Row[];
  return rows.map((r) => r.email as string);
}

// ── Email data ──────────────────────────────────────────────

export async function getBookingEmailData(bookingId: string): Promise<BookingEmailData | null> {
  const [rows, loc, hours] = await Promise.all([
    sql`
      SELECT b.id, b.reference, b.contact_person, b.contact_phone, b.booker_email, b.organisation_name,
             b.pickup_at, b.return_at, b.destination, b.zone_name, b.amount_due, b.category, b.is_invoiced_org,
             c.version AS conditions_version, c.content AS conditions_content, s.email_reply_to
      FROM bookings b
      LEFT JOIN conditions_of_use c ON c.id = b.conditions_version_id
      LEFT JOIN LATERAL (SELECT email_reply_to FROM system_settings LIMIT 1) s ON TRUE
      WHERE b.id = ${bookingId}::uuid
    ` as Promise<Row[]>,
    sql`SELECT id, bank_name, street_address, phone FROM bank_records WHERE is_active = TRUE LIMIT 1` as Promise<Row[]>,
    sql`
      SELECT oh.day_of_week, oh.is_open, to_char(oh.opening_time, 'HH24:MI') AS opening_time, to_char(oh.closing_time, 'HH24:MI') AS closing_time
      FROM opening_hours oh JOIN bank_records br ON br.id = oh.bank_record_id
      WHERE br.is_active = TRUE ORDER BY oh.day_of_week
    ` as Promise<Row[]>,
  ]);
  const r = rows[0];
  if (!r) return null;

  return {
    bookingId: r.id as string,
    reference: r.reference as string,
    contactName: r.contact_person as string,
    contactMobile: formatAuMobile(r.contact_phone as string),
    contactEmail: r.booker_email as string,
    organisation: (r.organisation_name as string | null) ?? null,
    pickupText: fmtDateTime(r.pickup_at),
    returnText: fmtDateTime(r.return_at),
    destination: r.destination as string,
    zoneName: r.zone_name as string,
    amountDue: Number(r.amount_due),
    category: r.category as "a" | "c",
    isInvoicedOrg: r.is_invoiced_org as boolean,
    pickupLocation: loc[0]
      ? {
          name: loc[0].bank_name as string,
          address: loc[0].street_address as string,
          phone: (loc[0].phone as string) ?? "",
          hoursText: summariseHours(
            hours.map((h) => ({
              dayOfWeek: Number(h.day_of_week),
              isOpen: h.is_open as boolean,
              openingTime: h.opening_time as string | null,
              closingTime: h.closing_time as string | null,
            })),
          ),
        }
      : null,
    conditions: r.conditions_content
      ? { version: Number(r.conditions_version), content: r.conditions_content as string }
      : null,
    replyTo: (r.email_reply_to as string | null) ?? null,
  };
}
