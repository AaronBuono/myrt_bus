// Integration tests: the real query code against in-memory Postgres (PGlite),
// with db/schema.sql and db/seed.sql applied. Run with `npm test`.

import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pg, sql } from "@/lib/db";
import {
  createBooking,
  getManageableBooking,
  getUnavailableDates,
  modifyBookingDates,
  cancelBooking,
  getBookingEmailData,
  getPricingSnapshot,
  getCurrentConditions,
} from "@/lib/queries/booking";
import { recordPickup, recordReturn, getDayView, publishNewConditions, updateZoneRate } from "@/lib/queries/admin";
import { rateLimit } from "@/lib/rate-limit";
import { hashToken } from "@/lib/tokens";
import { isOverlapViolation, isReferenceCollision } from "@/lib/reference";
import { bookingSchema, type BookingData } from "@/lib/validation/booking";

type PgHandle = { exec: (s: string) => Promise<unknown> };

const staff = { id: "", displayName: "Wendy (WAW)", email: "wendy@example.com", role: "waw_staff" as const };

async function makeBooking(overrides: Partial<Record<string, unknown>> = {}) {
  const { zones, additionalDayRate } = await getPricingSnapshot();
  const conditions = await getCurrentConditions();
  const input = {
    startDate: "2031-05-10", endDate: "2031-05-11", pickupTime: "09:00", returnTime: "17:00",
    zoneId: zones[0].id, destination: "Wangaratta",
    organisation: "", contactName: "Test Person", contactMobile: "0412 345 678",
    contactEmail: "test@example.com", contactAddress: "1 Test St, Myrtleford",
    driverName: "Test Driver", driverMobile: "0412 000 111", driverAddress: "1 Test St, Myrtleford",
    licenceNumber: "123456789", licenceState: "VIC", licenceExpiry: "2033-01-01",
    ageConfirmed: true, conditionsAccepted: true, conditionsVersionId: conditions?.id ?? null,
    ...overrides,
  };
  const d = bookingSchema.parse(input) as BookingData;
  return createBooking(d, { zone: zones[0], additionalDayRate, org: null, conditionsId: conditions?.id ?? null });
}

before(async () => {
  await (pg as PgHandle).exec(readFileSync("db/schema.sql", "utf8"));
  await (pg as PgHandle).exec(readFileSync("db/seed.sql", "utf8"));
  const rows = await sql`INSERT INTO users (display_name, email, role) VALUES ('Wendy (WAW)', 'wendy@example.com', 'waw_staff') RETURNING id`;
  staff.id = rows[0].id as string;
});

test("seed data loads, including a booking across the DST change", async () => {
  const rows = await sql`SELECT reference, status, EXTRACT(EPOCH FROM return_at - pickup_at) / 3600 AS hours FROM bookings WHERE reference LIKE 'ACB-TST%'`;
  assert.ok(rows.length >= 10, `expected seed bookings, got ${rows.length}`);
  const dst = rows.find((r) => r.reference === "ACB-TSTDS");
  assert.ok(dst, "DST booking seeded");
  assert.equal(Number(dst.hours), 47);
});

test("create → manage link → unavailable dates", async () => {
  const b = await makeBooking();
  assert.match(b.reference, /^ACB-[A-Z2-9]{6}$/);
  const { zones } = await getPricingSnapshot();
  assert.equal(b.amountDue, zones[0].ratePerDay * 2, "2 days at the zone rate");

  const managed = await getManageableBooking(hashToken(b.token));
  assert.equal(managed?.reference, b.reference);
  assert.equal(managed?.pickupAt, "2031-05-09T23:00:00.000Z", "stored in UTC (9am AEST)");

  const drivers = await sql`SELECT licence_number, licence_state, mobile FROM booking_drivers WHERE booking_id = ${b.id}`;
  assert.deepEqual(drivers[0], { licence_number: "123456789", licence_state: "VIC", mobile: "+61412000111" });

  const audit = await sql`SELECT action, actor_label FROM audit_log WHERE booking_id = ${b.id}`;
  assert.deepEqual(audit.map((a) => a.action), ["created"]);

  const unavailable = await getUnavailableDates();
  assert.ok(unavailable.includes("2031-05-10") && unavailable.includes("2031-05-11"));
  assert.ok(!(await getUnavailableDates(b.id)).includes("2031-05-10"), "can exclude a booking (for date changes)");
});

