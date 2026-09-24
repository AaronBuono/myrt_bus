import "server-only";
import { Resend } from "resend";
import { sql } from "@/lib/db";
import { SITE_NAME, SITE_URL, OPERATOR_NAME } from "@/lib/site";

// Lazily initialised so build-time static analysis doesn't fail without env vars.
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY environment variable is not set");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? `${SITE_NAME} <noreply@alpinecommunitybus.com.au>`;
}

export type EmailKind = "booking_confirmation" | "booking_cancelled" | "admin_cancel_notice" | "staff_invite";

// ── Templating ──────────────────────────────────────────────

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const NAVY = "#002868";
const AMBER = "#C97B0A";

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#F5F6F8;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F6F8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #DDE1EA;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${NAVY};padding:20px 28px;">
          <p style="margin:0;font-size:20px;font-weight:bold;color:#ffffff;">${esc(SITE_NAME)}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#C7D2E8;">Operated by the ${esc(OPERATOR_NAME)}</p>
        </td></tr>
        <tr><td style="padding:28px;font-size:16px;line-height:1.6;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #DDE1EA;font-size:13px;color:#5E6470;">
          <a href="${SITE_URL}" style="color:${NAVY};">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string, color = NAVY): string {
  return `<p style="margin:24px 0;"><a href="${esc(href)}" style="display:inline-block;padding:14px 24px;background:${color};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;">${esc(label)}</a></p>`;
}

function detailRows(rows: Array<[string, string]>): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0;">
    ${rows
      .map(
        ([k, v]) => `<tr>
          <td style="padding:8px 12px 8px 0;border-bottom:1px solid #F0F1F4;font-size:14px;color:#5E6470;vertical-align:top;white-space:nowrap;">${esc(k)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #F0F1F4;font-size:15px;font-weight:bold;vertical-align:top;">${esc(v).replace(/\n/g, "<br>")}</td>
        </tr>`,
      )
      .join("")}
  </table>`;
}

function textRows(rows: Array<[string, string]>): string {
  return rows.map(([k, v]) => `${k}: ${v}`).join("\n");
}

// ── Sending ─────────────────────────────────────────────────

/**
 * Sends one email and records it in email_log. The Resend webhook later updates the
 * row's status (delivered / bounced / complained / failed) by resend_email_id.
 * Throws if Resend rejects the send, after logging the failure.
 */
export async function sendEmail(opts: {
  kind: EmailKind;
  to: string;
  subject: string;
  html: string;
  text: string;
  bookingId?: string | null;
  replyTo?: string | null;
}): Promise<void> {
  let resendId: string | null = null;
  let error: string | null = null;
  try {
    const res = await getResend().emails.send({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    if (res.error) error = `${res.error.name}: ${res.error.message}`;
    resendId = res.data?.id ?? null;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  try {
    await sql`
      INSERT INTO email_log (booking_id, kind, to_address, subject, resend_email_id, status, error)
      VALUES (${opts.bookingId ?? null}::uuid, ${opts.kind}, ${opts.to}, ${opts.subject},
              ${resendId}, ${error ? "failed" : "sent"}, ${error})
    `;
  } catch (logErr) {
    console.error("email_log insert failed:", logErr);
  }

  if (error) throw new Error(`Email "${opts.subject}" to ${opts.to} failed: ${error}`);
}

// ── Booking emails ──────────────────────────────────────────

export interface BookingEmailData {
  bookingId: string;
  reference: string;
  contactName: string;
  contactMobile: string;
  contactEmail: string;
  organisation: string | null;
  pickupText: string;   // "Sat 3 Oct 2026, 10:00 am"
  returnText: string;
  destination: string;
  zoneName: string;
  amountDue: number;
  category: "a" | "c";
  isInvoicedOrg: boolean;
  pickupLocation: { name: string; address: string; phone: string; hoursText: string } | null;
  conditions: { version: number; content: string } | null;
  replyTo: string | null;
}

function paymentLine(d: BookingEmailData): string {
  if (d.category === "c") return "No payment required.";
  if (d.isInvoicedOrg) return "Your organisation will be invoiced. No payment is needed at pickup.";
  return `Amount due at pickup: $${d.amountDue.toFixed(2)}. Please bring this email and the driver's licence.`;
}

