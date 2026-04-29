"use client";

import Link from "next/link";
import type { BookingResult } from "./BookingWizard";

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

export default function Step3Confirmed({ result }: { result: BookingResult }) {
  const { reference, amountDue, category, isInvoicedOrg, startDate, endDate, destination, zoneName } = result;

  const paymentMessage = (() => {
    if (category === "c") return { text: "No payment required.", style: "text-green-700" };
    if (isInvoicedOrg) return { text: "Your organisation will be invoiced. No payment required at WAW.", style: "text-brand-blue" };
    return { text: `Amount due at WAW Credit Union: $${amountDue} — bring this confirmation and your driver's licence.`, style: "text-brand-blue" };
  })();

  return (
    <div className="space-y-6">
      {/* Confirmation banner */}
      <div className="card text-center py-8">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Booking Confirmed</h1>
        <p className="text-[#5E6470] text-sm mb-4">A confirmation has been sent to your email address.</p>
        <div className="inline-block bg-brand-blue text-white text-xl font-bold px-6 py-3 rounded-xl tracking-wider">
          {reference}
        </div>
      </div>

      {/* Payment notice */}
      <div className="card">
        <p className={`text-sm font-semibold ${paymentMessage.style}`}>{paymentMessage.text}</p>
      </div>

      {/* Booking summary */}
      <div className="card space-y-2">
        <p className="text-xs font-bold text-[#5E6470] uppercase tracking-wide mb-3">Booking summary</p>
        <Row label="Dates" value={startDate === endDate ? fmtDate(startDate) : `${fmtDate(startDate)} – ${fmtDate(endDate)}`} />
        <Row label="Destination zone" value={zoneName} />
        <Row label="Destination" value={destination} />
      </div>

      {/* What happens next */}
      <div className="card">
        <p className="text-sm font-bold text-[#1A1A1A] mb-4">What happens next</p>
        <div className="space-y-3">
          {[
            "Check your email — save or print your confirmation before your trip.",
            "Go to WAW Credit Union, Myrtleford — bring your confirmation and driver's licence.",
            "Pay and collect the keys — WAW will go through a short checklist with you.",
            "Return the bus and keys to WAW — ensure it is clean and the tank is full.",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-sm text-[#5E6470] leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>

      {/* QR reminder */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">📸 QR code reminder</p>
        <p className="text-sm text-amber-700">Before you drive away, scan the QR code on the sticker inside the bus to record the fuel level and odometer reading. Do the same when you return, before handing the keys back to WAW.</p>
      </div>

      <Link href="/" className="btn-secondary w-full py-3 text-center block">
        Back to home
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm border-b border-[#F0F1F4] pb-2 last:border-0 last:pb-0">
      <span className="text-[#5E6470]">{label}</span>
      <span className="font-semibold text-[#1A1A1A]">{value}</span>
    </div>
  );
}