test("the database rejects a double booking", async () => {
  await makeBooking({ startDate: "2031-06-01", endDate: "2031-06-02" });
  await assert.rejects(
    makeBooking({ startDate: "2031-06-02", endDate: "2031-06-03", pickupTime: "08:00" }),
    (err) => isOverlapViolation(err),
  );
  // Back-to-back is fine: next pickup at the previous return time.
  await makeBooking({ startDate: "2031-06-02", endDate: "2031-06-02", pickupTime: "17:00", returnTime: "20:00" });
});

test("a duplicate reference is recognised as a retryable collision", async () => {
  const b = await makeBooking({ startDate: "2031-07-01", endDate: "2031-07-01" });
  await assert.rejects(
    sql`UPDATE bookings SET reference = ${b.reference} WHERE reference = 'ACB-TSTA6'`,
    (err) => isReferenceCollision(err),
  );
});

test("changing dates issues a new reference and link, and keeps the old row cancelled", async () => {
  const b = await makeBooking({ startDate: "2031-08-01", endDate: "2031-08-01" });
  // Overlaps its own current dates: must still work.
  const r = await modifyBookingDates(b.id, { startDate: "2031-08-01", endDate: "2031-08-02", pickupTime: "09:00", returnTime: "12:00" }, "customer");
  assert.ok(r.ok);
  assert.notEqual(r.reference, b.reference);

  assert.equal(await getManageableBooking(hashToken(b.token)), null, "old link dead");
  assert.equal((await getManageableBooking(hashToken(r.token)))?.reference, r.reference, "new link works");

  const [oldRow] = await sql`SELECT status, cancellation_reason FROM bookings WHERE id = ${b.id}`;
  assert.equal(oldRow.status, "cancelled");
  assert.match(String(oldRow.cancellation_reason), new RegExp(r.reference));

  const [newRow] = await sql`SELECT replaces_booking_id, amount_due, rate_per_day FROM bookings WHERE id = ${r.bookingId}`;
  assert.equal(newRow.replaces_booking_id, b.id);
  assert.equal(Number(newRow.amount_due), Number(newRow.rate_per_day) * 2, "re-priced for 2 days at the snapshotted rate");

  const drivers = await sql`SELECT full_name FROM booking_drivers WHERE booking_id = ${r.bookingId}`;
  assert.equal(drivers[0]?.full_name, "Test Driver", "driver copied");

  // Can't change a booking that's no longer confirmed
  const again = await modifyBookingDates(b.id, { startDate: "2031-08-05", endDate: "2031-08-05", pickupTime: "09:00", returnTime: "12:00" }, "customer");
  assert.deepEqual(again, { ok: false, reason: "not_modifiable" });
});

test("changing into someone else's dates is rejected and changes nothing", async () => {
  const a = await makeBooking({ startDate: "2031-09-01", endDate: "2031-09-01" });
  const b = await makeBooking({ startDate: "2031-09-03", endDate: "2031-09-03" });
  await assert.rejects(
    modifyBookingDates(b.id, { startDate: "2031-09-01", endDate: "2031-09-01", pickupTime: "10:00", returnTime: "11:00" }, "customer"),
    (err) => isOverlapViolation(err),
  );
  const rows = await sql`SELECT id, status FROM bookings WHERE id IN (${a.id}, ${b.id})`;
  assert.ok(rows.every((r) => r.status === "confirmed"), "both untouched");
  assert.ok(await getManageableBooking(hashToken(b.token)), "link still works");
});

