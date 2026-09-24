import { sql } from "@/lib/db";

type Row = Record<string, unknown>;

// ── Dashboard ────────────────────────────────────────────────

export async function getDashboardStats() {
  const rows = (await sql`
    SELECT
      COUNT(*)                                                                      AS total_bookings,
      COUNT(*) FILTER (WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW()))
                                                                                   AS bookings_this_month,
      COALESCE(SUM(amount_due) FILTER (
        WHERE paid_at IS NOT NULL
          AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', NOW())
      ), 0)                                                                         AS revenue_this_month,
      COUNT(*) FILTER (WHERE status = 'picked_up')                                AS currently_out,
      COUNT(*) FILTER (WHERE status = 'picked_up' AND return_at < NOW())          AS overdue,
      COUNT(*) FILTER (WHERE status = 'confirmed')                                AS confirmed
    FROM bookings
    WHERE status != 'cancelled'
  `) as Row[];
  const r = rows[0];
  return {
    totalBookings:      Number(r.total_bookings),
    bookingsThisMonth:  Number(r.bookings_this_month),
    revenueThisMonth:   Number(r.revenue_this_month),
    currentlyOut:       Number(r.currently_out),
    overdue:            Number(r.overdue),
    confirmed:          Number(r.confirmed),
  };
}

export async function getRecentBookings(limit = 5) {
  return (await sql`
    SELECT b.id, b.reference, b.booker_name, b.status, b.start_date, b.end_date,
           b.destination, b.amount_due, b.category
    FROM bookings b
    ORDER BY b.created_at DESC
    LIMIT ${limit}
  `) as Row[];
}

// ── Bookings ─────────────────────────────────────────────────

export async function getBookingsList(filters: {
  status?: string;
  category?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
} = {}) {
  const { status, category, search, dateFrom, dateTo } = filters;
  return (await sql`
    SELECT
      b.id, b.reference, b.booker_name, b.contact_phone, b.booker_email,
      b.category, b.is_invoiced_org, b.status, b.zone_name,
      b.start_date, b.end_date, b.pickup_time, b.dropoff_time,
      b.destination, b.amount_due, b.created_at,
      d.full_name  AS driver_name,
      d.mobile     AS driver_mobile,
      d.licence_number,
      d.licence_expiry,
      d.home_address
    FROM bookings b
    LEFT JOIN booking_drivers d ON d.booking_id = b.id
    WHERE TRUE
      AND (${status ?? null}::text IS NULL OR b.status::text = ${status ?? null}::text)
      AND (${category ?? null}::text IS NULL OR b.category::text = ${category ?? null}::text)
      AND (${search ?? null}::text IS NULL OR (
            b.booker_name ILIKE ${'%' + (search ?? '') + '%'}
         OR b.reference   ILIKE ${'%' + (search ?? '') + '%'}
         OR b.booker_email ILIKE ${'%' + (search ?? '') + '%'}
      ))
      AND (${dateFrom ?? null}::date IS NULL OR b.start_date >= ${dateFrom ?? null}::date)
      AND (${dateTo ?? null}::date IS NULL OR b.start_date <= ${dateTo ?? null}::date)
    ORDER BY b.created_at DESC
    LIMIT 200
  `) as Row[];
}