function bookingRows(d: BookingEmailData): Array<[string, string]> {
  return [
    ["Reference", d.reference],
    ["Pick up", d.pickupText],
    ["Return", d.returnText],
    ["Destination", `${d.destination} (${d.zoneName})`],
    ...(d.organisation ? [["Organisation", d.organisation] as [string, string]] : []),
    ["Contact", d.contactName],
    ["Mobile", d.contactMobile],
    ["Email", d.contactEmail],
  ];
}

function locationBlock(d: BookingEmailData): { html: string; text: string } {
  const loc = d.pickupLocation;
  if (!loc) return { html: "", text: "" };
  const lines = [loc.name, loc.address, loc.phone ? `Phone ${loc.phone}` : "", `Hours: ${loc.hoursText}`].filter(Boolean);
  return {
    html: `<h2 style="font-size:17px;margin:24px 0 8px;color:${NAVY};">Key pickup and return</h2>
      <p style="margin:0;">${lines.map(esc).join("<br>")}</p>`,
    text: `KEY PICKUP AND RETURN\n${lines.join("\n")}`,
  };
}

export async function sendBookingConfirmation(d: BookingEmailData, manageUrl: string, opts: { isChange?: boolean } = {}) {
  const heading = opts.isChange ? "Your booking has been changed" : "Your booking is confirmed";
  const intro = opts.isChange
    ? "Your new dates are confirmed. This email replaces your previous confirmation: the old reference and link no longer work."
    : "Thanks for booking the Alpine Community Bus. Keep this email; you'll need the reference when you pick up the key.";
  const loc = locationBlock(d);
  const conditionsHtml = d.conditions
    ? `<h2 style="font-size:17px;margin:24px 0 8px;color:${NAVY};">Conditions of use (version ${d.conditions.version})</h2>
       <p style="margin:0 0 8px;font-size:14px;color:#5E6470;">You agreed to these conditions when you booked.</p>
       <div style="font-size:14px;line-height:1.6;background:#F5F6F8;border-radius:8px;padding:12px 16px;">${esc(d.conditions.content).replace(/\n/g, "<br>")}</div>`
    : "";

  const html = layout(
    `${heading}: ${d.reference}`,
    `<h1 style="font-size:22px;margin:0 0 8px;color:${NAVY};">${esc(heading)}</h1>
     <p style="margin:0 0 8px;">Hi ${esc(d.contactName)},</p>
     <p style="margin:0;">${esc(intro)}</p>
     ${detailRows(bookingRows(d))}
     <p style="margin:0;padding:12px 16px;background:#FEF7E6;border-radius:8px;font-weight:bold;">${esc(paymentLine(d))}</p>
     ${loc.html}
     <h2 style="font-size:17px;margin:24px 0 8px;color:${NAVY};">Need to change or cancel?</h2>
     <p style="margin:0;">Use your private link below. Don't share it; anyone with it can change this booking.</p>
     ${button(manageUrl, "Manage my booking", AMBER)}
     ${conditionsHtml}`,
  );

  const text = [
    heading.toUpperCase(),
    "",
    `Hi ${d.contactName},`,
    intro,
    "",
    textRows(bookingRows(d)),
    "",
    paymentLine(d),
    "",
    loc.text,
    "",
    "NEED TO CHANGE OR CANCEL?",
    `Use your private link (don't share it): ${manageUrl}`,
    "",
    d.conditions ? `CONDITIONS OF USE (version ${d.conditions.version})\n${d.conditions.content}` : "",
  ].join("\n");

  await sendEmail({
    kind: "booking_confirmation",
    to: d.contactEmail,
    subject: `${opts.isChange ? "Booking changed" : "Booking confirmed"}: ${d.reference}`,
    html,
    text,
    bookingId: d.bookingId,
    replyTo: d.replyTo,
  });
}

