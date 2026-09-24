import { NextRequest, NextResponse, after } from "next/server";
import {
  lookupOrganisation,
  getPricingSnapshot,
  getCurrentConditions,
  createBooking,
} from "@/lib/queries/booking";
import { bookingSchema, fieldErrors } from "@/lib/validation/booking";
import { isOverlapViolation } from "@/lib/reference";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { melbourneToUtc } from "@/lib/time";
import { sendConfirmationFor } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  if (!(await rateLimit(`booking:${clientKey(req.headers)}`, 5, 600))) {
    return NextResponse.json(
      { error: "Too many booking attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) },
      { status: 400 },
    );
  }
  const d = parsed.data;

  if (melbourneToUtc(d.startDate, d.pickupTime).getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "The pick-up time has already passed.", fieldErrors: { pickupTime: "Choose a pick-up time in the future" } },
      { status: 400 },
    );
  }

  try {
    const [{ zones, additionalDayRate }, conditions, org] = await Promise.all([
      getPricingSnapshot(),
      getCurrentConditions(),
      d.organisation ? lookupOrganisation(d.organisation) : Promise.resolve(null),
    ]);

    const zone = zones.find((z) => z.id === d.zoneId);
    if (!zone) return NextResponse.json({ error: "Please choose a destination zone." }, { status: 400 });

    // The booker must have agreed to the version that is current now.
    if (conditions && d.conditionsVersionId !== conditions.id) {
      return NextResponse.json(
        {
          error: "The conditions of use were updated while you were booking. Please read them again and tick the box to agree.",
          code: "conditions_changed",
          conditions: { id: conditions.id, version: conditions.version, content: conditions.content },
        },
        { status: 409 },
      );
    }

    const created = await createBooking(d, {
      zone,
      additionalDayRate,
      org,
      conditionsId: conditions?.id ?? null,
    });

    after(() => sendConfirmationFor(created.id, created.token));

    return NextResponse.json({
      reference: created.reference,
      amountDue: created.amountDue,
      category: created.category,
      isInvoicedOrg: created.isInvoicedOrg,
      startDate: d.startDate,
      endDate: d.endDate,
      pickupTime: d.pickupTime,
      returnTime: d.returnTime,
      destination: d.destination,
      zoneName: created.zoneName,
      contactEmail: d.contactEmail,
    });
  } catch (err) {
    if (isOverlapViolation(err)) {
      return NextResponse.json(
        {
          error: "Sorry, the bus was just booked by someone else for some of that time. Please go back and choose different dates.",
          code: "unavailable",
        },
        { status: 409 },
      );
    }
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Something went wrong creating your booking. Please try again." }, { status: 500 });
  }
}
