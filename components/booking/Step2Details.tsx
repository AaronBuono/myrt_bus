"use client";

import { useState, useRef } from "react";
import type { PricingZone } from "@/lib/queries/home";
import type { BookingResult } from "./BookingWizard";

interface Props {
  selectedDates: string[];
  zoneId: string;
  zones: PricingZone[];
  additionalDayRate: number;
  conditionsText: string;
  onBack: () => void;
  onConfirmed: (result: BookingResult) => void;
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
      {options.map((t) => <option key={t} value={t}>{fmt12h(t)}</option>)}
    </select>
  );
}

function fmt12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export default function Step2Details({
  selectedDates, zoneId, zones, additionalDayRate, conditionsText, onBack, onConfirmed,
}: Props) {
  const sortedDates = [...selectedDates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  const zone = zones.find((z) => z.id === zoneId);

  // Section A
  const [bookerName, setBookerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [categoryHint, setCategoryHint] = useState<string | null>(null);

  // Section B
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [licenceDay, setLicenceDay] = useState("");
  const [licenceMonth, setLicenceMonth] = useState("");
  const [licenceYear, setLicenceYear] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Section C
  const [pickupTime, setPickupTime] = useState("");
  const [dropoffTime, setDropoffTime] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [passengerCount, setPassengerCount] = useState("");

  // Conditions
  const [conditionsAccepted, setConditionsAccepted] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Lookup org on name blur
  async function handleNameBlur() {
    if (!bookerName.trim()) return;
    const res = await fetch(`/api/bookings/lookup?name=${encodeURIComponent(bookerName)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.category === "c") setCategoryHint("Lions Club — No Charge");
      else setCategoryHint(`Community Rate — $${data.amountDue} due at WAW`);
    } else {
      const days = selectedDates.length;
      const est = zone ? zone.ratePerDay + Math.max(0, days - 1) * additionalDayRate : 0;
      setCategoryHint(`Community Rate — $${est} due at WAW`);
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
          selectedDates, zoneId,
          bookerName, contactPerson, contactPhone, bookerEmail,
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

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const years = Array.from({ length: 20 }, (_, i) => String(new Date().getFullYear() + i));

  return (
    <div className="space-y-6">
      {/* Booking summary strip */}
      <div className="bg-[#EEF2FF] border border-[#C7D4F0] rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm">
          <span className="font-semibold text-brand-blue">{fmtDate(startDate)}</span>
          {endDate !== startDate && <span className="text-[#5E6470]"> → <span className="font-semibold text-brand-blue">{fmtDate(endDate)}</span></span>}
        </div>
        <div className="text-sm font-semibold text-brand-blue">{zone?.zoneName}</div>
      </div>

      {/* Section A */}
      <div className="card space-y-4">
        <div className="section-header">
          <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Section A — Organisation or Your Name</p>
        </div>
        <div>
          <label className="form-label">Organisation or individual name *</label>
          <input className="form-input" value={bookerName} onChange={(e) => setBookerName(e.target.value)} onBlur={handleNameBlur} placeholder="e.g. Myrtleford Lions" />
          {categoryHint && <p className="text-xs text-brand-blue font-semibold mt-1">✓ {categoryHint}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Contact person *</label>
            <input className="form-input" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <label className="form-label">Contact phone *</label>
            <input className="form-input" type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="Mobile preferred" />
          </div>
        </div>
        <div>
          <label className="form-label">Email address *</label>
          <input className="form-input" type="email" value={bookerEmail} onChange={(e) => setBookerEmail(e.target.value)} placeholder="Confirmation sent here" />
        </div>
      </div>

      {/* Section B */}
      <div className="card space-y-4">
        <div className="section-header">
          <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Section B — Driver Details</p>
        </div>
        <p className="text-xs text-[#5E6470]">A standard Victorian car licence is sufficient for this vehicle.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Driver's full name *</label>
            <input className="form-input" value={driverName} onChange={(e) => setDriverName(e.target.value)} />
          </div>
          <div>
            <label className="form-label">Driver's mobile *</label>
            <input className="form-input" type="tel" value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="form-label">Licence number *</label>
          <input className="form-input" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Licence expiry *</label>
          <div className="grid grid-cols-3 gap-2">
            <select className="form-input" value={licenceDay} onChange={(e) => setLicenceDay(e.target.value)}>
              <option value="">Day</option>
              {days.map((d) => <option key={d} value={d}>{d}</option>)}
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
        </div>
        <div>
          <label className="form-label">Home address *</label>
          <input className="form-input" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-blue" />
          <span className="text-sm text-[#1A1A1A]">I confirm the driver is 21 years of age or older *</span>
        </label>
      </div>

      {/* Section C */}
      <div className="card space-y-4">
        <div className="section-header">
          <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Section C — Trip Details</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="form-label">Pick-up time — {fmtDate(startDate)} *</label>
            <TimeSelect id="pickup" value={pickupTime} onChange={setPickupTime} />
          </div>
          <div>
            <label className="form-label">Drop-off time — {fmtDate(endDate)} *</label>
            <TimeSelect id="dropoff" value={dropoffTime} onChange={setDropoffTime} />
          </div>
        </div>
        <div>
          <label className="form-label">Destination *</label>
          <input className="form-input" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="City or venue name" />
        </div>
        <div>
          <label className="form-label">Purpose of trip</label>
          <input className="form-input" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <label className="form-label">Number of passengers (including driver)</label>
          <input className="form-input" type="number" min={1} max={12} value={passengerCount} onChange={(e) => setPassengerCount(e.target.value)} placeholder="Maximum 12" />
        </div>
      </div>

      {/* Conditions of Use */}
      <div className="card space-y-3">
        <div className="section-header">
          <p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Conditions of Use</p>
        </div>
        <div className="h-48 overflow-y-auto bg-[#F8F9FC] rounded-lg p-4 text-xs text-[#5E6470] leading-relaxed whitespace-pre-line border border-[#DDE1EA]">
          {conditionsText}
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={conditionsAccepted} onChange={(e) => setConditionsAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-brand-blue" />
          <span className="text-sm text-[#1A1A1A] font-medium">I have read and agree to the Conditions of Use *</span>
        </label>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
          {errors.map((e, i) => <p key={i} className="text-sm text-red-700">• {e}</p>)}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="btn-secondary flex-1 py-3">← Back</button>
        <button onClick={handleSubmit} disabled={submitting} className="btn-primary flex-2 py-3 px-8">
          {submitting ? "Submitting…" : "Submit Booking"}
        </button>
      </div>
    </div>
  );
}
