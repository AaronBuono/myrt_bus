"use client";

import { useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import type { PricingZone } from "@/lib/queries/home";
import type { BookingResult, ConditionsInfo } from "./BookingWizard";
import { fmtDateLong } from "./Calendar";
import {
  bookingSchema,
  fieldErrors,
  LICENCE_STATES,
  LICENCE_STATE_LABELS,
  type BookingInput,
} from "@/lib/validation/booking";
import TimeSelect from "./TimeSelect";

function SectionHeader({ letter, title }: { letter: string; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", background: "var(--navy)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: 16, flexShrink: 0,
      }}>{letter}</div>
      <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{title}</h2>
    </div>
  );
}

function Field({ id, label, required, hint, error, children }: {
  id: string; label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div id={`field-${id}`}>
      <label htmlFor={id} className="field-label">
        {label}{required ? <span style={{ color: "var(--gold)", marginLeft: 3 }} aria-hidden>*</span> : <span style={{ color: "var(--muted)", fontWeight: 400 }}> (optional)</span>}
      </label>
      {hint && <p className="field-hint">{hint}</p>}
      {children}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

interface Props {
  selectedDates: string[];
  zoneId: string;
  zones: PricingZone[];
  initialConditions: ConditionsInfo;
  onBack: () => void;
  onConfirmed: (result: BookingResult) => void;
}

const FIELD_ORDER = [
  "organisation", "contactName", "contactMobile", "contactEmail", "contactAddress",
  "driverName", "driverMobile", "licenceState", "licenceNumber", "licenceExpiry", "driverAddress", "ageConfirmed",
  "pickupTime", "returnTime", "destination", "conditionsAccepted",
];

export default function Step2Details({
  selectedDates, zoneId, zones, initialConditions, onBack, onConfirmed,
}: Props) {
  const router = useRouter();
  const sortedDates = [...selectedDates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  const zone = zones.find((z) => z.id === zoneId);

  const [conditions, setConditions] = useState(initialConditions);

  // Section A — you
  const [organisation, setOrganisation] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactMobile, setContactMobile] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactAddress, setContactAddress] = useState("");
  const [categoryHint, setCategoryHint] = useState<string | null>(null);

  // Section B — driver
  const [driverName, setDriverName] = useState("");
  const [driverMobile, setDriverMobile] = useState("");
  const [licenceState, setLicenceState] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [licenceDay, setLicenceDay] = useState("");
  const [licenceMonth, setLicenceMonth] = useState("");
  const [licenceYear, setLicenceYear] = useState("");
  const [driverAddress, setDriverAddress] = useState("");
  const [sameAddress, setSameAddress] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Section C — trip
  const [pickupTime, setPickupTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [destination, setDestination] = useState("");

  const [conditionsAccepted, setConditionsAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [datesTaken, setDatesTaken] = useState(false);

  const effectiveDriverAddress = sameAddress ? contactAddress : driverAddress;

  async function handleOrganisationBlur() {
    if (!organisation.trim()) { setCategoryHint(null); return; }
    try {
      const res = await fetch(`/api/bookings/lookup?name=${encodeURIComponent(organisation)}`);
      const data = await res.json();
      if (data.category === "c") setCategoryHint("No charge for this organisation");
      else if (data.isInvoicedOrg) setCategoryHint("Your organisation will be invoiced");
      else setCategoryHint(null);
    } catch {
      // ignore lookup errors
    }
  }

  function toggleSameAddress(checked: boolean) {
    setSameAddress(checked);
    // Copy rather than link: both addresses are stored, and unticking leaves an editable copy.
    if (checked) setDriverAddress(contactAddress);
  }

  function buildPayload(): BookingInput {
    const licenceExpiry = licenceDay && licenceMonth && licenceYear
      ? `${licenceYear}-${licenceMonth}-${licenceDay.padStart(2, "0")}`
      : "";
    return {
      startDate, endDate, pickupTime, returnTime, zoneId, destination,
      organisation, contactName, contactMobile, contactEmail, contactAddress,
      driverName, driverMobile, driverAddress: effectiveDriverAddress,
      licenceNumber, licenceState: licenceState as BookingInput["licenceState"], licenceExpiry,
      ageConfirmed: ageConfirmed as true,
      conditionsAccepted: conditionsAccepted as true,
      conditionsVersionId: conditions.id,
    };
  }

  function showErrors(errs: Record<string, string>) {
    setErrors(errs);
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (first) document.getElementById(`field-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setDatesTaken(false);

    const payload = buildPayload();
    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      showErrors(fieldErrors(parsed.error));
      setFormError("Please check the highlighted fields.");
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        if (data.fieldErrors) showErrors(data.fieldErrors);
        if (data.code === "conditions_changed" && data.conditions) {
          setConditions(data.conditions);
          setConditionsAccepted(false);
          document.getElementById("field-conditionsAccepted")?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (data.code === "unavailable") setDatesTaken(true);
        return;
      }
      onConfirmed(data as BookingResult);
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const days31 = Array.from({ length: 31 }, (_, i) => String(i + 1));
  const months = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));

  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Booking summary strip */}
      <div style={{ background: "var(--navy-tint)", border: "1px solid #C0CFE8", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 16 }}>
          <span style={{ fontWeight: 700, color: "var(--navy)" }}>{fmtDateLong(startDate)}</span>
          {endDate !== startDate && (
            <><span style={{ color: "var(--muted)" }}> → </span><span style={{ fontWeight: 700, color: "var(--navy)" }}>{fmtDateLong(endDate)}</span></>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--navy)", background: "#fff", borderRadius: 6, padding: "3px 10px", border: "1px solid #C0CFE8" }}>{zone?.zoneName}</div>
      </div>

      {/* Section A */}
      <div className="card">
        <SectionHeader letter="A" title="Your details" />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Field id="organisation" label="Organisation or group" hint="Leave blank if you're booking as an individual." error={errors.organisation}>
            <input id="organisation" className="form-input form-input-lg" value={organisation} onChange={(e) => setOrganisation(e.target.value)} onBlur={handleOrganisationBlur} autoComplete="organization" placeholder="e.g. Myrtleford Senior Citizens" />
            {categoryHint && <p style={{ fontSize: 14, color: "var(--navy)", fontWeight: 600, marginTop: 6 }}>✓ {categoryHint}</p>}
          </Field>
          <Field id="contactName" label="Contact name" required error={errors.contactName}>
            <input id="contactName" className="form-input form-input-lg" value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="name" aria-invalid={!!errors.contactName || undefined} />
          </Field>
          <div style={grid2}>
            <Field id="contactMobile" label="Mobile" required error={errors.contactMobile}>
              <input id="contactMobile" className="form-input form-input-lg" type="tel" inputMode="tel" value={contactMobile} onChange={(e) => setContactMobile(e.target.value)} autoComplete="tel" placeholder="04XX XXX XXX" aria-invalid={!!errors.contactMobile || undefined} />
            </Field>
            <Field id="contactEmail" label="Email" required error={errors.contactEmail}>
              <input id="contactEmail" className="form-input form-input-lg" type="email" inputMode="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} autoComplete="email" placeholder="Your confirmation goes here" aria-invalid={!!errors.contactEmail || undefined} />
            </Field>
          </div>
          <Field id="contactAddress" label="Address" required error={errors.contactAddress}>
            <input id="contactAddress" className="form-input form-input-lg" value={contactAddress}
              onChange={(e) => { setContactAddress(e.target.value); if (sameAddress) setDriverAddress(e.target.value); }}
              autoComplete="street-address" placeholder="Street, town, postcode" aria-invalid={!!errors.contactAddress || undefined} />
          </Field>
        </div>
      </div>

      {/* Section B */}
      <div className="card">
        <SectionHeader letter="B" title="Driver" />
        <p style={{ fontSize: 15, color: "var(--muted)", marginBottom: 18, marginTop: -8 }}>
          A standard car licence is enough for this bus. <strong style={{ color: "var(--text)" }}>Australian or New Zealand licences only.</strong>
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={grid2}>
            <Field id="driverName" label="Driver's full name" required error={errors.driverName}>
              <input id="driverName" className="form-input form-input-lg" value={driverName} onChange={(e) => setDriverName(e.target.value)} aria-invalid={!!errors.driverName || undefined} />
            </Field>
            <Field id="driverMobile" label="Driver's mobile" required error={errors.driverMobile}>
              <input id="driverMobile" className="form-input form-input-lg" type="tel" inputMode="tel" value={driverMobile} onChange={(e) => setDriverMobile(e.target.value)} placeholder="04XX XXX XXX" aria-invalid={!!errors.driverMobile || undefined} />
            </Field>
          </div>
          <div style={grid2}>
            <Field id="licenceState" label="Licence issued in" required error={errors.licenceState}>
              <select id="licenceState" className="form-input form-input-lg" value={licenceState} onChange={(e) => setLicenceState(e.target.value)} aria-invalid={!!errors.licenceState || undefined}>
                <option value="">Select state or country</option>
                {LICENCE_STATES.map((s) => <option key={s} value={s}>{LICENCE_STATE_LABELS[s]}</option>)}
              </select>
            </Field>
            <Field id="licenceNumber" label="Licence number" required error={errors.licenceNumber}>
              <input id="licenceNumber" className="form-input form-input-lg" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)}
                autoCapitalize="characters" autoComplete="off" spellCheck={false} aria-invalid={!!errors.licenceNumber || undefined} />
            </Field>
          </div>
          <Field id="licenceExpiry" label="Licence expiry" required error={errors.licenceExpiry}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 10, maxWidth: 380 }}>
              <select aria-label="Expiry day" id="licenceExpiry" className="form-input form-input-lg" value={licenceDay} onChange={(e) => setLicenceDay(e.target.value)}>
                <option value="">Day</option>
                {days31.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select aria-label="Expiry month" className="form-input form-input-lg" value={licenceMonth} onChange={(e) => setLicenceMonth(e.target.value)}>
                <option value="">Month</option>
                {months.map((m, i) => <option key={m} value={m}>{monthNames[i]}</option>)}
              </select>
              <select aria-label="Expiry year" className="form-input form-input-lg" value={licenceYear} onChange={(e) => setLicenceYear(e.target.value)}>
                <option value="">Year</option>
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </Field>
          <Field id="driverAddress" label="Driver's home address" required error={errors.driverAddress}>
            <label className="checkbox-label" style={{ marginBottom: 10 }}>
              <input type="checkbox" checked={sameAddress} onChange={(e) => toggleSameAddress(e.target.checked)} className="form-checkbox" />
              <span>Same as contact address</span>
            </label>
            <input id="driverAddress" className="form-input form-input-lg" value={effectiveDriverAddress}
              onChange={(e) => setDriverAddress(e.target.value)} disabled={sameAddress}
              placeholder="Street, town, postcode" aria-invalid={!!errors.driverAddress || undefined} />
          </Field>
          <div id="field-ageConfirmed">
            <label className="checkbox-label">
              <input type="checkbox" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} className="form-checkbox" />
              <span>I confirm the driver is 21 years of age or older<span style={{ color: "var(--gold)", marginLeft: 3 }} aria-hidden>*</span></span>
            </label>
            {errors.ageConfirmed && <p className="field-error" role="alert">{errors.ageConfirmed}</p>}
          </div>
        </div>
      </div>

      {/* Section C */}
      <div className="card">
        <SectionHeader letter="C" title="Trip" />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={grid2}>
            <Field id="pickupTime" label={`Pick-up time, ${fmtDateLong(startDate)}`} required error={errors.pickupTime}>
              <TimeSelect id="pickupTime" value={pickupTime} onChange={setPickupTime} invalid={!!errors.pickupTime} />
            </Field>
            <Field id="returnTime" label={`Return time, ${fmtDateLong(endDate)}`} required error={errors.returnTime}>
              <TimeSelect id="returnTime" value={returnTime} onChange={setReturnTime} invalid={!!errors.returnTime} />
            </Field>
          </div>
          <Field id="destination" label="Destination" required error={errors.destination}>
            <input id="destination" className="form-input form-input-lg" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Town or venue" aria-invalid={!!errors.destination || undefined} />
          </Field>
        </div>
      </div>

      {/* Conditions of Use */}
      <div className="card">
        <SectionHeader letter="✓" title={`Conditions of use${conditions.version ? ` (version ${conditions.version})` : ""}`} />
        <div tabIndex={0} aria-label="Conditions of use" style={{ maxHeight: 260, overflowY: "auto", background: "var(--cream)", borderRadius: 8, padding: "16px 20px", fontSize: 15, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-line", border: "1px solid var(--border)", marginBottom: 16 }}>
          {conditions.content}
        </div>
        <div id="field-conditionsAccepted">
          <label className="checkbox-label" style={{ fontSize: 16 }}>
            <input type="checkbox" checked={conditionsAccepted} onChange={(e) => setConditionsAccepted(e.target.checked)} className="form-checkbox" />
            <span style={{ fontWeight: 700 }}>I agree to the conditions of use<span style={{ color: "var(--gold)", marginLeft: 3 }} aria-hidden>*</span></span>
          </label>
          {errors.conditionsAccepted && <p className="field-error" role="alert">{errors.conditionsAccepted}</p>}
        </div>
      </div>

      {/* Errors */}
      {formError && (
        <div role="alert" style={{ background: "#FEF0EE", border: "1px solid #F5C6C0", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: "#B91C1C" }}>{formError}</p>
          {Object.keys(errors).length > 0 && (
            <ul style={{ marginTop: 8, paddingLeft: 18, listStyle: "disc" }}>
              {FIELD_ORDER.filter((k) => errors[k]).map((k) => (
                <li key={k} style={{ fontSize: 15, color: "#B91C1C", marginBottom: 4 }}>{errors[k]}</li>
              ))}
            </ul>
          )}
          {datesTaken && (
            <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={() => { router.refresh(); onBack(); }}>
              ← Choose different dates
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button type="button" onClick={onBack} className="btn-secondary" style={{ flex: 1, minHeight: 52 }}>← Back</button>
        <button type="submit" disabled={submitting} className="btn-primary btn-lg" style={{ flex: 2 }}>
          {submitting ? "Submitting…" : "Submit booking"}
        </button>
      </div>
    </form>
  );
}
