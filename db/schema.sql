-- ============================================================
-- Myrtleford Lions Club — Community Bus Booking Portal
-- Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('admin', 'lions_staff', 'bus_coordinator', 'waw_staff');
CREATE TYPE booking_category AS ENUM ('a', 'c');
CREATE TYPE booking_status AS ENUM ('confirmed', 'in_use', 'pending_inspection', 'complete', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'eft');
CREATE TYPE flag_type AS ENUM ('empty_tank', 'late_return', 'returned_dirty', 'damage', 'other');
CREATE TYPE invoicing_frequency AS ENUM ('monthly', 'quarterly');
CREATE TYPE invoice_type AS ENUM ('individual_tax', 'organisation');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid');
CREATE TYPE qr_submission_type AS ENUM ('pre_trip', 'post_trip');
CREATE TYPE asset_status AS ENUM ('active', 'retired', 'disposed');
CREATE TYPE acquisition_method AS ENUM ('transfer', 'purchase', 'donation');
CREATE TYPE maintenance_work_type AS ENUM ('service', 'repair', 'tyre', 'cleaning', 'other');
CREATE TYPE fuel_level AS ENUM ('full', 'three_quarter', 'half', 'below_half');
CREATE TYPE cleanliness AS ENUM ('good', 'acceptable', 'dirty');
CREATE TYPE exterior_condition AS ENUM ('no_issues', 'minor_marks', 'damage_found');
CREATE TYPE logbook_status AS ENUM ('yes', 'no', 'incomplete');

CREATE TYPE notification_event AS ENUM (
  'booking_confirmed',
  'keys_collected',
  'qr_pre_trip_submitted',
  'qr_post_trip_submitted',
  'incident_reported',
  'keys_returned',
  'inspection_submitted',
  'flag_added',
  'invoice_generated',
  'public_liability_expiring'
);

-- ── Users ────────────────────────────────────────────────────
-- App-level metadata. Neon Auth / Stack Auth handles credentials.
-- neon_auth_user_id links to neon_auth.users_sync.id

