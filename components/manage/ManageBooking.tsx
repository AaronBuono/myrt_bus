"use client";

import { useState } from "react";
import Link from "next/link";
import type { ManageableBooking } from "@/lib/queries/booking";
import DateRangePicker from "@/components/booking/DateRangePicker";
import TimeSelect from "@/components/booking/TimeSelect";
import { periodSchema, fieldErrors } from "@/lib/validation/booking";
import { fmtDateTime, fmtIsoDateLong, fmtWallTime, daysInclusive } from "@/lib/time";

type View = "overview" | "change" | "confirm-cancel" | "cancelled" | "changed";

interface Props {
  token: string;
  booking: ManageableBooking;
  unavailableDates: string[];
  lockedReason: string | null;
  contactEmail: string | null;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--border-light)", flexWrap: "wrap" }}>
      <span style={{ fontSize: 15, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", textAlign: "right" }}>{value}</span>
    </div>
  );
}

export default function ManageBooking({ token, booking, unavailableDates, lockedReason, contactEmail }: Props) {
  const [view, setView] = useState<View>("overview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change-dates state, starting from the current booking
  const [selectedDates, setSelectedDates] = useState<string[]>(() => {
    const out: string[] = [];
    const n = daysInclusive(booking.startDate, booking.endDate);
    const [y, m, d] = booking.startDate.split("-").map(Number);
    for (let i = 0; i < n; i++) {
      const dt = new Date(y, m - 1, d + i);
      out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`);
    }
    return out;
  });
  const [pickupTime, setPickupTime] = useState(booking.pickupTime);
  const [returnTime, setReturnTime] = useState(booking.returnTime);
  const [newRef, setNewRef] = useState<string | null>(null);

  const sorted = [...selectedDates].sort();
  const startDate = sorted[0];
  const endDate = sorted[sorted.length - 1];
  const days = selectedDates.length;
  const newAmount = booking.category === "c" ? 0 : booking.ratePerDay * days;

  const contactLine = contactEmail ? (
    <>Please contact us at <a href={`mailto:${contactEmail}`} style={{ color: "var(--navy)", fontWeight: 600 }}>{contactEmail}</a>.</>
  ) : (
    <>Please contact the Alpine Community Bus team.</>
  );

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manage/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return null;
      }
      return data;
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function confirmChange() {
    const payload = { startDate, endDate, pickupTime, returnTime };
    const parsed = periodSchema.safeParse(payload);
    if (!parsed.success) {
      setError(Object.values(fieldErrors(parsed.error))[0] ?? "Please check the new dates and times.");
      return;
    }
    const data = await post({ action: "modify", ...payload });
    if (data) {
      setNewRef(data.reference);
      setView("changed");
    }
  }

  async function confirmCancel() {
    const data = await post({ action: "cancel" });
    if (data) setView("cancelled");
  }

  const errorBox = error && (
    <div role="alert" style={{ background: "#FEF0EE", border: "1px solid #F5C6C0", borderRadius: 12, padding: "16px 20px" }}>
      <p style={{ fontSize: 16, fontWeight: 600, color: "#B91C1C" }}>{error}</p>
    </div>
  );

  if (view === "cancelled") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Booking cancelled</h2>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7 }}>
          {`${booking.reference} has been cancelled and we've emailed you a confirmation. This link no longer works.`}
        </p>
        <Link href="/book" className="btn-primary btn-lg" style={{ display: "inline-block", marginTop: 24 }}>Make a new booking</Link>
      </div>
    );
  }

  if (view === "changed") {
    return (
      <div className="card" style={{ textAlign: "center", padding: "48px 24px", maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 26, fontWeight: 700, marginBottom: 12 }}>Dates changed</h2>
        <p style={{ fontSize: 16, color: "var(--muted)", marginBottom: 20 }}>Your new booking reference is</p>
        <div style={{ display: "inline-block", background: "var(--navy)", color: "#fff", fontSize: 26, fontWeight: 700, padding: "14px 32px", borderRadius: 12, letterSpacing: "0.12em" }}>
          {newRef}
        </div>
        <p style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.7, marginTop: 24 }}>
          {fmtIsoDateLong(startDate)}, {fmtWallTime(pickupTime)} → {fmtIsoDateLong(endDate)}, {fmtWallTime(returnTime)}
        </p>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, marginTop: 12 }}>
          We&apos;ve emailed a new confirmation with a new link. Your old reference ({booking.reference}) and this link no longer work.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: view === "change" ? 900 : 640, margin: "0 auto" }}>
      {/* Current booking */}
      <div className="card">
        <p style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Your booking</p>
        <p style={{ fontSize: 26, fontWeight: 700, color: "var(--navy)", letterSpacing: "0.08em", margin: "4px 0 8px" }}>{booking.reference}</p>
        <SummaryRow label="Name" value={booking.contactName} />
        <SummaryRow label="Pick up" value={fmtDateTime(booking.pickupAt)} />
        <SummaryRow label="Return" value={fmtDateTime(booking.returnAt)} />
        <SummaryRow label="Destination" value={`${booking.destination} (${booking.zoneName})`} />
      </div>

      {lockedReason && (
        <div style={{ background: "var(--gold-light)", border: "1px solid #DDB96A", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 16, color: "#7C5A0A", lineHeight: 1.6 }}>{lockedReason} {contactLine}</p>
        </div>
      )}

      {!lockedReason && view === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <button type="button" className="btn-primary btn-lg" onClick={() => { setError(null); setView("change"); }}>Change dates</button>
          <button type="button" className="btn-secondary" style={{ minHeight: 52, color: "#B91C1C", borderColor: "#F5C6C0" }} onClick={() => { setError(null); setView("confirm-cancel"); }}>
            Cancel booking
          </button>
        </div>
      )}

      {!lockedReason && view === "confirm-cancel" && (
        <div className="card" style={{ borderColor: "#F5C6C0" }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Cancel this booking?</h2>
          <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
            This can&apos;t be undone. The bus will be released for others to book, and this link will stop working.
          </p>
          {errorBox}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: error ? 16 : 0 }}>
            <button type="button" disabled={busy} onClick={confirmCancel} className="btn-primary btn-lg" style={{ background: "#B91C1C" }}>
              {busy ? "Cancelling…" : "Yes, cancel my booking"}
            </button>
            <button type="button" disabled={busy} onClick={() => setView("overview")} className="btn-secondary" style={{ minHeight: 52 }}>
              No, keep my booking
            </button>
          </div>
        </div>
      )}

      {!lockedReason && view === "change" && (
        <>
          <div style={{ background: "var(--navy-tint)", border: "1px solid #C0CFE8", borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 16, color: "var(--navy)", lineHeight: 1.6 }}>
              Pick your new dates below. You&apos;ll get a <strong>new booking reference</strong> and a new confirmation email.
              Your current reference and this link will stop working.
            </p>
          </div>
          <DateRangePicker unavailableDates={unavailableDates} selectedDates={selectedDates} setSelectedDates={setSelectedDates} />
          <div className="card">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
              <div>
                <label htmlFor="pickupTime" className="field-label">Pick-up time{startDate ? `, ${fmtIsoDateLong(startDate)}` : ""}</label>
                <TimeSelect id="pickupTime" value={pickupTime} onChange={setPickupTime} />
              </div>
              <div>
                <label htmlFor="returnTime" className="field-label">Return time{endDate ? `, ${fmtIsoDateLong(endDate)}` : ""}</label>
                <TimeSelect id="returnTime" value={returnTime} onChange={setReturnTime} />
              </div>
            </div>
            {days > 0 && (
              <p style={{ fontSize: 15, color: "var(--muted)", marginTop: 16 }}>
                {days} day{days !== 1 ? "s" : ""}.{" "}
                {booking.category === "c"
                  ? "No charge."
                  : booking.isInvoicedOrg
                    ? "Your organisation will be invoiced."
                    : <>Amount due at pickup: <strong style={{ color: "var(--navy)" }}>${newAmount}</strong></>}
              </p>
            )}
          </div>
          {errorBox}
          <div style={{ display: "flex", gap: 12 }}>
            <button type="button" disabled={busy} onClick={() => setView("overview")} className="btn-secondary" style={{ flex: 1, minHeight: 52 }}>← Back</button>
            <button type="button" disabled={busy || days === 0} onClick={confirmChange} className="btn-primary btn-lg" style={{ flex: 2 }}>
              {busy ? "Saving…" : "Confirm new dates"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
