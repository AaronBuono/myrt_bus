export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { getManageableBooking, getUnavailableDates, getBookingSettings } from "@/lib/queries/booking";
import { hashToken, looksLikeToken } from "@/lib/tokens";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import ManageBooking from "@/components/manage/ManageBooking";

// The URL contains a secret token: keep it out of search engines and Referer headers.
export const metadata: Metadata = {
  title: "Manage your booking",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{title}</h1>
      <div style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>{children}</div>
      <Link href="/" className="btn-secondary" style={{ display: "inline-block", marginTop: 24 }}>Back to home</Link>
    </div>
  );
}

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const allowed = await rateLimit(`manage-view:${clientKey(await headers())}`, 60, 600);
  const booking = allowed && looksLikeToken(token) ? await getManageableBooking(hashToken(token)) : null;

  if (!booking) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 64px" }}>
        <Notice title={allowed ? "This link no longer works" : "Too many attempts"}>
          {allowed ? (
            <p>
              The booking may have been changed, cancelled or already picked up. If you changed your dates,
              use the link in your most recent confirmation email.
            </p>
          ) : (
            <p>Please wait a few minutes and try again.</p>
          )}
        </Notice>
      </div>
    );
  }

  const [unavailableDates, settings] = await Promise.all([
    getUnavailableDates(booking.id),
    getBookingSettings(),
  ]);

  const hoursToPickup = (new Date(booking.pickupAt).getTime() - Date.now()) / 3_600_000;
  let lockedReason: string | null = null;
  if (hoursToPickup <= 0) {
    lockedReason = "The pick-up time for this booking has passed, so it can't be changed online.";
  } else if (settings.selfCancelCutoffHours > 0 && hoursToPickup < settings.selfCancelCutoffHours) {
    lockedReason = `Bookings can't be changed or cancelled online within ${settings.selfCancelCutoffHours} hours of pick-up.`;
  }

  return (
    <div>
      <div className="bg-brand-blue px-6 py-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-1">Manage your booking</h1>
        <p className="text-white/80 text-base">Change your dates or cancel. Keep this link private.</p>
      </div>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 64px" }}>
        <ManageBooking
          token={token}
          booking={booking}
          unavailableDates={unavailableDates}
          lockedReason={lockedReason}
          contactEmail={settings.replyTo}
        />
      </div>
    </div>
  );
}
