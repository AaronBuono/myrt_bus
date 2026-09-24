-- ============================================================
-- Test data for a STAGING database (a Neon branch), never production.
--
--   npm run db:seed
--
-- Dates are relative to today (Melbourne), so the data stays useful.
-- Re-running replaces the previous seed rows (references ACB-TST…, orgs with notes = 'seed').
-- Refuses to run if the database has any bookings that aren't seed rows.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM bookings WHERE reference NOT LIKE 'ACB-TST%') THEN
    RAISE EXCEPTION 'Refusing to seed: this database has real bookings. Run the seed on a staging branch.';
  END IF;
END $$;

-- ── Clear previous seed rows ─────────────────────────────────

DELETE FROM audit_log       WHERE booking_id IN (SELECT id FROM bookings WHERE reference LIKE 'ACB-TST%');
DELETE FROM email_log       WHERE booking_id IN (SELECT id FROM bookings WHERE reference LIKE 'ACB-TST%');
DELETE FROM booking_drivers WHERE booking_id IN (SELECT id FROM bookings WHERE reference LIKE 'ACB-TST%');
UPDATE bookings SET replaces_booking_id = NULL WHERE reference LIKE 'ACB-TST%';
DELETE FROM bookings        WHERE reference LIKE 'ACB-TST%';
DELETE FROM organisations   WHERE notes = 'seed';

-- ── Organisations ────────────────────────────────────────────

INSERT INTO organisations (name, category, authorised_contact, contact_phone, contact_email, invoicing_frequency, has_public_liability, notes) VALUES
  ('Lions Club of Myrtleford',        'c', 'Graham Wilson',   '+61400111222', 'lions@example.com',     NULL,        TRUE,  'seed'),
  ('Myrtleford RSL',                  'c', 'Pat O''Connor',   '+61400222333', 'rsl@example.com',       NULL,        TRUE,  'seed'),
  ('Legacy Albury Wodonga',           'c', 'Helen Nguyen',    '+61400333444', 'legacy@example.com',    NULL,        TRUE,  'seed'),
  ('Myrtleford Senior Citizens',      'a', 'Margaret Brown',  '+61412345678', 'seniors@example.com',   NULL,        FALSE, 'seed'),
  ('Bright P-12 College',             'a', 'Sam Patel',       '+61423456789', 'school@example.com',    'monthly',   TRUE,  'seed'),
  ('Alpine Men''s Shed',              'a', 'Doug Harris',     '+61434567890', 'shed@example.com',      NULL,        FALSE, 'seed');

-- ── Bookings ─────────────────────────────────────────────────

CREATE TEMP TABLE seed_b (
  ref text, org text, contact text, phone text, email text, address text, zone text,
  start_off int, pickup time, end_off int, ret time, dest text, status booking_status,
  driver text, driver_phone text, lic text, lic_state text
) ON COMMIT DROP;

