import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

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
  const fromAddress =
    process.env.EMAIL_FROM ?? "noreply@myrtlefordcommunitybus.com.au";

  if (authAccountExists) {
    // Account already created server-side — direct them to reset/set their password.
    await resend.emails.send({
      from: fromAddress,
      to,
      subject: "Your account is ready — set your password",
      html: `
        <p>Hi ${name},</p>
        <p>You've been added as a staff member on the Myrtleford Lions Club Community Bus Portal.</p>
        <p>Your login account has been created using this email address: <strong>${to}</strong></p>
        <p>To get started, visit the login page and click <strong>Forgot password?</strong> to set your own password.</p>
        <p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#002868;color:#fff;text-decoration:none;border-radius:4px;">Go to Login</a></p>
        <p>Myrtleford Lions Club Community Bus</p>
      `,
    });
  } else {
    // No auth account yet — direct them to self-register.
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
        <p>Myrtleford Lions Club Community Bus</p>
      `,
    });
  }
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
