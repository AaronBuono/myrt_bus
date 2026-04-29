"use client";

import { useState } from "react";
import type { PricingZone } from "@/lib/queries/home";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number) {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  zones: PricingZone[];
  unavailableDates: string[];
  additionalDayRate: number;
  selectedDates: string[];
  setSelectedDates: (d: string[]) => void;
  zoneId: string;
  setZoneId: (id: string) => void;
  onNext: () => void;
}

export default function Step1Dates({
  zones, unavailableDates, additionalDayRate,
  selectedDates, setSelectedDates, zoneId, setZoneId, onNext,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const unavailableSet = new Set(unavailableDates);
  const selectedSet = new Set(selectedDates);

  function toggleDate(iso: string) {
    if (unavailableSet.has(iso)) return;
    if (selectedSet.has(iso)) {
      setSelectedDates(selectedDates.filter((d) => d !== iso));
    } else {
      setSelectedDates([...selectedDates, iso].sort());
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const startOffset = firstDayOfWeek(viewYear, viewMonth);
  const todayISO = toISO(today);
  const selectedZone = zones.find((z) => z.id === zoneId);
  const days = selectedDates.length;
  const estimate = selectedZone
    ? selectedZone.ratePerDay + Math.max(0, days - 1) * additionalDayRate
    : null;
  const canContinue = days > 0 && zoneId !== "";

  const summaryLabel = (() => {
    if (!days) return null;
    if (days === 1) return `1 day — ${fmtDate(selectedDates[0])}`;
    return `${days} days — ${fmtDate(selectedDates[0])} to ${fmtDate(selectedDates[days - 1])}`;
  })();

  return (
    <div className="flex flex-col gap-4">
      {/* Side-by-side grid on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* ── Left: Calendar ── */}
        <div className="card">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#DDE1EA] hover:border-brand-blue transition-colors text-[#5E6470] hover:text-brand-blue text-lg"
            >‹</button>
            <span className="text-base font-bold text-[#1A1A1A]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#DDE1EA] hover:border-brand-blue transition-colors text-[#5E6470] hover:text-brand-blue text-lg"
            >›</button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-[#5E6470] py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isPast = iso < todayISO;
              const isUnavailable = unavailableSet.has(iso);
              const isSelected = selectedSet.has(iso);
              const disabled = isPast || isUnavailable;

              let cls = "w-full aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ";
              if (isSelected)        cls += "bg-brand-blue text-white";
              else if (disabled)     cls += "text-red-400 line-through cursor-not-allowed bg-red-50";
              else                   cls += "text-[#1A1A1A] hover:bg-[#EEF2FF] cursor-pointer";

              return (
                <button key={iso} disabled={disabled} onClick={() => toggleDate(iso)} className={cls}>
                  {day}
                </button>
              );
            })}
          </div>

          {/* Selection summary */}
          <div className="mt-3 min-h-[24px]">
            {summaryLabel
              ? <p className="text-sm font-semibold text-brand-blue text-center">{summaryLabel}</p>
              : <p className="text-xs text-[#5E6470] text-center">Tap dates to select</p>
            }
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-[#F0F1F4]">
            <span className="flex items-center gap-1.5 text-[10px] text-[#5E6470]">
              <span className="w-3 h-3 rounded bg-brand-blue inline-block" /> Selected
            </span>
            <span className="flex items-center gap-1.5 text-[10px] text-[#5E6470]">
              <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> Unavailable
            </span>
          </div>
        </div>

        {/* ── Right: Zones + Estimate + Continue ── */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-[#1A1A1A]">Select destination zone</p>

          {/* Zone list */}
          <div className="flex flex-col gap-2">
            {zones.map((z) => (
              <button
                key={z.id}
                onClick={() => setZoneId(z.id)}
                className={`text-left px-4 py-3 rounded-xl border-2 transition-colors w-full ${
                  zoneId === z.id
                    ? "border-brand-blue bg-[#EEF2FF]"
                    : "border-[#DDE1EA] bg-white hover:border-brand-blue/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A] leading-tight">{z.zoneName}</p>
                    {z.examples && (
                      <p className="text-xs text-[#5E6470] mt-0.5 truncate">{z.examples}</p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-brand-blue whitespace-nowrap flex-shrink-0">
                    ${z.ratePerDay}<span className="text-xs font-normal text-[#5E6470]">/day</span>
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Estimate */}
          <div className={`rounded-xl border px-4 py-3 text-center transition-all ${
            estimate !== null
              ? "bg-[#EEF2FF] border-[#C7D4F0]"
              : "bg-[#F8F9FC] border-[#DDE1EA]"
          }`}>
            {estimate !== null ? (
              <>
                <p className="text-xs text-[#5E6470]">Estimated amount due at WAW</p>
                <p className="text-2xl font-bold text-brand-blue mt-0.5">${estimate}</p>
                <p className="text-xs text-[#5E6470] mt-0.5">
                  {days} day{days !== 1 ? "s" : ""} · {selectedZone?.zoneName}
                </p>
              </>
            ) : (
              <p className="text-xs text-[#5E6470] py-1">
                Select dates and a zone to see your estimate
              </p>
            )}
          </div>

          {/* Continue */}
          <button
            disabled={!canContinue}
            onClick={onNext}
            className="btn-primary w-full py-3 text-base"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
