"use client";

import { useState, useEffect, Fragment } from "react";
import Step1Dates from "./Step1Dates";
import Step2Details from "./Step2Details";
import Step3Confirmed from "./Step3Confirmed";
import type { PricingZone } from "@/lib/queries/home";

export interface BookingResult {
  reference: string;
  amountDue: number;
  category: "a" | "c";
  isInvoicedOrg: boolean;
  startDate: string;
  endDate: string;
  destination: string;
  zoneName: string;
}

interface Props {
  zones: PricingZone[];
  unavailableDates: string[];
  additionalDayRate: number;
  conditionsText: string;
}

const STEPS = ["Dates & Destination", "Your Details", "Confirmed"];

export default function BookingWizard({ zones, unavailableDates, additionalDayRate, conditionsText }: Props) {
  const [step, setStep] = useState(1);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [zoneId, setZoneId] = useState<string>("");
  const [result, setResult] = useState<BookingResult | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  return (
    <div>
      {/* Step progress */}
      <div style={{ background: "#fff", borderBottom: "1px solid var(--border)", padding: "20px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", alignItems: "center" }}>
          {STEPS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <Fragment key={n}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    background: done ? "#16A34A" : active ? "var(--navy)" : "var(--cream)",
                    color: done || active ? "#fff" : "var(--muted)",
                    border: done || active ? "none" : "2px solid var(--border)",
                    transition: "all 0.2s",
                  }}>
                    {done ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : n}
                  </div>
                  <span className="hidden sm:inline" style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--navy)" : done ? "var(--muted)" : "var(--muted-light)", whiteSpace: "nowrap" }}>
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? "#16A34A" : "var(--border)", margin: "0 12px", minWidth: 20, transition: "background 0.3s" }} />
                )}
              </Fragment>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div style={{ maxWidth: step === 1 ? 900 : 680, margin: "0 auto", padding: "32px 20px 64px" }}>
        {step === 1 && (
          <Step1Dates
            zones={zones} unavailableDates={unavailableDates} additionalDayRate={additionalDayRate}
            selectedDates={selectedDates} setSelectedDates={setSelectedDates}
            zoneId={zoneId} setZoneId={setZoneId} onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Details
            selectedDates={selectedDates} zoneId={zoneId} zones={zones}
            additionalDayRate={additionalDayRate} conditionsText={conditionsText}
            onBack={() => setStep(1)}
            onConfirmed={(r) => { setResult(r); setStep(3); }}
          />
        )}
        {step === 3 && result && <Step3Confirmed result={result} />}
      </div>
    </div>
  );
}