CREATE TABLE users (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  neon_auth_user_id   TEXT        UNIQUE,
  display_name        TEXT        NOT NULL,
  email               TEXT        NOT NULL UNIQUE,
  role                user_role   NOT NULL,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Organisations (address book) ─────────────────────────────

CREATE TABLE organisations (
  id                    UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT                 NOT NULL,
  category              booking_category     NOT NULL,
  authorised_contact    TEXT                 NOT NULL,
  contact_phone         TEXT                 NOT NULL,
  contact_email         TEXT                 NOT NULL,
  invoicing_frequency   invoicing_frequency,            -- Cat A only; NULL for Cat C
  has_public_liability  BOOLEAN              NOT NULL DEFAULT FALSE,
  insurer_name          TEXT,
  policy_number         TEXT,
  policy_expiry_date    DATE,
  certificate_url       TEXT,                           -- Vercel Blob URL
  notes                 TEXT,
  created_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

-- ── Conditions of Use (versioned) ────────────────────────────

CREATE TABLE conditions_of_use (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  version             INT         NOT NULL,
  content             TEXT        NOT NULL,
  is_current          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by_user_id  UUID        REFERENCES users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one version can be current
CREATE UNIQUE INDEX idx_conditions_current ON conditions_of_use (is_current) WHERE is_current = TRUE;

-- ── Pricing zones ────────────────────────────────────────────

CREATE TABLE pricing_zones (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_name           TEXT           NOT NULL,
  examples            TEXT,
  rate_per_day        NUMERIC(10,2)  NOT NULL,
  display_order       INT            NOT NULL,
  updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_by_user_id  UUID           REFERENCES users(id)
);

CREATE TABLE pricing_history (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id               UUID           NOT NULL REFERENCES pricing_zones(id),
  old_rate              NUMERIC(10,2)  NOT NULL,
  new_rate              NUMERIC(10,2)  NOT NULL,
  changed_by_user_id    UUID           REFERENCES users(id),
  changed_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Bookings ─────────────────────────────────────────────────

CREATE TABLE bookings (
  id                          UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  reference                   TEXT              NOT NULL UNIQUE,  -- BK-YYYY-NNN
  organisation_id             UUID              REFERENCES organisations(id),
  booker_name                 TEXT              NOT NULL,
  contact_person              TEXT              NOT NULL,
  contact_phone               TEXT              NOT NULL,
  booker_email                TEXT              NOT NULL,
  category                    booking_category  NOT NULL,
  is_invoiced_org             BOOLEAN           NOT NULL DEFAULT FALSE,
  status                      booking_status    NOT NULL DEFAULT 'confirmed',
  zone_id                     UUID              REFERENCES pricing_zones(id),
  zone_name                   TEXT              NOT NULL,          -- snapshot
  rate_per_day                NUMERIC(10,2)     NOT NULL,          -- snapshot at confirmation
  additional_day_rate         NUMERIC(10,2)     NOT NULL,          -- snapshot at confirmation
  start_date                  DATE              NOT NULL,
  end_date                    DATE              NOT NULL,
  pickup_time                 TIME              NOT NULL,
  dropoff_time                TIME              NOT NULL,
  destination                 TEXT              NOT NULL,
  purpose                     TEXT,
  passenger_count             INT               CHECK (passenger_count BETWEEN 1 AND 12),
  amount_due                  NUMERIC(10,2)     NOT NULL,
  conditions_version_id       UUID              REFERENCES conditions_of_use(id),
  conditions_accepted_at      TIMESTAMPTZ       NOT NULL,
  payment_method              payment_method,
  paid_at                     TIMESTAMPTZ,
  paid_recorded_by_user_id    UUID              REFERENCES users(id),
  keys_collected_at           TIMESTAMPTZ,
  keys_returned_at            TIMESTAMPTZ,
  cancelled_at                TIMESTAMPTZ,
  cancelled_by_user_id        UUID              REFERENCES users(id),
  created_at                  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_bookings_start_date   ON bookings(start_date);
CREATE INDEX idx_bookings_end_date     ON bookings(end_date);
CREATE INDEX idx_bookings_org          ON bookings(organisation_id);
CREATE INDEX idx_bookings_email        ON bookings(booker_email);

CREATE TABLE booking_drivers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  full_name       TEXT        NOT NULL,
  mobile          TEXT        NOT NULL,
  licence_number  TEXT        NOT NULL,
  licence_expiry  DATE        NOT NULL,
  home_address    TEXT        NOT NULL,
  age_confirmed   BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ── Booker flags ─────────────────────────────────────────────

CREATE TABLE booker_flags (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID        REFERENCES organisations(id),
  booker_name           TEXT,                           -- for individuals not in address book
  booker_email          TEXT,
  flag_type             flag_type   NOT NULL,
  notes                 TEXT,
  booking_id            UUID        REFERENCES bookings(id),
  created_by_user_id    UUID        REFERENCES users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booker_flags_org    ON booker_flags(organisation_id);
CREATE INDEX idx_booker_flags_email  ON booker_flags(booker_email);

-- ── QR submissions ───────────────────────────────────────────

CREATE TABLE qr_submissions (
  id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID                 NOT NULL REFERENCES bookings(id),
  submission_type  qr_submission_type   NOT NULL,
  fuel_photo_url   TEXT,
  odometer_photo_url TEXT,
  submitted_at     TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, submission_type)
);

CREATE INDEX idx_qr_submissions_booking ON qr_submissions(booking_id);

CREATE TABLE incidents (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id         UUID        NOT NULL REFERENCES bookings(id),
  qr_submission_id   UUID        REFERENCES qr_submissions(id),
  description        TEXT        NOT NULL,
  location           TEXT,
  photo_urls         TEXT[]      NOT NULL DEFAULT '{}',
  reported_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Return inspections ───────────────────────────────────────

CREATE TABLE return_inspections (
  id                      UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              UUID                NOT NULL UNIQUE REFERENCES bookings(id),
  odometer_reading        INT                 NOT NULL,
  fuel_level              fuel_level          NOT NULL,
  tank_full_on_return     BOOLEAN             NOT NULL,
  interior_cleanliness    cleanliness         NOT NULL,
  exterior_condition      exterior_condition  NOT NULL,
  damage_description      TEXT,
  damage_photo_urls       TEXT[]              NOT NULL DEFAULT '{}',
  logbook_completed       logbook_status      NOT NULL,
  other_issues            TEXT,
  inspector_name          TEXT                NOT NULL,
  submitted_by_user_id    UUID                REFERENCES users(id),
  submitted_at            TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- ── Assets (vehicle register) ────────────────────────────────

CREATE TABLE assets (
  id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_display_id          TEXT                NOT NULL UNIQUE,
  make                      TEXT                NOT NULL,
  model                     TEXT                NOT NULL,
  year                      INT                 NOT NULL,
  body_type                 TEXT,
  colour                    TEXT,
  seating_capacity          INT                 NOT NULL,
  vin                       TEXT,
  engine_number             TEXT,
  registration_number       TEXT,
  registration_expiry       DATE,
  registration_state        TEXT                NOT NULL DEFAULT 'VIC',
  registered_operator       TEXT,
  tac_due_date              DATE,
  insurer_name              TEXT,
  insurance_policy_number   TEXT,
  insurance_policy_expiry   DATE,
  coverage_type             TEXT,
  annual_premium            NUMERIC(10,2),
  date_acquired             DATE,
  acquired_from             TEXT,
  acquisition_method        acquisition_method,
  purchase_price            NUMERIC(10,2),
  current_estimated_value   NUMERIC(10,2),
  status                    asset_status        NOT NULL DEFAULT 'active',
  date_retired              DATE,
  retirement_reason         TEXT,
  notes                     TEXT,
  created_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE TABLE maintenance_logs (
  id                      UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id                UUID                    NOT NULL REFERENCES assets(id),
  maintenance_date        DATE                    NOT NULL,
  odometer_reading        INT                     NOT NULL,
  work_type               maintenance_work_type   NOT NULL,
  description             TEXT                    NOT NULL,
  provider                TEXT                    NOT NULL,
  cost                    NUMERIC(10,2),
  next_service_date       DATE,
  next_service_odometer   INT,
  entered_by_name         TEXT                    NOT NULL,
  entered_by_user_id      UUID                    REFERENCES users(id),
  created_at              TIMESTAMPTZ             NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_logs_asset ON maintenance_logs(asset_id);

-- ── Invoices ─────────────────────────────────────────────────

CREATE SEQUENCE individual_invoice_seq START 1;
CREATE SEQUENCE org_invoice_seq START 1;

CREATE TABLE invoices (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_type          invoice_type    NOT NULL,
  invoice_number        TEXT            NOT NULL UNIQUE,
  invoice_date          DATE            NOT NULL,
  organisation_id       UUID            REFERENCES organisations(id),
  booking_id            UUID            REFERENCES bookings(id),
  period_start          DATE,
  period_end            DATE,
  total_amount          NUMERIC(10,2)   NOT NULL,
  status                invoice_status  NOT NULL DEFAULT 'draft',
  sent_at               TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  created_by_user_id    UUID            REFERENCES users(id),
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE TABLE invoice_line_items (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID           NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  booking_id        UUID           NOT NULL REFERENCES bookings(id),
  booking_reference TEXT           NOT NULL,
  booking_dates     TEXT           NOT NULL,
  destination       TEXT           NOT NULL,
  days              INT            NOT NULL,
  rate_per_day      NUMERIC(10,2)  NOT NULL,
  line_total        NUMERIC(10,2)  NOT NULL
);

-- ── Notifications ────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID                NOT NULL REFERENCES users(id),
  event_type  notification_event  NOT NULL,
  message     TEXT                NOT NULL,
  booking_id  UUID                REFERENCES bookings(id),
  is_read     BOOLEAN             NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user     ON notifications(user_id);
CREATE INDEX idx_notifications_unread   ON notifications(user_id, is_read) WHERE is_read = FALSE;

CREATE TABLE notification_preferences (
  id               UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID                NOT NULL REFERENCES users(id),
  event_type       notification_event  NOT NULL,
  email_enabled    BOOLEAN             NOT NULL DEFAULT TRUE,
  in_app_enabled   BOOLEAN             NOT NULL DEFAULT TRUE,
  UNIQUE (user_id, event_type)
);

-- ── Bank records & opening hours ─────────────────────────────

CREATE TABLE bank_records (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name       TEXT        NOT NULL,
  street_address  TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  bsb             TEXT        NOT NULL,
  account_number  TEXT        NOT NULL,
  is_active       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one bank record can be active
CREATE UNIQUE INDEX idx_bank_active ON bank_records (is_active) WHERE is_active = TRUE;

CREATE TABLE opening_hours (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_record_id  UUID    NOT NULL REFERENCES bank_records(id) ON DELETE CASCADE,
  day_of_week     INT     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon 6=Sun
  is_open         BOOLEAN NOT NULL DEFAULT TRUE,
  opening_time    TIME,
  closing_time    TIME,
  UNIQUE (bank_record_id, day_of_week)
);

-- ── System settings (singleton) ──────────────────────────────

CREATE TABLE system_settings (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_name       TEXT,
  registration_number   TEXT,
  abn                   TEXT,
  postal_address        TEXT,
  treasurer_name        TEXT,
  treasurer_mobile      TEXT,
  email_from_address    TEXT           NOT NULL DEFAULT 'noreply@myrtlefordcommunitybus.com.au',
  email_reply_to        TEXT,
  additional_day_rate   NUMERIC(10,2)  NOT NULL DEFAULT 68.00,
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── Seed data ────────────────────────────────────────────────

INSERT INTO pricing_zones (zone_name, examples, rate_per_day, display_order) VALUES
  ('Local Area',         'Albury-Wodonga, Wangaratta, Yarrawonga, Benalla-Euroa',        68.00, 1),
  ('Shepparton / Mansfield', NULL,                                                        88.00, 2),
  ('Bendigo / Echuca',   NULL,                                                           108.00, 3),
  ('Melbourne',          'CBD, MCG, Marvel Stadium, Airport',                            149.00, 4),
  ('Melbourne Outer',    'SE Suburbs, Frankston, Geelong',                               216.00, 5),
  ('Far Destinations',   'Mornington Peninsula, Surf Coast, Philip Island, Canberra',    311.00, 6);

INSERT INTO system_settings (email_from_address, additional_day_rate)
  VALUES ('noreply@myrtlefordcommunitybus.com.au', 68.00);

INSERT INTO bank_records (bank_name, street_address, phone, bsb, account_number, is_active)
  VALUES ('WAW Credit Union', '27 Clyde St, Myrtleford VIC 3737', '', '', '', TRUE);

INSERT INTO opening_hours (bank_record_id, day_of_week, is_open, opening_time, closing_time)
  SELECT id, 0, TRUE,  '09:00', '17:00' FROM bank_records WHERE is_active = TRUE UNION ALL
  SELECT id, 1, TRUE,  '09:00', '17:00' FROM bank_records WHERE is_active = TRUE UNION ALL
  SELECT id, 2, TRUE,  '09:00', '17:00' FROM bank_records WHERE is_active = TRUE UNION ALL
  SELECT id, 3, TRUE,  '09:00', '17:00' FROM bank_records WHERE is_active = TRUE UNION ALL
  SELECT id, 4, TRUE,  '09:00', '17:00' FROM bank_records WHERE is_active = TRUE UNION ALL
  SELECT id, 5, TRUE,  '09:00', '12:00' FROM bank_records WHERE is_active = TRUE UNION ALL
  SELECT id, 6, FALSE, NULL,    NULL     FROM bank_records WHERE is_active = TRUE;

INSERT INTO conditions_of_use (version, content, is_current) VALUES (1,
'1. For community use only — not for commercial or profit-making purposes.
2. Maximum 12 passengers including the driver at all times.
3. Driver must be 21 years of age or older.
4. A standard Victorian car licence is sufficient for this vehicle.
5. No smoking — prohibited by law in all vehicles.
6. No alcohol — strictly prohibited on board at any time.
7. Seatbelts must be worn by all passengers at all times when the vehicle is in motion.
8. The hirer is responsible for the conduct and behaviour of all passengers during the hire period.
9. The bus must be returned with a full tank of fuel.
10. If fuel is below full on return, the cost of refuelling plus a surcharge will be charged to the hirer.
11. The bus must be returned in a clean condition — a $100 cleaning fee applies if returned dirty.
12. Late returns are charged at $68 per 24-hour period or part thereof beyond the agreed drop-off time.
13. The hirer must submit fuel gauge and odometer photos via the QR code before departure and again on return.
14. Any accident or incident during the hire period must be reported immediately via the QR incident report.
15. The hirer accepts liability for any damage caused to the vehicle during the hire period.
16. To change booking dates, the existing booking must be cancelled and a new booking made.
17. Late cancellations and policy breaches are recorded against the hirer''s booking history.
18. Lions Club of Myrtleford reserves the right to refuse future bookings based on hire history.',
TRUE);
