"use client";

import type { PricingZone } from "@/lib/queries/home";
import DateRangePicker from "./DateRangePicker";

interface Props {
  zones: PricingZone[];
  unavailableDates: string[];
  selectedDates: string[];
  setSelectedDates: (d: string[]) => void;
  zoneId: string;
  setZoneId: (id: string) => void;
  onNext: () => void;
}

export default function Step1Dates({
  zones, unavailableDates,
  selectedDates, setSelectedDates, zoneId, setZoneId, onNext,
}: Props) {
  const days = selectedDates.length;
  const selectedZone = zones.find((z) => z.id === zoneId);
  const estimate = selectedZone && days > 0
    ? selectedZone.ratePerDay * days
    : null;
  const canContinue = days > 0 && zoneId !== "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      <DateRangePicker
        unavailableDates={unavailableDates}
        selectedDates={selectedDates}
        setSelectedDates={setSelectedDates}
      />

      {/* Zone + estimate + continue */}
      <div className="zone-estimate-grid">
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>Select destination zone</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {zones.map((z) => (
              <button type="button" key={z.id} onClick={() => setZoneId(z.id)} aria-pressed={zoneId === z.id} className={`zone-btn${zoneId === z.id ? " zone-btn-active" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, textAlign: "left" }}>
                    <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", lineHeight: 1.2 }}>{z.zoneName}</p>
                    {z.examples && <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 2 }}>{z.examples}</p>}
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: zoneId === z.id ? "var(--navy)" : "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    ${z.ratePerDay}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--muted)" }}>/day</span>
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className={`estimate-box${estimate !== null ? " estimate-box-active" : ""}`}>
            {estimate !== null ? (
              <>
                <p style={{ fontSize: 14, color: "var(--muted)", marginBottom: 4 }}>Estimated amount due at pickup</p>
                <p style={{ fontSize: 36, fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--navy)", lineHeight: 1 }}>${estimate}</p>
                <p style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>{days} day{days !== 1 ? "s" : ""} · {selectedZone?.zoneName}</p>
              </>
            ) : (
              <p style={{ fontSize: 14, color: "var(--muted)", padding: "8px 0" }}>Select dates and a zone to see your estimate</p>
            )}
          </div>
          <button type="button" disabled={!canContinue} onClick={onNext} className="btn-primary btn-lg" style={{ width: "100%" }}>
            Continue →
          </button>
        </div>
      </div>

    </div>
  );
}
