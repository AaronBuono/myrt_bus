"use client";

import { useRef, useState } from "react";
import type { PricingZone } from "@/lib/queries/home";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];
const MONTHS_TO_SHOW = 13;

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

function buildMonthGrid(year: number, month: number): Array<{ iso: string; overflow: boolean }> {
  const first = firstDayOfWeek(year, month);
  const days = daysInMonth(year, month);

  const cells: Array<{ iso: string; overflow: boolean }> = [];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevDays = daysInMonth(prevYear, prevMonth);
  for (let i = first - 1; i >= 0; i--) {
    const d = prevDays - i;
    cells.push({ iso: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, overflow: true });
  }

  for (let d = 1; d <= days; d++) {
    cells.push({ iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, overflow: false });
  }

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let nd = 1;
  while (cells.length < 42) {
    cells.push({ iso: `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nd).padStart(2, "0")}`, overflow: true });
    nd++;
  }

  return cells;
}

interface MonthEntry { year: number; month: number; key: string }

function buildMonthList(fromYear: number, fromMonth: number, count: number): MonthEntry[] {
  const list: MonthEntry[] = [];
  let y = fromYear, m = fromMonth;
  for (let i = 0; i < count; i++) {
    list.push({ year: y, month: m, key: `${y}-${String(m + 1).padStart(2, "0")}` });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return list;
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
  const todayISO = toISO(today);
  const unavailableSet = new Set(unavailableDates);
  const selectedSet = new Set(selectedDates);

  const months = buildMonthList(today.getFullYear(), today.getMonth(), MONTHS_TO_SHOW);
  const [jumpKey, setJumpKey] = useState(months[0].key);

  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});

  function toggleDate(iso: string) {
    if (unavailableSet.has(iso)) return;
    if (selectedSet.has(iso)) {
      setSelectedDates(selectedDates.filter((d) => d !== iso));
    } else {
      setSelectedDates([...selectedDates, iso].sort());
    }
  }

  function handleJump(key: string) {
    setJumpKey(key);
    const el = monthRefs.current[key];
    const container = scrollRef.current;
    if (el && container) {
      container.scrollTop = el.offsetTop - container.offsetTop;
    }
  }

  const days = selectedDates.length;
  const selectedZone = zones.find((z) => z.id === zoneId);
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* ── Left: Scrollable Calendar ── */}
        <div className="card flex flex-col gap-0 p-0 overflow-hidden">
          {/* Sticky header: dropdown + day labels */}
          <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-2 border-b border-[#F0F1F4]">
            <select
              value={jumpKey}
              onChange={(e) => handleJump(e.target.value)}
              className="w-full mb-2 px-3 py-2 rounded-lg border border-[#DDE1EA] text-sm font-semibold text-[#1A1A1A] bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-colors appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235E6470' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
            >
              {months.map((m) => (
                <option key={m.key} value={m.key}>
                  {MONTH_NAMES[m.month]} {m.year}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-7">
              {DAY_LABELS.map((d) => (
                <div key={d} className="text-center text-[10px] font-bold text-[#5E6470] py-1">{d}</div>
              ))}
            </div>
          </div>

          {/* Scrollable months */}
          <div ref={scrollRef} className="overflow-y-auto px-4" style={{ maxHeight: 380 }}>
            {months.map((entry) => {
              const grid = buildMonthGrid(entry.year, entry.month);
              return (
                <div
                  key={entry.key}
                  ref={(el) => { monthRefs.current[entry.key] = el; }}
                  className="pt-4 pb-3"
                >
                  <p className="text-sm font-bold text-[#1A1A1A] mb-2">
                    {MONTH_NAMES[entry.month]} {entry.year}
                  </p>
                  <div className="grid grid-cols-7 gap-y-0.5">
                    {grid.map(({ iso, overflow }, idx) => {
                      const isPast = iso < todayISO;
                      const isUnavailable = unavailableSet.has(iso);
                      const isSelected = selectedSet.has(iso);
                      const disabled = isPast || isUnavailable;

                      let cls = "w-full aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-colors ";
                      if (isSelected)
                        cls += "bg-brand-blue text-white";
                      else if (disabled)
                        cls += overflow
                          ? "text-red-300 line-through cursor-not-allowed"
                          : "text-red-400 line-through cursor-not-allowed bg-red-50";
                      else if (overflow)
                        cls += "text-[#A0A8B8] hover:bg-[#EEF2FF] cursor-pointer";
                      else
                        cls += "text-[#1A1A1A] hover:bg-[#EEF2FF] cursor-pointer";

                      const dayNum = parseInt(iso.slice(8), 10);
                      return (
                        <button key={`${iso}-${idx}`} disabled={disabled} onClick={() => toggleDate(iso)} className={cls}>
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary + Legend */}
          <div className="px-4 pb-4 pt-2 border-t border-[#F0F1F4]">
            <div className="min-h-[24px] mb-3">
              {summaryLabel
                ? <p className="text-sm font-semibold text-brand-blue text-center">{summaryLabel}</p>
                : <p className="text-xs text-[#5E6470] text-center">Tap dates to select</p>
              }
            </div>
            <div className="flex items-center justify-center gap-4">
              <span className="flex items-center gap-1.5 text-[10px] text-[#5E6470]">
                <span className="w-3 h-3 rounded bg-brand-blue inline-block" /> Selected
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-[#5E6470]">
                <span className="w-3 h-3 rounded bg-red-50 border border-red-200 inline-block" /> Unavailable
              </span>
            </div>
          </div>
        </div>

        {/* ── Right: Zones + Estimate + Continue ── */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-[#1A1A1A]">Select destination zone</p>

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
