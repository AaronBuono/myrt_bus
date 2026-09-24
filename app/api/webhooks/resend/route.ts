import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifySvixSignature } from "@/lib/webhook";

// Resend delivery webhooks (signed with Svix). Updates email_log so admins can see
// who never received their confirmation. Configure in Resend → Webhooks.

const STATUS_BY_EVENT: Record<string, string> = {
  "email.sent": "sent",
  "email.delivery_delayed": "delivery_delayed",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set; ignoring Resend webhook");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  const body = await req.text();

  if (!id || !timestamp || !signature || !verifySvixSignature({ secret, id, timestamp, signatureHeader: signature, body })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    type?: string;
    data?: { email_id?: string; bounce?: { message?: string }; failed?: { reason?: string } };
  };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = event.type ? STATUS_BY_EVENT[event.type] : undefined;
  const emailId = event.data?.email_id;
  if (!status || !emailId) return NextResponse.json({ ignored: true });

  const error = event.data?.bounce?.message ?? event.data?.failed?.reason ?? null;

  // Events can arrive out of order; never downgrade (e.g. a late "delivered" over "bounced").
  await sql`
    UPDATE email_log
    SET status = ${status}, error = COALESCE(${error}::text, error), updated_at = NOW()
    WHERE resend_email_id = ${emailId}
      AND (CASE ${status}::text WHEN 'sent' THEN 0 WHEN 'delivery_delayed' THEN 1 WHEN 'delivered' THEN 2 ELSE 3 END)
       >= (CASE status        WHEN 'sent' THEN 0 WHEN 'delivery_delayed' THEN 1 WHEN 'delivered' THEN 2 ELSE 3 END)
  `;

  return NextResponse.json({ ok: true });
}
