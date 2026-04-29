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
      COUNT(*) FILTER (WHERE status = 'pending_inspection')                        AS pending_inspections,
      COUNT(*) FILTER (WHERE status = 'in_use')                                   AS currently_in_use,
      COUNT(*) FILTER (WHERE status = 'confirmed')                                AS confirmed
    FROM bookings
    WHERE status != 'cancelled'
  `) as Row[];
  const r = rows[0];
  return {
    totalBookings:      Number(r.total_bookings),
    bookingsThisMonth:  Number(r.bookings_this_month),
    revenueThisMonth:   Number(r.revenue_this_month),
    pendingInspections: Number(r.pending_inspections),
    currentlyInUse:     Number(r.currently_in_use),
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
      AND (${status ?? null} IS NULL OR b.status::text = ${status ?? null})
      AND (${category ?? null} IS NULL OR b.category::text = ${category ?? null})
      AND (${search ?? null} IS NULL OR (
            b.booker_name ILIKE ${'%' + (search ?? '') + '%'}
         OR b.reference   ILIKE ${'%' + (search ?? '') + '%'}
         OR b.booker_email ILIKE ${'%' + (search ?? '') + '%'}
      ))
      AND (${dateFrom ?? null} IS NULL OR b.start_date >= ${dateFrom ?? null}::date)
      AND (${dateTo ?? null} IS NULL OR b.start_date <= ${dateTo ?? null}::date)
    ORDER BY b.created_at DESC
    LIMIT 200
  `) as Row[];
}

export async function cancelBooking(bookingId: string, cancelledByUserId: string) {
  await sql`
    UPDATE bookings
    SET status = 'cancelled', cancelled_at = NOW(), cancelled_by_user_id = ${cancelledByUserId}
    WHERE id = ${bookingId} AND status NOT IN ('cancelled', 'complete')
  `;
}

// ── Pricing ──────────────────────────────────────────────────

export async function getPricingZones() {
  return (await sql`
    SELECT id, zone_name, examples, rate_per_day, display_order
    FROM pricing_zones
    ORDER BY display_order
  `) as Row[];
}

export async function updateZoneRate(zoneId: string, newRate: number, userId: string) {
  await sql`BEGIN`;
  try {
    await sql`
      INSERT INTO pricing_history (zone_id, old_rate, new_rate, changed_by_user_id)
      SELECT id, rate_per_day, ${newRate}, ${userId}
      FROM pricing_zones WHERE id = ${zoneId}
    `;
    await sql`
      UPDATE pricing_zones
      SET rate_per_day = ${newRate}, updated_at = NOW(), updated_by_user_id = ${userId}
      WHERE id = ${zoneId}
    `;
    await sql`COMMIT`;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
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

export async function publishNewConditions(content: string, userId: string) {
  await sql`BEGIN`;
  try {
    await sql`UPDATE conditions_of_use SET is_current = FALSE WHERE is_current = TRUE`;
    const rows = (await sql`
      SELECT COALESCE(MAX(version), 0) + 1 AS next FROM conditions_of_use
    `) as Row[];
    const nextVersion = Number(rows[0].next);
    await sql`
      INSERT INTO conditions_of_use (version, content, is_current, created_by_user_id)
      VALUES (${nextVersion}, ${content}, TRUE, ${userId})
    `;
    await sql`COMMIT`;
  } catch (e) {
    await sql`ROLLBACK`;
    throw e;
  }
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
}) {
  await sql`
    UPDATE system_settings SET
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