export async function getBookingDetail(id: string) {
  const rows = (await sql`
    SELECT
      b.id, b.reference, b.booker_name, b.organisation_name, b.contact_person, b.contact_phone,
      b.booker_email, b.contact_address, b.category, b.is_invoiced_org, b.status,
      b.zone_name, b.rate_per_day, b.additional_day_rate,
      b.start_date::text AS start_date, b.end_date::text AS end_date,
      to_char(b.pickup_time, 'HH24:MI') AS pickup_time, to_char(b.dropoff_time, 'HH24:MI') AS dropoff_time,
      b.pickup_at, b.return_at,
      b.destination, b.purpose, b.passenger_count,
      b.amount_due, b.payment_method, b.paid_at,
      b.conditions_accepted_at, c.version AS conditions_version,
      b.keys_collected_at, b.licence_sighted, b.key_handed_over, b.odometer_out, pu.display_name AS picked_up_by,
      b.keys_returned_at, b.odometer_in, b.fuel_full, b.bus_cleaned, b.damage_notes, b.damage_photo_url,
      rt.display_name AS returned_by,
      b.cancelled_at, b.cancellation_reason, cu.display_name AS cancelled_by, b.created_at,
      b.replaces_booking_id, prev.reference AS replaces_reference,
      nxt.id AS replaced_by_id, nxt.reference AS replaced_by_reference,
      d.full_name    AS driver_name,
      d.mobile       AS driver_mobile,
      d.licence_number,
      d.licence_state,
      d.licence_expiry,
      d.home_address,
      d.age_confirmed
    FROM bookings b
    LEFT JOIN booking_drivers d ON d.booking_id = b.id
    LEFT JOIN conditions_of_use c ON c.id = b.conditions_version_id
    LEFT JOIN users pu ON pu.id = b.picked_up_by_user_id
    LEFT JOIN users rt ON rt.id = b.returned_by_user_id
    LEFT JOIN users cu ON cu.id = b.cancelled_by_user_id
    LEFT JOIN bookings prev ON prev.id = b.replaces_booking_id
    LEFT JOIN bookings nxt ON nxt.replaces_booking_id = b.id
    WHERE b.id = ${id}::uuid
    LIMIT 1
  `) as Row[];
  return rows[0] ?? null;
}

export async function getBookingAudit(bookingId: string) {
  return (await sql`
    SELECT action, actor_label, details, created_at
    FROM audit_log
    WHERE booking_id = ${bookingId}::uuid
    ORDER BY created_at ASC
  `) as Row[];
}

export async function getBookingEmails(bookingId: string) {
  return (await sql`
    SELECT kind, to_address, subject, status, error, created_at, updated_at
    FROM email_log
    WHERE booking_id = ${bookingId}::uuid
    ORDER BY created_at DESC
  `) as Row[];
}

/** Recent emails that bounced, were marked as spam, or failed to send. */
export async function getEmailProblems(limit = 20) {
  return (await sql`
    SELECT e.id, e.kind, e.to_address, e.status, e.error, e.created_at,
           b.id AS booking_id, b.reference, b.status AS booking_status
    FROM email_log e
    LEFT JOIN bookings b ON b.id = e.booking_id
    WHERE e.status IN ('bounced', 'complained', 'failed')
      AND e.created_at > NOW() - INTERVAL '60 days'
    ORDER BY e.created_at DESC
    LIMIT ${limit}
  `) as Row[];
}

// ── Day view (counter) ───────────────────────────────────────

/**
 * Everything happening on a Melbourne calendar date: pickups, returns, and anything
 * picked up earlier that's still out. Cancelled bookings are included so staff can
 * recognise an old confirmation.
 */
export async function getDayView(date: string) {
  return (await sql`
    SELECT
      b.id, b.reference, b.status, b.booker_name, b.organisation_name, b.contact_person, b.contact_phone,
      b.booker_email, b.contact_address, b.destination, b.zone_name, b.amount_due, b.category, b.is_invoiced_org,
      b.pickup_at, b.return_at, b.cancelled_at, b.cancellation_reason,
      b.keys_collected_at, b.odometer_out, b.keys_returned_at, b.odometer_in,
      b.fuel_full, b.bus_cleaned, b.damage_notes, b.damage_photo_url,
      nxt.reference AS replaced_by_reference,
      d.full_name AS driver_name, d.mobile AS driver_mobile,
      d.licence_number, d.licence_state, d.licence_expiry::text AS licence_expiry, d.home_address,
      (b.pickup_at AT TIME ZONE 'Australia/Melbourne')::date = ${date}::date AS is_pickup_day,
      (b.return_at AT TIME ZONE 'Australia/Melbourne')::date = ${date}::date AS is_return_day
    FROM bookings b
    LEFT JOIN booking_drivers d ON d.booking_id = b.id
    LEFT JOIN bookings nxt ON nxt.replaces_booking_id = b.id
    WHERE (b.pickup_at AT TIME ZONE 'Australia/Melbourne')::date = ${date}::date
       OR (b.return_at AT TIME ZONE 'Australia/Melbourne')::date = ${date}::date
       OR (b.status = 'picked_up' AND (b.return_at AT TIME ZONE 'Australia/Melbourne')::date < ${date}::date)
    ORDER BY b.pickup_at ASC
  `) as Row[];
}

