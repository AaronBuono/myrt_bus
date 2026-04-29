import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is not set");
}

export const resend = new Resend(process.env.RESEND_API_KEY);

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
