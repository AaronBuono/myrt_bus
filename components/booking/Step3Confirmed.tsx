"use client";

import type { BookingResult } from "./BookingWizard";
import { fmtIsoDateLong, fmtWallTime } from "@/lib/time";

export default function Step3Confirmed({ result }: { result: BookingResult }) {
  const { reference, amountDue, category, isInvoicedOrg, startDate, endDate, pickupTime, returnTime, destination, zoneName, contactEmail } = result;

  const paymentMessage = (() => {
    if (category === "c") return { text: "No payment required.", color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" };
    if (isInvoicedOrg) return { text: "Your organisation will be invoiced. No payment is needed at pickup.", color: "var(--navy)", bg: "var(--navy-tint)", border: "#C0CFE8" };
    return { text: `Amount due at pickup: $${amountDue}. Bring your confirmation email and the driver's licence.`, color: "var(--navy)", bg: "var(--navy-tint)", border: "#C0CFE8" };
  })();

  const nextSteps = [
    `Check your email. We've sent your confirmation to ${contactEmail}. It has a private link to change or cancel.`,
    "Pick up the key at WAW Credit Union, Myrtleford. Bring the driver's licence.",
    "Return the bus and key to WAW with a full tank and a clean bus.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Success banner */}
      <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Booking confirmed</h1>
        <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 24 }}>Your booking reference is</p>
        <div style={{ display: "inline-block", background: "var(--navy)", color: "#fff", fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 700, padding: "14px 32px", borderRadius: 12, letterSpacing: "0.12em" }}>
          {reference}
        </div>
      </div>

      {/* Payment notice */}
      <div style={{ background: paymentMessage.bg, border: `1px solid ${paymentMessage.border}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: paymentMessage.color }}>{paymentMessage.text}</p>
      </div>

      {/* Booking summary */}
      <div className="card">
        <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Booking summary</h2>
        {[
          { label: "Pick up", value: `${fmtIsoDateLong(startDate)}, ${fmtWallTime(pickupTime)}` },
          { label: "Return", value: `${fmtIsoDateLong(endDate)}, ${fmtWallTime(returnTime)}` },
          { label: "Destination", value: `${destination} (${zoneName})` },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-light)", padding: "12px 0", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, color: "var(--muted)", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* What happens next */}
      <div className="card">
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 18 }}>What happens next</h2>
        <ol style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {nextSteps.map((step, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--navy)", color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <p style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.6 }}>{step}</p>
            </li>
          ))}
        </ol>
      </div>

      <a href="/" className="btn-secondary" style={{ textAlign: "center", display: "block", minHeight: 52, lineHeight: "52px", padding: "0 24px" }}>
        ← Back to home
      </a>
    </div>
  );
}
