-- ============================================================
-- Migration 001 — Alpine Community Bus v2
--
-- Applies to a database created from the ORIGINAL db/schema.sql.
-- Fresh databases get all of this from db/schema.sql directly.
--
--   npm run db:migrate -- db/migrations/001_v2_booking_overhaul.sql
--
-- Run it on a Neon branch first. It runs in a single transaction,
-- so if any step fails nothing is changed.
--
-- The exclusion constraint (step 5) fails if two existing active bookings
-- already overlap. To find them before migrating:
--
--   SELECT a.reference, b.reference, a.start_date, a.end_date, b.start_date, b.end_date
--   FROM bookings a JOIN bookings b ON a.id < b.id
--   WHERE a.status IN ('confirmed','in_use') AND b.status IN ('confirmed','in_use')
--     AND daterange(a.start_date, a.end_date, '[]') && daterange(b.start_date, b.end_date, '[]');
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── 1. Booking status: confirmed → picked_up → returned (or cancelled) ──

ALTER TABLE bookings ALTER COLUMN status DROP DEFAULT;
DROP INDEX IF EXISTS idx_bookings_status;

CREATE TYPE booking_status_v2 AS ENUM ('confirmed', 'picked_up', 'returned', 'cancelled');

ALTER TABLE bookings
  ALTER COLUMN status TYPE booking_status_v2
  USING (CASE status::text
           WHEN 'in_use'             THEN 'picked_up'
           WHEN 'pending_inspection' THEN 'returned'
           WHEN 'complete'           THEN 'returned'
           ELSE status::text
         END)::booking_status_v2;

DROP TYPE booking_status;
ALTER TYPE booking_status_v2 RENAME TO booking_status;

ALTER TABLE bookings ALTER COLUMN status SET DEFAULT 'confirmed';
CREATE INDEX idx_bookings_status ON bookings(status);

-- ── 2. New booking columns ───────────────────────────────────

ALTER TABLE bookings
  -- Booker / contact
  ADD COLUMN organisation_name        TEXT,           -- as typed by the booker; NULL = individual
  ADD COLUMN contact_address          TEXT,
  -- Hire period in UTC (start_date/end_date/pickup_time/dropoff_time stay as Melbourne-local copies)
  ADD COLUMN pickup_at                TIMESTAMPTZ,
  ADD COLUMN return_at                TIMESTAMPTZ,
  -- Self-service manage link (SHA-256 of the token; the token itself is never stored)
  ADD COLUMN manage_token_hash        TEXT UNIQUE,
  -- Date changes cancel the old booking and create a new one pointing back at it
  ADD COLUMN replaces_booking_id      UUID REFERENCES bookings(id),
  ADD COLUMN cancellation_reason      TEXT,
  -- Pickup (counter)
  ADD COLUMN licence_sighted          BOOLEAN,
  ADD COLUMN key_handed_over          BOOLEAN,
  ADD COLUMN odometer_out             INT CHECK (odometer_out >= 0),
  ADD COLUMN picked_up_by_user_id     UUID REFERENCES users(id),
  -- Return (counter)
  ADD COLUMN odometer_in              INT CHECK (odometer_in >= 0),
  ADD COLUMN fuel_full                BOOLEAN,
  ADD COLUMN bus_cleaned              BOOLEAN,
  ADD COLUMN damage_notes             TEXT,
  ADD COLUMN damage_photo_url         TEXT,
  ADD COLUMN returned_by_user_id      UUID REFERENCES users(id);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_odometer_order CHECK (odometer_in IS NULL OR odometer_out IS NULL OR odometer_in >= odometer_out);

-- Backfill UTC hire period from the Melbourne-local dates/times
UPDATE bookings SET
  pickup_at = (start_date + pickup_time)  AT TIME ZONE 'Australia/Melbourne',
  return_at = (end_date   + dropoff_time) AT TIME ZONE 'Australia/Melbourne';

-- Old rows may have a return time before the pickup time on a same-day hire;
-- treat those as ending at the end of that day so the range is valid.
UPDATE bookings
  SET return_at = ((end_date + 1)::timestamp) AT TIME ZONE 'Australia/Melbourne'
  WHERE return_at <= pickup_at;

ALTER TABLE bookings
  ALTER COLUMN pickup_at SET NOT NULL,
  ALTER COLUMN return_at SET NOT NULL,
  ADD CONSTRAINT bookings_period_valid CHECK (return_at > pickup_at);

CREATE INDEX idx_bookings_pickup_at ON bookings(pickup_at);
CREATE INDEX idx_bookings_return_at ON bookings(return_at);

-- ── 3. Driver licence state ──────────────────────────────────

ALTER TABLE booking_drivers
  ADD COLUMN licence_state TEXT
    CHECK (licence_state IN ('VIC','ACT','NSW','NT','QLD','SA','TAS','WA','NZ'));

-- ── 4. Settings ──────────────────────────────────────────────

ALTER TABLE system_settings
  ADD COLUMN self_cancel_cutoff_hours INT  NOT NULL DEFAULT 0 CHECK (self_cancel_cutoff_hours >= 0),
  ADD COLUMN admin_notify_email       TEXT;

ALTER TABLE system_settings
  ALTER COLUMN email_from_address SET DEFAULT 'noreply@alpinecommunitybus.com.au';

UPDATE system_settings
  SET email_from_address = 'noreply@alpinecommunitybus.com.au'
  WHERE email_from_address = 'noreply@myrtlefordcommunitybus.com.au';

-- ── 5. Double-booking prevention ─────────────────────────────
-- One bus: no two active bookings may overlap in time.
-- DEFERRABLE so a date change can cancel the old row and insert the new one
-- in a single statement, even when the new dates overlap the old ones.

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (tstzrange(pickup_at, return_at, '[)') WITH &&)
  WHERE (status IN ('confirmed', 'picked_up'))
  DEFERRABLE INITIALLY IMMEDIATE;

-- ── 6. Audit log ─────────────────────────────────────────────

CREATE TABLE audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type     TEXT        NOT NULL,          -- booking, pricing_zone, conditions, organisation, user, settings, bank, opening_hours
  entity_id       TEXT,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL,          -- created, cancelled, dates_changed, picked_up, returned, updated, ...
  actor_user_id   UUID        REFERENCES users(id),
  actor_label     TEXT        NOT NULL,          -- staff display name, or 'Customer' / 'System'
  details         JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_booking    ON audit_log(booking_id, created_at DESC);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- ── 7. Email log (fed by the Resend webhook) ─────────────────

CREATE TABLE email_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  kind             TEXT        NOT NULL,         -- booking_confirmation, booking_cancelled, admin_cancel_notice, staff_invite
  to_address       TEXT        NOT NULL,
  subject          TEXT        NOT NULL,
  resend_email_id  TEXT        UNIQUE,
  status           TEXT        NOT NULL DEFAULT 'sent',  -- sent, delivered, delivery_delayed, bounced, complained, failed
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_booking ON email_log(booking_id);
CREATE INDEX idx_email_log_problem ON email_log(created_at DESC) WHERE status IN ('bounced', 'complained', 'failed');

-- ── 8. Rate limiting (fixed-window counters) ─────────────────

CREATE TABLE rate_limits (
  key           TEXT        NOT NULL,
  window_start  TIMESTAMPTZ NOT NULL,
  count         INT         NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

COMMIT;
