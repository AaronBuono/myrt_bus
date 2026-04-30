"use client";

import type { BookingResult } from "./BookingWizard";

function fmtFull(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export default function Step3Confirmed({ result }: { result: BookingResult }) {
  const { reference, amountDue, category, isInvoicedOrg, startDate, endDate, destination, zoneName } = result;

  const paymentMessage = (() => {
    if (category === "c") return { text: "No payment required.", color: "#166534", bg: "#F0FDF4", border: "#BBF7D0" };
    if (isInvoicedOrg) return { text: "Your organisation will be invoiced. No payment required at WAW.", color: "var(--navy)", bg: "var(--navy-tint)", border: "#C0CFE8" };
    return { text: `Amount due at WAW Credit Union: $${amountDue} — bring this confirmation and your driver's licence.`, color: "var(--navy)", bg: "var(--navy-tint)", border: "#C0CFE8" };
  })();

  const nextSteps = [
    "Check your email — save or print your confirmation before your trip.",
    "Go to WAW Credit Union, Myrtleford — bring your confirmation and driver's licence.",
    "Pay and collect the keys — WAW will go through a short checklist with you.",
    "Return the bus and keys to WAW — ensure it is clean and the tank is full.",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Success banner */}
      <div className="card" style={{ textAlign: "center", padding: "48px 32px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F0FDF4", border: "2px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Booking Confirmed</h1>
        <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 24 }}>A confirmation has been sent to your email address.</p>
        <div style={{ display: "inline-block", background: "var(--navy)", color: "#fff", fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, padding: "14px 36px", borderRadius: 12, letterSpacing: "0.12em" }}>
          {reference}
        </div>
      </div>

      {/* Payment notice */}
      <div style={{ background: paymentMessage.bg, border: `1px solid ${paymentMessage.border}`, borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: paymentMessage.color }}>{paymentMessage.text}</p>
      </div>

      {/* Booking summary */}
      <div className="card">
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted-light)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>Booking Summary</p>
        {[
          { label: "Dates", value: startDate === endDate ? fmtFull(startDate) : `${fmtFull(startDate)} – ${fmtFull(endDate)}` },
          { label: "Destination zone", value: zoneName },
          { label: "Destination", value: destination },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid var(--border-light)", padding: "10px 0", gap: 16 }}>
            <span style={{ fontSize: 14, color: "var(--muted)", flexShrink: 0 }}>{label}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", textAlign: "right" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* What happens next */}
      <div className="card">
        <p style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--text)", marginBottom: 18 }}>What happens next</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {nextSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--navy)", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
              <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR reminder */}
      <div style={{ background: "var(--gold-light)", border: "1px solid #DDB96A", borderRadius: 12, padding: "16px 20px" }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#7C5A0A", marginBottom: 6 }}>QR code reminder</p>
        <p style={{ fontSize: 13, color: "#8B6612", lineHeight: 1.6 }}>Before you drive away, scan the QR code on the sticker inside the bus to record the fuel level and odometer reading. Do the same when you return, before handing the keys back to WAW.</p>
      </div>

      <a href="/" className="btn-secondary" style={{ textAlign: "center", display: "block", minHeight: 52, lineHeight: "52px", padding: "0 24px" }}>
        ← Back to home
      </a>
    </div>
  );
}
