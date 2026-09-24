import { test } from "node:test";
import assert from "node:assert/strict";
import { melbourneToUtc, todayInMelbourne, daysInclusive, fmtDateTime } from "@/lib/time";
import {
  bookingSchema,
  periodSchema,
  normaliseAuMobile,
  normaliseLicenceNumber,
  formatAuMobile,
  fieldErrors,
  type BookingInput,
} from "@/lib/validation/booking";
import { generateReference, REFERENCE_ALPHABET } from "@/lib/reference";
import { summariseHours } from "@/lib/hours";

// ── Time ────────────────────────────────────────────────────

test("Melbourne wall time → UTC, standard and daylight time", () => {
  assert.equal(melbourneToUtc("2026-07-01", "09:00").toISOString(), "2026-06-30T23:00:00.000Z"); // AEST +10
  assert.equal(melbourneToUtc("2026-12-01", "09:00").toISOString(), "2026-11-30T22:00:00.000Z"); // AEDT +11
});

test("booking across the October DST change is 47 hours, not 48", () => {
  // Clocks go forward at 2am on Sunday 4 October 2026.
  const pickup = melbourneToUtc("2026-10-03", "10:00");
  const ret = melbourneToUtc("2026-10-05", "10:00");
  assert.equal(pickup.toISOString(), "2026-10-03T00:00:00.000Z");
  assert.equal(ret.toISOString(), "2026-10-04T23:00:00.000Z");
  assert.equal((ret.getTime() - pickup.getTime()) / 3_600_000, 47);
  assert.equal(daysInclusive("2026-10-03", "2026-10-05"), 3);
  assert.match(fmtDateTime(ret), /Mon,? 5 Oct 2026,? 10:00\s?am/i);
});

test("booking across the April DST change is 49 hours", () => {
  // Clocks go back at 3am on Sunday 5 April 2026.
  const pickup = melbourneToUtc("2026-04-04", "10:00");
  const ret = melbourneToUtc("2026-04-06", "10:00");
  assert.equal((ret.getTime() - pickup.getTime()) / 3_600_000, 49);
});

test("a time skipped by DST resolves forward", () => {
  // 2:30am doesn't exist on 4 Oct 2026; it becomes 3:30am AEDT.
  assert.equal(melbourneToUtc("2026-10-04", "02:30").toISOString(), "2026-10-03T16:30:00.000Z");
});

test("today in Melbourne differs from UTC early in the morning", () => {
  assert.equal(todayInMelbourne(new Date("2026-09-24T20:00:00Z")), "2026-09-25");
  assert.equal(todayInMelbourne(new Date("2026-09-24T12:00:00Z")), "2026-09-24");
});

// ── Phones and licences ─────────────────────────────────────

test("AU mobile normalises to E.164", () => {
  assert.equal(normaliseAuMobile("0412 345 678"), "+61412345678");
  assert.equal(normaliseAuMobile("0412-345-678"), "+61412345678");
  assert.equal(normaliseAuMobile("+61 412 345 678"), "+61412345678");
  assert.equal(normaliseAuMobile("61412345678"), "+61412345678");
  assert.equal(normaliseAuMobile("(03) 5752 1234"), null, "landline");
  assert.equal(normaliseAuMobile("041234567"), null, "too short");
  assert.equal(normaliseAuMobile("+64 21 123 4567"), null, "NZ mobile");
  assert.equal(formatAuMobile("+61412345678"), "0412 345 678");
});

test("licence number is trimmed, uppercased and loosely checked", () => {
  assert.equal(normaliseLicenceNumber("  ab 123-456 "), "AB123456");
});

// ── Booking schema ──────────────────────────────────────────

const valid: BookingInput = {
  startDate: "2030-03-01", endDate: "2030-03-02", pickupTime: "09:00", returnTime: "17:00",
  zoneId: "zone-1", destination: "Wangaratta",
  organisation: "", contactName: "Margaret Brown", contactMobile: "0412 345 678",
  contactEmail: " Margaret@Example.com ", contactAddress: "12 Standish St, Myrtleford",
  driverName: "Bill Brown", driverMobile: "0412999000", driverAddress: "12 Standish St, Myrtleford",
  licenceNumber: " vic 12345 ", licenceState: "VIC", licenceExpiry: "2031-01-01",
  ageConfirmed: true, conditionsAccepted: true, conditionsVersionId: "c1",
};

