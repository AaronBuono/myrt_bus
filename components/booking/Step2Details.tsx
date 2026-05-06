"use client";

import { useState } from "react";
import React from "react";
import type { PricingZone } from "@/lib/queries/home";
import type { BookingResult } from "./BookingWizard";
import { fmtDateLong } from "./Calendar";

function fmt12hTime(t: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function TimeSelect({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="form-input">
      <option value="">Select time</option>
      {options.map((t) => <option key={t} value={t}>{fmt12hTime(t)}</option>)}
    </select>
  );
}

function SectionHeader({ letter, title }: { letter: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
      <div style={{
        width: 34, height: 34, borderRadius: "50%", background: "var(--navy)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 15, flexShrink: 0,
      }}>{letter}</div>
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 1 }}>Section {letter}</p>
        <p style={{ fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--text)" }}>{title}</p>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">
        {label}{required && <span style={{ color: "var(--gold)", marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

interface Props {
  selectedDates: string[];
  zoneId: string;
  zones: PricingZone[];
  conditionsText: string;
  onBack: () => void;
  onConfirmed: (result: BookingResult) => void;
}

export default function Step2Details({
  selectedDates, zoneId, zones, conditionsText, onBack, onConfirmed,
}: Props) {
  const sortedDates = [...selectedDates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  const zone = zones.find((z) => z.id === zoneId);

  const [bookerName, setBookerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [categoryHint, setCategoryHint] = useState<string | null>(null);

  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [licenceDay, setLicenceDay] = useState("");
  const [licenceMonth, setLicenceMonth] = useState("");
  const [licenceYear, setLicenceYear] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [passengerCount, setPassengerCount] = useState("");

  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function handleNameBlur() {
    if (!bookerName.trim()) return;
    try {
      const res = await fetch(`/api/bookings/lookup?name=${encodeURIComponent(bookerName)}`);
      const data = await res.json();
      if (data.category === "c") {
        setCategoryHint("Lions Club — No Charge");
      } else {
        const days = selectedDates.length;
        const est = zone ? zone.ratePerDay * days : 0;
        setCategoryHint(`Community Rate — $${est} due at WAW`);
      }
    } catch {
      // ignore lookup errors
    }
  }

  async function handleSubmit() {
    const errs: string[] = [];
    if (!bookerName) errs.push("Organisation or name is required");
    if (!contactPerson) errs.push("Contact person is required");
    if (!contactPhone) errs.push("Contact phone is required");
    if (!bookerEmail) errs.push("Email address is required");
    if (!driverName) errs.push("Driver's full name is required");
    if (!driverMobile) errs.push("Driver's mobile is required");
    if (!licenceNumber) errs.push("Driver's licence number is required");
    if (!licenceDay || !licenceMonth || !licenceYear) errs.push("Licence expiry date is required");
    if (!homeAddress) errs.push("Driver's home address is required");
    if (!ageConfirmed) errs.push("You must confirm the driver is 21 or older");
    if (!pickupTime) errs.push("Pick-up time is required");
    if (!dropoffTime) errs.push("Drop-off time is required");
    if (!destination) errs.push("Destination is required");
    if (!conditionsAccepted) errs.push("You must accept the Conditions of Use");
    if (passengerCount && Number(passengerCount) > 12) errs.push("Maximum 12 passengers including the driver");
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setSubmitting(true);
    const licenceExpiry = `${licenceYear}-${licenceMonth.padStart(2, "0")}-${licenceDay.padStart(2, "0")}`;
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedDates, zoneId, bookerName, contactPerson, contactPhone, bookerEmail,
          driverName, driverMobile, licenceNumber, licenceExpiry, homeAddress, ageConfirmed,
          pickupTime, dropoffTime, destination, purpose: purpose || null,
          passengerCount: passengerCount ? Number(passengerCount) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrors([data.error ?? "Something went wrong"]); return; }
      onConfirmed(data as BookingResult);
    } catch {
      setErrors(["Something went wrong. Please try again."]);
    } finally {
      setSubmitting(false);
    }
  }

  const days31 = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const years = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() + i));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Booking summary strip */}
      <div style={{ background: "var(--navy-tint)", border: "1px solid #C0CFE8", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 700, color: "var(--navy)" }}>{fmtDateLong(startDate)}</span>
          {endDate !== startDate && (
            <><span style={{ color: "var(--muted)" }}> → </span><span style={{ fontWeight: 700, color: "var(--navy)" }}>{fmtDateLong(endDate)}</span></>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--navy)", background: "#fff", borderRadius: 6, padding: "3px 10px", border: "1px solid #C0CFE8" }}>{zone?.zoneName}</div>
      </div>

      {/* Section A */}
      <div className="card">
        <SectionHeader letter="A" title="Organisation or Your Name" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Organisation or individual name" required>
            <input className="form-input" value={bookerName} onChange={(e) => setBookerName(e.target.value)} onBlur={handleNameBlur} placeholder="e.g. Myrtleford Lions Club" />
            {categoryHint && <p style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600, marginTop: 5 }}>✓ {categoryHint}</p>}
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Contact person" required>
              <input className="form-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Contact phone" required>
              <input className="form-input" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Mobile preferred" />
            </Field>
          </div>
          <Field label="Email address" required>
            <input className="form-input" type="email" value={bookerEmail} onChange={(e) => setBookerEmail(e.target.value)} placeholder="Confirmation will be sent here" />
          </Field>
        </div>
      </div>

      {/* Section B */}
      <div className="card">
        <SectionHeader letter="B" title="Driver Details" />
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16, marginTop: -8 }}>A standard Victorian car licence is sufficient for this vehicle.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Driver's full name" required>
              <input className="form-input" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </Field>
            <Field label="Driver's mobile" required>
              <input className="form-input" type="tel" value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} />
            </Field>
          </div>
          <Field label="Licence number" required>
            <input className="form-input" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} style={{ maxWidth: 280 }} />
          </Field>
          <Field label="Licence expiry" required>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 10, maxWidth: 360 }}>
              <select className="form-input" value={licenceDay} onChange={(e) => setLicenceDay(e.target.value)}>
                <option value="">Day</option>
                {days31.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="form-input" value={licenceMonth} onChange={(e) => setLicenceMonth(e.target.value)}>
                <option value="">Month</option>
                {months.map((m, i) => <option key={m} value={m}>{monthNames[i]}</option>)}
              </select>
              <select className="form-input" value={licenceYear} onChange={(e) => setLicenceYear(e.target.value)}>
                <option value="">Year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Home address" required>
            <input className="form-input" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />
          </Field>
          <label className="checkbox-label">
            <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className="form-checkbox" />
            <span>I confirm the driver is 21 years of age or older</span>
            <span style={{ color: "var(--gold)", marginLeft: 2 }}>*</span>
          </label>
        </div>
      </div>

      {/* Section C */}
      <div className="card">
        <SectionHeader letter="C" title="Trip Details" />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label={`Pick-up time — ${fmtDateLong(startDate)}`} required>
              <TimeSelect id="pickup" value={pickupTime} onChange={setPickupTime} />
            </Field>
            <Field label={`Drop-off time — ${fmtDateLong(endDate)}`} required>
              <TimeSelect id="dropoff" value={dropoffTime} onChange={setDropoffTime} />
            </Field>
          </div>
          <Field label="Destination" required>
            <input className="form-input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City or venue name" />
          </Field>
          <Field label="Purpose of trip">
            <input className="form-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Optional" />
          </Field>
          <Field label="Number of passengers (including driver)">
            <input className="form-input" type="number" min={1} max={12} value={passengerCount} onChange={(e) => setPassengerCount(e.target.value)} placeholder="Maximum 12" style={{ maxWidth: 140 }} />
          </Field>
        </div>
      </div>

      {/* Conditions of Use */}
      <div className="card">
        <SectionHeader letter="✓" title="Conditions of Use" />
        <div style={{ height: 200, overflowY: "auto", background: "var(--cream)", borderRadius: 8, padding: "16px 20px", fontSize: 13, color: "var(--muted)", lineHeight: 1.7, whiteSpace: "pre-line", border: "1px solid var(--border)", marginBottom: 16 }}>
          {conditionsText}
        </div>
        <label className="checkbox-label">
          <input type="checkbox" checked={conditionsAccepted} onChange={(e) => setConditionsAccepted(e.target.checked)} className="form-checkbox" />
          <span style={{ fontWeight: 600 }}>I have read and agree to the Conditions of Use</span>
          <span style={{ color: "var(--gold)", marginLeft: 2 }}>*</span>
        </label>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{ background: "#FEF0EE", border: "1px solid #F5C6C0", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", marginBottom: 8 }}>Please correct the following:</p>
          {errors.map((e, i) => <p key={i} style={{ fontSize: 13, color: "#B91C1C", marginBottom: 4 }}>· {e}</p>)}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={onBack} className="btn-secondary" style={{ flex: 1, minHeight: 52 }}>← Back</button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary btn-lg" style={{ flex: 2 }}>
          {submitting ? "Submitting…" : "Submit Booking"}
        </button>
      </div>
    </div>
  );
}