INSERT INTO seed_b VALUES
  -- Past, returned
  ('ACB-TSTA2', 'Myrtleford Senior Citizens', 'Margaret Brown', '+61412345678', 'margaret@example.com', '12 Standish St, Myrtleford VIC 3737', 'Local Area',          -20, '09:00', -20, '17:00', 'Wangaratta Performing Arts Centre', 'returned', 'Margaret Brown', '+61412345678', '045123987', 'VIC'),
  ('ACB-TSTA3', NULL,                         'Tom Rossi',      '+61455000111', 'tom@example.com',      '4 Hawthorn Ln, Porepunkah VIC 3740', 'Melbourne',          -12, '07:30', -11, '19:00', 'MCG',                                'returned', 'Tom Rossi',      '+61455000111', 'NSW8841234', 'NSW'),
  ('ACB-TSTA4', 'Alpine Men''s Shed',         'Doug Harris',    '+61434567890', 'doug@example.com',     '88 Great Alpine Rd, Bright VIC 3741', 'Shepparton / Mansfield', -5, '08:00', -5, '18:00', 'Mansfield',                          'returned', 'Kevin Lee',      '+61466777888', 'AB123456', 'NZ'),
  -- Out now
  ('ACB-TSTA5', 'Bright P-12 College',        'Sam Patel',      '+61423456789', 'sam@example.com',      '1 Ireland St, Bright VIC 3741', 'Bendigo / Echuca',          -1, '09:00',   1, '17:00', 'Echuca',                             'picked_up', 'Sam Patel',     '+61423456789', '099887766', 'VIC'),
  -- Upcoming, confirmed
  ('ACB-TSTA6', NULL,                         'Priya Shah',     '+61477123456', 'priya@example.com',    '23 Clyde St, Myrtleford VIC 3737', 'Local Area',              3, '10:00',   3, '15:00', 'Beechworth',                         'confirmed', 'Priya Shah',     '+61477123456', '033445566', 'VIC'),
  ('ACB-TSTA7', 'Myrtleford Senior Citizens', 'Margaret Brown', '+61412345678', 'margaret@example.com', '12 Standish St, Myrtleford VIC 3737', 'Melbourne',           6, '07:00',   7, '20:00', 'Melbourne Airport',                  'confirmed', 'Bill Brown',     '+61412999000', '012398745', 'VIC'),
  ('ACB-TSTA8', 'Lions Club of Myrtleford',   'Graham Wilson',  '+61400111222', 'graham@example.com',   '5 Elgin St, Myrtleford VIC 3737', 'Far Destinations',        13, '06:30',  15, '18:00', 'Phillip Island',                     'confirmed', 'Graham Wilson',  '+61400111222', 'QLD7766554', 'QLD'),
  ('ACB-TSTA9', 'Myrtleford RSL',             'Pat O''Connor',  '+61400222333', 'pat@example.com',      '9 Duke St, Myrtleford VIC 3737', 'Local Area',               18, '09:30',  18, '16:30', 'Albury',                             'confirmed', 'Pat O''Connor',  '+61400222333', '076543210', 'VIC'),
  -- Cancelled by the customer
  ('ACB-TSTB2', NULL,                         'Jess Taylor',    '+61488222333', 'jess@example.com',     '17 Lewis Ave, Myrtleford VIC 3737', 'Local Area',             3, '09:00',   3, '12:00', 'Wangaratta',                         'cancelled', 'Jess Taylor',    '+61488222333', 'SA4455667', 'SA'),
  -- Dates changed: B3 was replaced by B4
  ('ACB-TSTB3', 'Alpine Men''s Shed',         'Doug Harris',    '+61434567890', 'doug@example.com',     '88 Great Alpine Rd, Bright VIC 3741', 'Local Area',          21, '09:00',  21, '17:00', 'Yarrawonga',                         'cancelled', 'Doug Harris',    '+61434567890', '055667788', 'VIC'),
  ('ACB-TSTB4', 'Alpine Men''s Shed',         'Doug Harris',    '+61434567890', 'doug@example.com',     '88 Great Alpine Rd, Bright VIC 3741', 'Local Area',          25, '09:00',  25, '17:00', 'Yarrawonga',                         'confirmed', 'Doug Harris',    '+61434567890', '055667788', 'VIC');

DO $$
DECLARE
  today date := (NOW() AT TIME ZONE 'Australia/Melbourne')::date;
  oct1 date;
  dst_sunday date;
  r record;
  z record;
  o record;
  cond uuid := (SELECT id FROM conditions_of_use WHERE is_current LIMIT 1);
  days int;
  b_id uuid;
  p_at timestamptz;
  r_at timestamptz;