test("valid booking parses and normalises", () => {
  const r = bookingSchema.safeParse(valid);
  assert.ok(r.success, JSON.stringify(!r.success && r.error.issues));
  assert.equal(r.data.contactMobile, "+61412345678");
  assert.equal(r.data.contactEmail, "margaret@example.com");
  assert.equal(r.data.licenceNumber, "VIC12345");
  assert.equal(r.data.organisation, null, "blank organisation → null (individual)");
});

test("booking errors are reported per field", () => {
  const r = bookingSchema.safeParse({
    ...valid,
    contactMobile: "5752 1234",
    contactEmail: "nope",
    licenceNumber: "A!",
    licenceState: "UK",
    ageConfirmed: false,
    conditionsAccepted: false,
  });
  assert.ok(!r.success);
  const errs = fieldErrors(r.error);
  for (const k of ["contactMobile", "contactEmail", "licenceNumber", "licenceState", "ageConfirmed", "conditionsAccepted"]) {
    assert.ok(errs[k], `expected an error for ${k}`);
  }
});

test("licence must be valid until the return date", () => {
  const r = bookingSchema.safeParse({ ...valid, licenceExpiry: "2030-03-01" });
  assert.ok(!r.success);
  assert.ok(fieldErrors(r.error).licenceExpiry);
});

test("removed fields are ignored, not required", () => {
  const r = bookingSchema.safeParse({ ...valid, purpose: "x", passengerCount: 99 });
  assert.ok(r.success);
  assert.ok(!("purpose" in r.data));
});

test("same-day hire must return after pickup", () => {
  const r = periodSchema.safeParse({ startDate: "2030-03-01", endDate: "2030-03-01", pickupTime: "17:00", returnTime: "09:00" });
  assert.ok(!r.success);
  assert.ok(fieldErrors(r.error).returnTime);
  assert.ok(!periodSchema.safeParse({ startDate: "2030-03-02", endDate: "2030-03-01", pickupTime: "09:00", returnTime: "17:00" }).success);
});

// ── References ──────────────────────────────────────────────

test("references use ACB- and an unambiguous alphabet", () => {
  for (const ch of "0O1IL") assert.ok(!REFERENCE_ALPHABET.includes(ch), `alphabet must not contain ${ch}`);
  const seen = new Set<string>();
  for (let i = 0; i < 2000; i++) {
    const ref = generateReference();
    assert.match(ref, /^ACB-[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$/);
    seen.add(ref);
  }
  assert.ok(seen.size > 1990, "references should be effectively unique");
});

// ── Opening hours ───────────────────────────────────────────

test("opening hours collapse into ranges", () => {
  const hours = [0, 1, 2, 3, 4].map((d) => ({ dayOfWeek: d, isOpen: true, openingTime: "09:00", closingTime: "17:00" }));
  hours.push({ dayOfWeek: 5, isOpen: true, openingTime: "09:00", closingTime: "12:00" });
  hours.push({ dayOfWeek: 6, isOpen: false, openingTime: null as unknown as string, closingTime: null as unknown as string });
  assert.equal(summariseHours(hours), "Mon–Fri 9:00 AM – 5:00 PM · Sat 9:00 AM – 12:00 PM · Sun closed");
});

// ── Resend (Svix) webhook signatures ────────────────────────

test("Svix signature verification matches the published test vector", async () => {
  const { verifySvixSignature } = await import("@/lib/webhook");
  const base = {
    secret: "whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw",
    id: "msg_p5jXN8AQM9LWM0D4loKWxJek",
    timestamp: "1614265330",
    body: '{"test": 2432232314}',
    now: 1614265330 * 1000,
  };
  const good = "v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=";
  assert.equal(verifySvixSignature({ ...base, signatureHeader: good }), true);
  assert.equal(verifySvixSignature({ ...base, signatureHeader: `v1,bm90IHRoZSBzaWc= ${good}` }), true, "any matching signature in the list");
  assert.equal(verifySvixSignature({ ...base, signatureHeader: good, body: '{"test": 1}' }), false, "tampered body");
  assert.equal(verifySvixSignature({ ...base, signatureHeader: good, now: (1614265330 + 3600) * 1000 }), false, "replayed an hour later");
});
