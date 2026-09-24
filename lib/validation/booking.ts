// Booking validation, shared by the booking wizard (client) and the API routes (server).
// Keep this file free of server-only imports.

import { z } from "zod";

// ── Licence ─────────────────────────────────────────────────

export const LICENCE_STATES = ["VIC", "ACT", "NSW", "NT", "QLD", "SA", "TAS", "WA", "NZ"] as const;
export type LicenceState = (typeof LICENCE_STATES)[number];

export const LICENCE_STATE_LABELS: Record<LicenceState, string> = {
  VIC: "Victoria",
  ACT: "Australian Capital Territory",
  NSW: "New South Wales",
  NT: "Northern Territory",
  QLD: "Queensland",
  SA: "South Australia",
  TAS: "Tasmania",
  WA: "Western Australia",
  NZ: "New Zealand",
};

/** Trim, drop spaces/hyphens, uppercase. Formats vary by state and change, so only a loose check follows. */
export function normaliseLicenceNumber(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}
const LICENCE_NUMBER = /^[A-Z0-9]{4,15}$/;

// ── Phone ───────────────────────────────────────────────────

/**
 * Normalises an Australian mobile to E.164 (+614XXXXXXXX).
 * Accepts 04XXXXXXXX, +614XXXXXXXX and 614XXXXXXXX, ignoring spaces, hyphens, dots and brackets.
 * Returns null if it isn't an AU mobile.
 */
export function normaliseAuMobile(input: string): string | null {
  const s = input.replace(/[\s\-().]/g, "");
  if (/^04\d{8}$/.test(s)) return `+61${s.slice(1)}`;
  if (/^\+614\d{8}$/.test(s)) return s;
  if (/^614\d{8}$/.test(s)) return `+${s}`;
  return null;
}

/** "+61412345678" → "0412 345 678" for display. */
export function formatAuMobile(e164: string | null | undefined): string {
  if (!e164) return "—";
  const m = /^\+614(\d{2})(\d{3})(\d{3})$/.exec(e164);
  return m ? `04${m[1]} ${m[2]} ${m[3]}` : e164;
}

// ── Field schemas ───────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const isoDate = (label: string) =>
  z.string({ message: `${label} is required` }).regex(ISO_DATE, `${label} is required`);

const time = (label: string) =>
  z.string({ message: `${label} is required` }).regex(HH_MM, `${label} is required`);

const requiredText = (label: string, max = 200) =>
  z.string({ message: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const auMobile = (label: string) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .transform((v, ctx) => {
      const n = normaliseAuMobile(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: `${label} must be an Australian mobile, e.g. 0412 345 678` });
        return z.NEVER;
      }
      return n;
    });

// ── Hire period ─────────────────────────────────────────────

const periodFields = {
  startDate: isoDate("Pick-up date"),
  endDate: isoDate("Return date"),
  pickupTime: time("Pick-up time"),
  returnTime: time("Return time"),
};

type Period = { startDate: string; endDate: string; pickupTime: string; returnTime: string };

function checkPeriod(d: Period, ctx: z.RefinementCtx) {
  if (d.endDate < d.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "Return date must be on or after the pick-up date" });
  } else if (d.endDate === d.startDate && d.returnTime <= d.pickupTime) {
    ctx.addIssue({ code: "custom", path: ["returnTime"], message: "Return time must be after the pick-up time" });
  }
}

/** Changing dates on an existing booking (manage page and admin). */
export const periodSchema = z.object(periodFields).superRefine(checkPeriod);
export type PeriodInput = z.input<typeof periodSchema>;

// ── Full booking ────────────────────────────────────────────

// Organisation is optional until Lions confirm otherwise. To make it mandatory,
// swap this for requiredText() and add an "Individual / no organisation" choice in Step2Details.
const organisation = z
  .string()
  .trim()
  .max(200, "Organisation name is too long")
  .optional()
  .transform((v) => (v ? v : null));

export const bookingSchema = z
  .object({
    ...periodFields,
    zoneId: requiredText("Destination zone", 64),
    destination: requiredText("Destination"),

    organisation,
    contactName: requiredText("Contact name", 120),
    contactMobile: auMobile("Contact mobile"),
    contactEmail: z
      .string({ message: "Email address is required" })
      .trim()
      .toLowerCase()
      .min(1, "Email address is required")
      .pipe(z.email("Enter a valid email address")),
    contactAddress: requiredText("Contact address", 300),

    driverName: requiredText("Driver's full name", 120),
    driverMobile: auMobile("Driver's mobile"),
    driverAddress: requiredText("Driver's home address", 300),
    licenceNumber: z
      .string({ message: "Licence number is required" })
      .transform(normaliseLicenceNumber)
      .refine((v) => v.length > 0, "Licence number is required")
      .refine((v) => v.length === 0 || LICENCE_NUMBER.test(v), "Licence number should be 4–15 letters or numbers"),
    licenceState: z.enum(LICENCE_STATES, { message: "Select where the licence was issued" }),
    licenceExpiry: isoDate("Licence expiry date"),
    ageConfirmed: z.literal(true, { message: "Confirm the driver is 21 or older" }),

    conditionsAccepted: z.literal(true, { message: "You must agree to the conditions of use" }),
    conditionsVersionId: z.string().nullable(),
  })
  .superRefine((d, ctx) => {
    checkPeriod(d, ctx);
    if (ISO_DATE.test(d.licenceExpiry) && ISO_DATE.test(d.endDate) && d.licenceExpiry < d.endDate) {
      ctx.addIssue({ code: "custom", path: ["licenceExpiry"], message: "The driver's licence expires before the return date" });
    }
  });

export type BookingInput = z.input<typeof bookingSchema>;
export type BookingData = z.output<typeof bookingSchema>;

/** Flattens zod issues to { fieldName: firstMessage }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
