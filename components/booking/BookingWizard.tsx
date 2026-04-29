"use client";

import { useState } from "react";
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

  return (
    <div className={`mx-auto px-4 py-8 ${step === 1 ? "max-w-4xl" : "max-w-2xl"}`}>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                done ? "bg-green-500 text-white" : active ? "bg-brand-blue text-white" : "bg-[#DDE1EA] text-[#5E6470]"
              }`}>
                {done ? "✓" : n}
              </div>
              <span className={`text-xs font-semibold whitespace-nowrap ${active ? "text-brand-blue" : "text-[#5E6470]"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-[#DDE1EA] ml-2" />}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Step1Dates
          zones={zones}
          unavailableDates={unavailableDates}
          additionalDayRate={additionalDayRate}
          selectedDates={selectedDates}
          setSelectedDates={setSelectedDates}
          zoneId={zoneId}
          setZoneId={setZoneId}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <Step2Details
          selectedDates={selectedDates}
          zoneId={zoneId}
          zones={zones}
          additionalDayRate={additionalDayRate}
          conditionsText={conditionsText}
          onBack={() => setStep(1)}
          onConfirmed={(r) => { setResult(r); setStep(3); }}
        />
      )}
      {step === 3 && result && (
        <Step3Confirmed result={result} />
      )}
    </div>
  );
}
