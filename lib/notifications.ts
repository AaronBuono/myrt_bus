import "server-only";
import { SITE_URL } from "@/lib/site";
import { getBookingEmailData, getAdminNotifyEmails } from "@/lib/queries/booking";
import { sendBookingConfirmation, sendBookingCancelled, sendAdminCancellationNotice } from "@/lib/email";

// Each of these swallows errors after logging: the booking change has already happened,
// and a failed send is recorded in email_log for the admin to see and resend.

export function manageUrl(token: string): string {
  return `${SITE_URL}/manage/${token}`;
}

/** Returns whether the email was sent. */
export async function sendConfirmationFor(bookingId: string, token: string, opts: { isChange?: boolean } = {}): Promise<boolean> {
  try {
    const d = await getBookingEmailData(bookingId);
    if (!d) return false;
    await sendBookingConfirmation(d, manageUrl(token), opts);
    return true;
  } catch (err) {
    console.error("Confirmation email failed:", err);
    return false;
  }
}

export async function notifyCancelled(bookingId: string, by: "customer" | "staff") {
  try {
    const d = await getBookingEmailData(bookingId);
    if (!d) return;
    await sendBookingCancelled(d, by).catch((err) => console.error("Cancellation email failed:", err));
    if (by === "customer") {
      const adminUrl = `${SITE_URL}/admin?section=bookings&bookingId=${bookingId}`;
      const recipients = await getAdminNotifyEmails();
      await Promise.all(
        recipients.map((to) =>
          sendAdminCancellationNotice(to, d, adminUrl).catch((err) => console.error("Admin notice failed:", err)),
        ),
      );
    }
  } catch (err) {
    console.error("notifyCancelled failed:", err);
  }
}