/** Returns false if the booking wasn't in a state that allows pickup. */
export async function recordPickup(bookingId: string, data: {
  userId: string; userLabel: string; odometerOut: number; licenceSighted: boolean; keyHandedOver: boolean;
}): Promise<boolean> {
  const rows = (await sql`
    WITH u AS (
      UPDATE bookings SET
        status = 'picked_up', keys_collected_at = NOW(), picked_up_by_user_id = ${data.userId}::uuid,
        odometer_out = ${data.odometerOut}, licence_sighted = ${data.licenceSighted}, key_handed_over = ${data.keyHandedOver},
        manage_token_hash = NULL
      WHERE id = ${bookingId}::uuid AND status = 'confirmed'
      RETURNING id
    ), log AS (
      INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_user_id, actor_label, details)
      SELECT 'booking', id::text, id, 'picked_up', ${data.userId}::uuid, ${data.userLabel},
             jsonb_build_object('odometer_out', ${data.odometerOut}::int, 'licence_sighted', ${data.licenceSighted}::boolean,
                                'key_handed_over', ${data.keyHandedOver}::boolean)
      FROM u
    )
    SELECT id FROM u
  `) as Row[];
  return rows.length > 0;
}

/** Returns "ok", "not_out" (booking isn't picked up) or "odometer" (reading below odometer out). */
export async function recordReturn(bookingId: string, data: {
  userId: string; userLabel: string; odometerIn: number; fuelFull: boolean; busCleaned: boolean;
  damageNotes: string | null; damagePhotoUrl: string | null;
}): Promise<"ok" | "not_out" | "odometer"> {
  const current = (await sql`SELECT status, odometer_out FROM bookings WHERE id = ${bookingId}::uuid`) as Row[];
  if (current[0]?.status !== "picked_up") return "not_out";
  if (current[0].odometer_out !== null && data.odometerIn < Number(current[0].odometer_out)) return "odometer";

  const rows = (await sql`
    WITH u AS (
      UPDATE bookings SET
        status = 'returned', keys_returned_at = NOW(), returned_by_user_id = ${data.userId}::uuid,
        odometer_in = ${data.odometerIn}, fuel_full = ${data.fuelFull}, bus_cleaned = ${data.busCleaned},
        damage_notes = ${data.damageNotes}::text, damage_photo_url = ${data.damagePhotoUrl}::text
      WHERE id = ${bookingId}::uuid AND status = 'picked_up'
      RETURNING id, odometer_out
    ), log AS (
      INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_user_id, actor_label, details)
      SELECT 'booking', id::text, id, 'returned', ${data.userId}::uuid, ${data.userLabel},
             jsonb_build_object('odometer_in', ${data.odometerIn}::int, 'km', ${data.odometerIn}::int - odometer_out,
                                'fuel_full', ${data.fuelFull}::boolean, 'bus_cleaned', ${data.busCleaned}::boolean,
                                'damage_notes', ${data.damageNotes}::text, 'damage_photo_url', ${data.damagePhotoUrl}::text)
      FROM u
    )
    SELECT id FROM u
  `) as Row[];
  return rows.length > 0 ? "ok" : "not_out";
}

// ── Pricing ──────────────────────────────────────────────────

export async function getPricingZones() {
  return (await sql`
    SELECT id, zone_name, examples, rate_per_day, display_order
    FROM pricing_zones
    ORDER BY display_order
  `) as Row[];
}

// Single statements rather than BEGIN/COMMIT: Neon's HTTP driver runs each query in its own
// transaction, so separate statements would not be atomic.
export async function updateZoneRate(zoneId: string, newRate: number, userId: string) {
  await sql`
    WITH h AS (
      INSERT INTO pricing_history (zone_id, old_rate, new_rate, changed_by_user_id)
      SELECT id, rate_per_day, ${newRate}, ${userId}::uuid
      FROM pricing_zones WHERE id = ${zoneId}::uuid
    )
    UPDATE pricing_zones
    SET rate_per_day = ${newRate}, updated_at = NOW(), updated_by_user_id = ${userId}::uuid
    WHERE id = ${zoneId}::uuid
  `;
}

