"use client";

import { useState } from "react";
import React from "react";
import type { PricingZone } from "@/lib/queries/home";
import { MonthGrid, MONTH_NAMES, shiftMonth, getDateRange, fmtDateShort, toISO } from "./Calendar";

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

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const right = shiftMonth(viewYear, viewMonth, 1);
  const atEarliestMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  function goBack() {
    if (atEarliestMonth) return;
    const p = shiftMonth(viewYear, viewMonth, -1);
    setViewYear(p.year);
    setViewMonth(p.month);
  }

  function goForward() {
    const n = shiftMonth(viewYear, viewMonth, 1);
    setViewYear(n.year);
    setViewMonth(n.month);
  }

  function rangeHasUnavailable(a: string, b: string): boolean {
    return unavailableDates.some((u) => u > a && u < b);
  }

  function handleDateClick(iso: string) {
    if (iso < todayISO || unavailableSet.has(iso)) return;
    if (!selStart || (selStart && selEnd)) {
      setSelStart(iso); setSelEnd(null); setHoverDate(null); setSelectedDates([iso]); return;
    }
    if (iso === selStart) { setSelEnd(iso); setHoverDate(null); setSelectedDates([iso]); return; }
    const [a, b] = iso < selStart ? [iso, selStart] : [selStart, iso];
    if (rangeHasUnavailable(a, b)) {
      setSelStart(iso); setSelEnd(null); setHoverDate(null); setSelectedDates([iso]); return;
    }
    setSelEnd(iso);
    setHoverDate(null);
    setSelectedDates(getDateRange(a, b));
  }

  function handleDateHover(iso: string) {
    if (selStart && !selEnd) setHoverDate(iso);
  }

  function clearRange() {
    setSelStart(null); setSelEnd(null); setHoverDate(null); setSelectedDates([]);
  }

  const effectiveEnd = selEnd ?? hoverDate;
  let rangeFrom: string | null = null;
  let rangeTo: string | null = null;
  if (selStart && effectiveEnd) {
    [rangeFrom, rangeTo] = selStart <= effectiveEnd ? [selStart, effectiveEnd] : [effectiveEnd, selStart];
  } else if (selStart) {
    rangeFrom = selStart; rangeTo = selStart;
  }

  const days = selectedDates.length;
  const selectedZone = zones.find((z) => z.id === zoneId);
  const estimate = selectedZone && days > 0
    ? selectedZone.ratePerDay + Math.max(0, days - 1) * additionalDayRate
    : null;
  const canContinue = days > 0 && zoneId !== "";
  const isSingleDay = selStart !== null && selEnd !== null && selStart === selEnd;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Calendar card */}
      <div className="card" onMouseLeave={() => setHoverDate(null)}>
        {/* Month nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={goBack} disabled={atEarliestMonth} className="cal-nav-btn" aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <span style={{ textAlign: "center", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--text)" }}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <span style={{ textAlign: "center", fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 600, color: "var(--text)" }} className="cal-second-month">
              {MONTH_NAMES[right.month]} {right.year}
            </span>
          </div>
          <button onClick={goForward} className="cal-nav-btn" aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* Two-month grid */}
        <div className="cal-grid">
          <MonthGrid
            year={viewYear} month={viewMonth} todayISO={todayISO}
            unavailableSet={unavailableSet} rangeFrom={rangeFrom} rangeTo={rangeTo}
            selStart={selStart} effectiveEnd={effectiveEnd}
            onDateClick={handleDateClick} onDateHover={handleDateHover}
          />
          <div>
            <div className="cal-second-month-label">{MONTH_NAMES[right.month]} {right.year}</div>
            <MonthGrid
              year={right.year} month={right.month} todayISO={todayISO}
              unavailableSet={unavailableSet} rangeFrom={rangeFrom} rangeTo={rangeTo}
              selStart={selStart} effectiveEnd={effectiveEnd}
              onDateClick={handleDateClick} onDateHover={handleDateHover}
            />
          </div>
        </div>

        {/* Date summary row */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-light)", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", flex: 1, gap: 20 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-light)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Pick-up</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: selStart ? "var(--text)" : "var(--border)" }}>
                {selStart ? fmtDateShort(selStart) : "—"}
              </p>
            </div>
            {!isSingleDay && (
              <>
                <div style={{ display: "flex", alignItems: "center", color: "var(--border)", fontSize: 18 }}>→</div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-light)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Return</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: selEnd ? "var(--text)" : selStart ? "var(--gold)" : "var(--border)", fontStyle: !selEnd && selStart ? "italic" : "normal" }}>
                    {selEnd ? fmtDateShort(selEnd) : selStart ? "Select return date…" : "—"}
                  </p>
                </div>
              </>
            )}
            {isSingleDay && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "var(--muted-light)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Duration</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>1 day</p>
              </div>
            )}
          </div>
          {selStart && (
            <button onClick={clearRange} style={{ fontSize: 12, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}>
              Clear
            </button>
          )}
        </div>

        {/* Hint text */}
        <div style={{ textAlign: "center", marginTop: 12, minHeight: 18 }}>
          {!selStart && <p style={{ fontSize: 13, color: "var(--muted-light)" }}>Tap a date to set your pick-up day, then tap again for your return</p>}
          {selStart && !selEnd && <p style={{ fontSize: 13, fontWeight: 600, color: "var(--gold)" }}>Now select your return date</p>}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)" }}>
          {([
            { swatch: { width: 14, height: 14, borderRadius: "50%", background: "var(--navy)", display: "inline-block" }, label: "Selected" },
            { swatch: { width: 14, height: 14, borderRadius: 3, background: "var(--navy-tint)", border: "1px solid #C0CFE8", display: "inline-block" }, label: "Range" },
            { swatch: { width: 14, height: 14, borderRadius: 3, background: "#FEF0EE", border: "1px solid #F5C6C0", display: "inline-block" }, label: "Unavailable" },
          ] as Array<{ swatch: React.CSSProperties; label: string }>).map(({ swatch, label }) => (
            <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
              <span style={swatch} />{label}
            </span>
          ))}
        </div>
      </div>

      {/* Zone + estimate + continue */}
      <div className="zone-estimate-grid">
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.07em" }}>Select destination zone</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {zones.map((z) => (
              <button key={z.id} onClick={() => setZoneId(z.id)} className={`zone-btn${zoneId === z.id ? " zone-btn-active" : ""}`}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ minWidth: 0, textAlign: "left" }}>
                    <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", lineHeight: 1.2 }}>{z.zoneName}</p>
                    {z.examples && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{z.examples}</p>}
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: zoneId === z.id ? "var(--navy)" : "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    ${z.ratePerDay}<span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>/day</span>
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
                <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Estimated amount due at WAW</p>
                <p style={{ fontSize: 36, fontFamily: "var(--font-heading)", fontWeight: 700, color: "var(--navy)", lineHeight: 1 }}>${estimate}</p>
                <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>{days} day{days !== 1 ? "s" : ""} · {selectedZone?.zoneName}</p>
              </>
            ) : (
              <p style={{ fontSize: 13, color: "var(--muted-light)", padding: "8px 0" }}>Select dates and a zone to see your estimate</p>
            )}
          </div>
          <button disabled={!canContinue} onClick={onNext} className="btn-primary btn-lg" style={{ width: "100%" }}>
            Continue →
          </button>
        </div>
      </div>

    </div>
  );
}