export async function sendBookingCancelled(d: BookingEmailData, by: "customer" | "staff") {
  const intro =
    by === "customer"
      ? "As requested, your booking has been cancelled."
      : "Your booking has been cancelled by the Alpine Community Bus team. If you weren't expecting this, please get in touch.";
  const rows: Array<[string, string]> = [
    ["Reference", d.reference],
    ["Was picking up", d.pickupText],
    ["Was returning", d.returnText],
  ];
  const html = layout(
    `Booking cancelled: ${d.reference}`,
    `<h1 style="font-size:22px;margin:0 0 8px;color:${NAVY};">Booking cancelled</h1>
     <p style="margin:0 0 8px;">Hi ${esc(d.contactName)},</p>
     <p style="margin:0;">${esc(intro)}</p>
     ${detailRows(rows)}
     <p style="margin:0;">The bus is now free for others on these dates. You're welcome to book again any time.</p>
     ${button(`${SITE_URL}/book`, "Make a new booking")}`,
  );
  const text = [`BOOKING CANCELLED`, "", `Hi ${d.contactName},`, intro, "", textRows(rows), "", `Make a new booking: ${SITE_URL}/book`].join("\n");
  await sendEmail({
    kind: "booking_cancelled",
    to: d.contactEmail,
    subject: `Booking cancelled: ${d.reference}`,
    html,
    text,
    bookingId: d.bookingId,
    replyTo: d.replyTo,
  });
}

export async function sendAdminCancellationNotice(to: string, d: BookingEmailData, adminUrl: string) {
  const rows = bookingRows(d);
  const html = layout(
    `Customer cancelled ${d.reference}`,
    `<h1 style="font-size:20px;margin:0 0 8px;color:${NAVY};">A customer cancelled their booking</h1>
     <p style="margin:0;">Cancelled online using the manage link. If a payment was taken, process any refund manually.</p>
     ${detailRows(rows)}
     ${button(adminUrl, "Open in admin")}`,
  );
  const text = [`A customer cancelled their booking.`, "If a payment was taken, process any refund manually.", "", textRows(rows), "", adminUrl].join("\n");
  await sendEmail({ kind: "admin_cancel_notice", to, subject: `Cancelled by customer: ${d.reference}`, html, text, bookingId: d.bookingId });
}

// ── Staff ───────────────────────────────────────────────────

export async function sendStaffInvite({
  to,
  name,
  loginUrl,
  authAccountExists = false,
}: {
  to: string;
  name: string;
  loginUrl: string;
  authAccountExists?: boolean;
}) {
  const subject = authAccountExists
    ? "Your Alpine Community Bus staff account is ready"
    : "You've been invited to the Alpine Community Bus staff portal";
  const body = authAccountExists
    ? `<p>Hi ${esc(name)},</p>
       <p>You've been added as a staff member on the ${esc(SITE_NAME)} portal.</p>
       <p>Your login uses this email address: <strong>${esc(to)}</strong></p>
       <p>To get started, open the login page and choose <strong>Forgot password?</strong> to set your own password.</p>
       ${button(loginUrl, "Go to login")}`
    : `<p>Hi ${esc(name)},</p>
       <p>You've been invited as a staff member on the ${esc(SITE_NAME)} portal.</p>
       <p>Create your account using this email address: <strong>${esc(to)}</strong></p>
       ${button(`${loginUrl}?mode=signup`, "Create your account")}`;
  const text = authAccountExists
    ? `Hi ${name},\n\nYou've been added as a staff member on the ${SITE_NAME} portal.\nYour login uses this email address: ${to}\nOpen ${loginUrl} and choose "Forgot password?" to set your password.`
    : `Hi ${name},\n\nYou've been invited as a staff member on the ${SITE_NAME} portal.\nCreate your account with this email address (${to}) at ${loginUrl}?mode=signup`;
  await sendEmail({ kind: "staff_invite", to, subject, html: layout(subject, body), text });
}