export async function updateAdditionalDayRate(newRate: number) {
  await sql`UPDATE system_settings SET additional_day_rate = ${newRate}, updated_at = NOW()`;
}

// ── Conditions of Use ────────────────────────────────────────

export async function getConditionsHistory() {
  return (await sql`
    SELECT id, version, content, is_current, created_at
    FROM conditions_of_use
    ORDER BY version DESC
  `) as Row[];
}

export async function publishNewConditions(content: string, userId: string): Promise<number> {
  const rows = (await sql`
    WITH off AS (
      UPDATE conditions_of_use SET is_current = FALSE WHERE is_current = TRUE RETURNING version
    )
    INSERT INTO conditions_of_use (version, content, is_current, created_by_user_id)
    SELECT GREATEST(
             COALESCE((SELECT MAX(version) FROM conditions_of_use), 0),
             COALESCE((SELECT MAX(version) FROM off), 0)
           ) + 1,
           ${content}, TRUE, ${userId}::uuid
    RETURNING version
  `) as Row[];
  return Number(rows[0].version);
}

// ── Settings ─────────────────────────────────────────────────

export async function getSystemSettings() {
  const rows = (await sql`SELECT * FROM system_settings LIMIT 1`) as Row[];
  return rows[0] ?? null;
}

export async function updateSystemSettings(data: {
  registeredName?: string;
  registrationNumber?: string;
  abn?: string;
  postalAddress?: string;
  treasurerName?: string;
  treasurerMobile?: string;
  emailFromAddress?: string;
  emailReplyTo?: string;
  selfCancelCutoffHours?: number;
  adminNotifyEmail?: string;
}) {
  await sql`
    UPDATE system_settings SET
      self_cancel_cutoff_hours = COALESCE(${data.selfCancelCutoffHours ?? null}::int, self_cancel_cutoff_hours),
      admin_notify_email  = ${data.adminNotifyEmail ?? null}::text,
      registered_name     = COALESCE(${data.registeredName ?? null}, registered_name),
      registration_number = COALESCE(${data.registrationNumber ?? null}, registration_number),
      abn                 = COALESCE(${data.abn ?? null}, abn),
      postal_address      = COALESCE(${data.postalAddress ?? null}, postal_address),
      treasurer_name      = COALESCE(${data.treasurerName ?? null}, treasurer_name),
      treasurer_mobile    = COALESCE(${data.treasurerMobile ?? null}, treasurer_mobile),
      email_from_address  = COALESCE(${data.emailFromAddress ?? null}, email_from_address),
      email_reply_to      = ${data.emailReplyTo ?? null},
      updated_at          = NOW()
  `;
}

export async function getActiveBankWithHours() {
  const banks = (await sql`
    SELECT id, bank_name, street_address, phone, bsb, account_number
    FROM bank_records WHERE is_active = TRUE LIMIT 1
  `) as Row[];
  if (!banks[0]) return null;
  const bank = banks[0];
  const hours = (await sql`
    SELECT day_of_week, is_open, opening_time, closing_time
    FROM opening_hours WHERE bank_record_id = ${bank.id as string}
    ORDER BY day_of_week
  `) as Row[];
  return { bank, hours };
}

export async function updateBankRecord(bankId: string, data: {
  bankName?: string; streetAddress?: string; phone?: string; bsb?: string; accountNumber?: string;
}) {
  await sql`
    UPDATE bank_records SET
      bank_name      = COALESCE(${data.bankName ?? null}, bank_name),
      street_address = COALESCE(${data.streetAddress ?? null}, street_address),
      phone          = COALESCE(${data.phone ?? null}, phone),
      bsb            = COALESCE(${data.bsb ?? null}, bsb),
      account_number = COALESCE(${data.accountNumber ?? null}, account_number)
    WHERE id = ${bankId}
  `;
}

