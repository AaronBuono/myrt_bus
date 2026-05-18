import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendStaffInvite({
  to,
  name,
  loginUrl,
}: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  const fromAddress =
    process.env.EMAIL_FROM ?? "noreply@myrtlefordcommunitybus.com.au";

  const signupUrl = `${loginUrl}?mode=signup`;

  await resend.emails.send({
    from: fromAddress,
    to,
    subject: "You've been invited to the Myrtleford Lions Club Bus Portal",
    html: `
      <p>Hi ${name},</p>
      <p>You've been invited as a staff member on the Myrtleford Lions Club Community Bus Portal.</p>
      <p>Click the button below to create your account using this email address: <strong>${to}</strong></p>
      <p><a href="${signupUrl}" style="display:inline-block;padding:10px 20px;background:#002868;color:#fff;text-decoration:none;border-radius:4px;">Create your account</a></p>
      <p>If you already have an account with this email, <a href="${loginUrl}">sign in here</a> and your access will be granted automatically.</p>
      <p>Myrtleford Lions Club Community Bus</p>
    `,
  });
}

export async function sendBookingConfirmation({
  to,
  bookerName,
  reference,
  startDate,
  endDate,
  destination,
  amountDue,
  category,
  isInvoicedOrg,
}: {
  to: string;
  bookerName: string;
  reference: string;
  startDate: string;
  endDate: string;
  destination: string;
  amountDue: number;
  category: "a" | "c";
  isInvoicedOrg: boolean;
}) {
  const fromAddress =
    process.env.EMAIL_FROM ?? "noreply@myrtlefordcommunitybus.com.au";

  let paymentLine: string;
  if (category === "c") {
    paymentLine = "No payment required.";
  } else if (isInvoicedOrg) {
    paymentLine = "Your organisation will be invoiced. No payment required at WAW.";
  } else {
    paymentLine = `Amount due at WAW Credit Union: $${amountDue.toFixed(2)} — bring this confirmation and your driver's licence.`;
  }

  await resend.emails.send({
    from: fromAddress,
    to,
    subject: `Booking confirmed — ${reference}`,
    html: `
      <p>Hi ${bookerName},</p>
      <p>Your booking has been confirmed.</p>
      <p><strong>Reference:</strong> ${reference}<br>
         <strong>Dates:</strong> ${startDate} to ${endDate}<br>
         <strong>Destination:</strong> ${destination}</p>
      <p>${paymentLine}</p>
      <p>Myrtleford Lions Club Community Bus</p>
    `,
  });
}
