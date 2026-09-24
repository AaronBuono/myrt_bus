import { NextRequest, NextResponse, after } from "next/server";
import {
  getManageableBooking,
  getBookingSettings,
  cancelBooking,
  modifyBookingDates,
} from "@/lib/queries/booking";
import { periodSchema, fieldErrors } from "@/lib/validation/booking";
import { hashToken, looksLikeToken } from "@/lib/tokens";
import { isOverlapViolation } from "@/lib/reference";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { melbourneToUtc } from "@/lib/time";
import { sendConfirmationFor, notifyCancelled } from "@/lib/notifications";

const LINK_EXPIRED =
  "This link no longer works. The booking may have been changed, cancelled or already picked up. Check your most recent confirmation email.";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!(await rateLimit(`manage:${clientKey(req.headers)}`, 10, 600))) {
    return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
  }

  const { token } = await params;
  if (!looksLikeToken(token)) return NextResponse.json({ error: LINK_EXPIRED }, { status: 404 });

  let body: { action?: string } & Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const [booking, settings] = await Promise.all([getManageableBooking(hashToken(token)), getBookingSettings()]);
    if (!booking) return NextResponse.json({ error: LINK_EXPIRED }, { status: 404 });

    const hoursToPickup = (new Date(booking.pickupAt).getTime() - Date.now()) / 3_600_000;
    if (hoursToPickup <= 0) {
      return NextResponse.json(
        { error: "The pick-up time for this booking has passed, so it can't be changed online. Please contact us." },
        { status: 403 },
      );
    }
    if (settings.selfCancelCutoffHours > 0 && hoursToPickup < settings.selfCancelCutoffHours) {
      return NextResponse.json(
        { error: `Bookings can't be changed or cancelled online within ${settings.selfCancelCutoffHours} hours of pick-up. Please contact us.` },
        { status: 403 },
      );
    }

    if (body.action === "cancel") {
      const ok = await cancelBooking(booking.id, "customer", { reason: "Cancelled by customer via manage link" });
      if (!ok) return NextResponse.json({ error: LINK_EXPIRED }, { status: 404 });
      after(() => notifyCancelled(booking.id, "customer"));
      return NextResponse.json({ cancelled: true, reference: booking.reference });
    }

    if (body.action === "modify") {
      const parsed = periodSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Please check the new dates and times.", fieldErrors: fieldErrors(parsed.error) },
          { status: 400 },
        );
      }
      const p = parsed.data;
      if (melbourneToUtc(p.startDate, p.pickupTime).getTime() <= Date.now()) {
        return NextResponse.json({ error: "Choose a pick-up time in the future." }, { status: 400 });
      }

      const result = await modifyBookingDates(booking.id, p, "customer");
      if (!result.ok) return NextResponse.json({ error: LINK_EXPIRED }, { status: 404 });

      after(() => sendConfirmationFor(result.bookingId, result.token, { isChange: true }));
      return NextResponse.json({ modified: true, reference: result.reference, ...p });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    if (isOverlapViolation(err)) {
      return NextResponse.json(
        { error: "Sorry, the bus is already booked for some of that time. Please choose different dates." },
        { status: 409 },
      );
    }
    console.error("Manage booking error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