export async function updateOpeningHour(bankId: string, dayOfWeek: number, isOpen: boolean, openTime: string | null, closeTime: string | null) {
  await sql`
    UPDATE opening_hours
    SET is_open = ${isOpen}, opening_time = ${openTime}, closing_time = ${closeTime}
    WHERE bank_record_id = ${bankId} AND day_of_week = ${dayOfWeek}
  `;
}

// ── Address Book ─────────────────────────────────────────────

export async function getOrganisations() {
  return (await sql`
    SELECT id, name, category, authorised_contact, contact_phone, contact_email,
           invoicing_frequency, has_public_liability, insurer_name, policy_number,
           policy_expiry_date, notes, created_at
    FROM organisations
    ORDER BY name
  `) as Row[];
}

export async function upsertOrganisation(data: {
  id?: string;
  name: string;
  category: string;
  authorisedContact: string;
  contactPhone: string;
  contactEmail: string;
  invoicingFrequency?: string | null;
  hasPublicLiability: boolean;
  insurerName?: string | null;
  policyNumber?: string | null;
  policyExpiryDate?: string | null;
  notes?: string | null;
}) {
  if (data.id) {
    await sql`
      UPDATE organisations SET
        name                = ${data.name},
        category            = ${data.category}::booking_category,
        authorised_contact  = ${data.authorisedContact},
        contact_phone       = ${data.contactPhone},
        contact_email       = ${data.contactEmail},
        invoicing_frequency = ${data.invoicingFrequency ?? null}::invoicing_frequency,
        has_public_liability = ${data.hasPublicLiability},
        insurer_name        = ${data.insurerName ?? null},
        policy_number       = ${data.policyNumber ?? null},
        policy_expiry_date  = ${data.policyExpiryDate ?? null},
        notes               = ${data.notes ?? null},
        updated_at          = NOW()
      WHERE id = ${data.id}
    `;
  } else {
    await sql`
      INSERT INTO organisations (
        name, category, authorised_contact, contact_phone, contact_email,
        invoicing_frequency, has_public_liability, insurer_name, policy_number,
        policy_expiry_date, notes
      ) VALUES (
        ${data.name}, ${data.category}::booking_category, ${data.authorisedContact},
        ${data.contactPhone}, ${data.contactEmail},
        ${data.invoicingFrequency ?? null}::invoicing_frequency,
        ${data.hasPublicLiability},
        ${data.insurerName ?? null}, ${data.policyNumber ?? null},
        ${data.policyExpiryDate ?? null}, ${data.notes ?? null}
      )
    `;
  }
}

export async function deleteOrganisation(id: string) {
  await sql`DELETE FROM organisations WHERE id = ${id}`;
}

// ── Login Management ─────────────────────────────────────────

export async function getStaffUsers() {
  return (await sql`
    SELECT id, neon_auth_user_id, display_name, email, role, is_active, last_login_at, created_at
    FROM users
    ORDER BY role, display_name
  `) as Row[];
}

export async function getStaffUserById(userId: string) {
  const rows = (await sql`
    SELECT id, neon_auth_user_id, display_name, email, role
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `) as Row[];
  return rows[0] ?? null;
}

export async function createStaffUser(data: {
  neonAuthUserId: string | null;
  displayName: string;
  email: string;
  role: string;
}) {
  await sql`
    INSERT INTO users (neon_auth_user_id, display_name, email, role)
    VALUES (${data.neonAuthUserId}, ${data.displayName}, ${data.email}, ${data.role}::user_role)
  `;
}

export async function setUserActive(userId: string, isActive: boolean) {
  await sql`UPDATE users SET is_active = ${isActive} WHERE id = ${userId}`;
}

export async function updateStaffUser(userId: string, data: {
  displayName?: string;
  email?: string;
  role?: string;
}) {
  await sql`
    UPDATE users SET
      display_name = COALESCE(${data.displayName ?? null}, display_name),
      email        = COALESCE(${data.email ?? null}, email),
      role         = COALESCE(${data.role ?? null}::user_role, role)
    WHERE id = ${userId}
  `;
}