BEGIN
  -- Add a booking spanning the next daylight-saving start (first Sunday of October, 2am → 3am):
  -- Saturday 10:00 AEST to Monday 10:00 AEDT is 47 hours, not 48.
  oct1 := make_date(EXTRACT(year FROM today)::int, 10, 1);
  IF oct1 + 8 <= today THEN oct1 := make_date(EXTRACT(year FROM today)::int + 1, 10, 1); END IF;
  dst_sunday := oct1 + ((7 - EXTRACT(isodow FROM oct1)::int) % 7);
  INSERT INTO seed_b VALUES ('ACB-TSTDS', 'Bright P-12 College', 'Sam Patel', '+61423456789', 'sam@example.com',
    '1 Ireland St, Bright VIC 3741', 'Melbourne Outer', dst_sunday - 1 - today, '10:00', dst_sunday + 1 - today, '10:00',
    'Geelong (spans daylight saving)', 'confirmed', 'Sam Patel', '+61423456789', '099887766', 'VIC');

  FOR r IN SELECT * FROM seed_b ORDER BY (ref = 'ACB-TSTDS') DESC, start_off LOOP
    SELECT * INTO z FROM pricing_zones WHERE zone_name = r.zone;
    SELECT * INTO o FROM organisations WHERE name = r.org AND notes = 'seed';
    days := r.end_off - r.start_off + 1;
    p_at := ((today + r.start_off) + r.pickup) AT TIME ZONE 'Australia/Melbourne';
    r_at := ((today + r.end_off) + r.ret) AT TIME ZONE 'Australia/Melbourne';

    -- Skip anything that would clash with an active booking already seeded (e.g. the DST booking).
    IF r.status IN ('confirmed', 'picked_up') AND EXISTS (
      SELECT 1 FROM bookings WHERE status IN ('confirmed', 'picked_up')
        AND tstzrange(pickup_at, return_at, '[)') && tstzrange(p_at, r_at, '[)')
    ) THEN
      RAISE NOTICE 'Skipping % (overlaps another seeded booking)', r.ref;
      CONTINUE;
    END IF;

    INSERT INTO bookings (
      reference, organisation_id, organisation_name, booker_name, contact_person, contact_phone, booker_email,
      contact_address, category, is_invoiced_org, status, zone_id, zone_name, rate_per_day, additional_day_rate,
      start_date, end_date, pickup_time, dropoff_time, pickup_at, return_at, destination, amount_due,
      conditions_version_id, conditions_accepted_at, created_at
    ) VALUES (
      r.ref, o.id, r.org, COALESCE(r.org, r.contact), r.contact, r.phone, r.email,
      r.address, COALESCE(o.category, 'a'), COALESCE(o.invoicing_frequency IS NOT NULL, FALSE), r.status,
      z.id, z.zone_name, z.rate_per_day, 68,
      today + r.start_off, today + r.end_off, r.pickup, r.ret, p_at, r_at, r.dest,
      CASE WHEN o.category = 'c' THEN 0 ELSE z.rate_per_day * days END,
      cond, p_at - INTERVAL '14 days', p_at - INTERVAL '14 days'
    ) RETURNING id INTO b_id;

    INSERT INTO booking_drivers (booking_id, full_name, mobile, licence_number, licence_state, licence_expiry, home_address, age_confirmed)
    VALUES (b_id, r.driver, r.driver_phone, r.lic, r.lic_state, today + 900, r.address, TRUE);

    INSERT INTO audit_log (entity_type, entity_id, booking_id, action, actor_label, details, created_at)
    VALUES ('booking', b_id::text, b_id, 'created', 'Customer', jsonb_build_object('reference', r.ref, 'seed', true), p_at - INTERVAL '14 days');
  END LOOP;

  -- Pickup / return details for the ones that have been out
  UPDATE bookings SET keys_collected_at = pickup_at + INTERVAL '5 minutes', licence_sighted = TRUE, key_handed_over = TRUE,
                      odometer_out = 84210 + (EXTRACT(doy FROM pickup_at)::int * 37)
  WHERE reference IN ('ACB-TSTA2', 'ACB-TSTA3', 'ACB-TSTA4', 'ACB-TSTA5');

  UPDATE bookings SET keys_returned_at = return_at - INTERVAL '10 minutes', odometer_in = odometer_out + 212,
                      fuel_full = TRUE, bus_cleaned = TRUE
  WHERE reference IN ('ACB-TSTA2', 'ACB-TSTA3');
  UPDATE bookings SET keys_returned_at = return_at + INTERVAL '40 minutes', odometer_in = odometer_out + 318,
                      fuel_full = FALSE, bus_cleaned = TRUE, damage_notes = 'Small scratch on rear bumper, left side.'
  WHERE reference = 'ACB-TSTA4';

  UPDATE bookings SET cancelled_at = NOW() - INTERVAL '2 days', cancellation_reason = 'Cancelled by customer via manage link'
  WHERE reference = 'ACB-TSTB2';
  UPDATE bookings SET cancelled_at = NOW() - INTERVAL '1 day', cancellation_reason = 'Dates changed; replaced by ACB-TSTB4'
  WHERE reference = 'ACB-TSTB3';
  UPDATE bookings SET replaces_booking_id = (SELECT id FROM bookings WHERE reference = 'ACB-TSTB3')
  WHERE reference = 'ACB-TSTB4';

  -- A bounced confirmation so the dashboard's email problems panel has something to show
  INSERT INTO email_log (booking_id, kind, to_address, subject, status, error)
  SELECT id, 'booking_confirmation', 'priya@example.invalid', 'Booking confirmed: ' || reference, 'bounced',
         'The recipient''s mail server rejected the address'
  FROM bookings WHERE reference = 'ACB-TSTA6';
END $$;

COMMIT;

SELECT reference, status, start_date, end_date, amount_due FROM bookings WHERE reference LIKE 'ACB-TST%' ORDER BY pickup_at;