test("customer cancellation kills the link and frees the dates", async () => {
  const b = await makeBooking({ startDate: "2031-10-01", endDate: "2031-10-01" });
  assert.equal(await cancelBooking(b.id, "customer", { reason: "test" }), true);
  assert.equal(await cancelBooking(b.id, "customer"), false, "second cancel is a no-op");
  assert.equal(await getManageableBooking(hashToken(b.token)), null);
  assert.ok(!(await getUnavailableDates()).includes("2031-10-01"));
  await makeBooking({ startDate: "2031-10-01", endDate: "2031-10-01" }); // dates reusable
});

test("pickup and return at the counter", async () => {
  const b = await makeBooking({ startDate: "2031-11-01", endDate: "2031-11-02" });
  const user = { ...staff };

  const day = await getDayView("2031-11-01");
  assert.ok(day.some((r) => r.id === b.id && r.is_pickup_day === true));

  assert.equal(await recordPickup(b.id, { userId: user.id, userLabel: user.displayName, odometerOut: 1000, licenceSighted: true, keyHandedOver: true }), true);
  assert.equal(await recordPickup(b.id, { userId: user.id, userLabel: user.displayName, odometerOut: 1000, licenceSighted: true, keyHandedOver: true }), false, "can't pick up twice");
  assert.equal(await getManageableBooking(hashToken(b.token)), null, "manage link stops working once picked up");
  assert.equal(await cancelBooking(b.id, "customer"), false, "customer can't cancel once out");

  const base = { userId: user.id, userLabel: user.displayName, fuelFull: true, busCleaned: true, damageNotes: null, damagePhotoUrl: null };
  assert.equal(await recordReturn(b.id, { ...base, odometerIn: 900 }), "odometer");
  assert.equal(await recordReturn(b.id, { ...base, odometerIn: 1250, fuelFull: false, damageNotes: "Scratch" }), "ok");
  assert.equal(await recordReturn(b.id, { ...base, odometerIn: 1300 }), "not_out");

  const [row] = await sql`SELECT status, odometer_out, odometer_in, fuel_full, damage_notes FROM bookings WHERE id = ${b.id}`;
  assert.deepEqual(row, { status: "returned", odometer_out: 1000, odometer_in: 1250, fuel_full: false, damage_notes: "Scratch" });

  const audit = await sql`SELECT action, actor_label, details->>'km' AS km FROM audit_log WHERE booking_id = ${b.id} ORDER BY created_at`;
  assert.deepEqual(audit.map((a) => a.action), ["created", "picked_up", "returned"]);
  assert.equal(audit[2].actor_label, "Wendy (WAW)");
  assert.equal(audit[2].km, "250");
});

test("email data has Melbourne times, pickup hours and the accepted conditions", async () => {
  const b = await makeBooking({ startDate: "2031-12-01", endDate: "2031-12-01", pickupTime: "09:30", returnTime: "16:00" });
  const d = await getBookingEmailData(b.id);
  assert.ok(d);
  assert.match(d.pickupText, /1 Dec 2031,? 9:30\s?am/i);
  assert.equal(d.contactMobile, "0412 345 678");
  assert.match(d.pickupLocation?.hoursText ?? "", /^Mon–Fri 9:00 AM – 5:00 PM/);
  assert.equal(d.conditions?.version, 1);
});

test("rate limiter counts within a window", async () => {
  const key = `test:${Math.random()}`;
  const results = [];
  for (let i = 0; i < 4; i++) results.push(await rateLimit(key, 3, 600));
  assert.deepEqual(results, [true, true, true, false]);
});

test("publishing conditions and changing a rate are atomic single statements", async () => {
  const v = await publishNewConditions("New conditions", staff.id);
  assert.equal(v, 2);
  const current = await sql`SELECT version FROM conditions_of_use WHERE is_current`;
  assert.deepEqual(current, [{ version: 2 }]);

  const [z] = await sql`SELECT id, rate_per_day FROM pricing_zones ORDER BY display_order LIMIT 1`;
  await updateZoneRate(z.id as string, 99, staff.id);
  const [h] = await sql`SELECT old_rate, new_rate FROM pricing_history WHERE zone_id = ${z.id}`;
  assert.deepEqual(h, { old_rate: z.rate_per_day, new_rate: "99.00" });
});
