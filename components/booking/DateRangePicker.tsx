"use client";

import { useState } from "react";
import React from "react";
import { MonthGrid, MONTH_NAMES, shiftMonth, getDateRange, fmtDateShort, toISO } from "./Calendar";

interface Props {
  unavailableDates: string[];
  selectedDates: string[];
  setSelectedDates: (d: string[]) => void;
}

/** Two-month calendar for choosing a pick-up and return date. Used by the booking wizard and the manage page. */
export default function DateRangePicker({ unavailableDates, selectedDates, setSelectedDates }: Props) {
  const today = new Date();
  const todayISO = toISO(today);
  const unavailableSet = new Set(unavailableDates);

  const initial = [...selectedDates].sort();
  const [viewYear, setViewYear] = useState(() => (initial[0] ? Number(initial[0].slice(0, 4)) : today.getFullYear()));
  const [viewMonth, setViewMonth] = useState(() => (initial[0] ? Number(initial[0].slice(5, 7)) - 1 : today.getMonth()));
  const [selStart, setSelStart] = useState<string | null>(initial[0] ?? null);
  const [selEnd, setSelEnd] = useState<string | null>(initial[initial.length - 1] ?? null);
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

  const sorted = [...selectedDates].sort();
  const firstDate = sorted[0] ?? null;
  const lastDate = sorted[sorted.length - 1] ?? null;
  const isSingleDay = selStart !== null && selEnd !== null && selStart === selEnd;

  return (
    <div className="card" onMouseLeave={() => setHoverDate(null)}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <button type="button" onClick={goBack} disabled={atEarliestMonth} className="cal-nav-btn" aria-label="Previous month">
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
        <button type="button" onClick={goForward} className="cal-nav-btn" aria-label="Next month">
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
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Pick-up</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: firstDate ? "var(--text)" : "var(--border)" }}>
              {firstDate ? fmtDateShort(firstDate) : "—"}
            </p>
          </div>
          {!isSingleDay && (
            <>
              <div style={{ display: "flex", alignItems: "center", color: "var(--border)", fontSize: 18 }}>→</div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Return</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: selEnd ? "var(--text)" : selStart ? "var(--gold)" : "var(--border)", fontStyle: !selEnd && selStart ? "italic" : "normal" }}>
                  {selEnd && lastDate ? fmtDateShort(lastDate) : selStart ? "Select return date…" : "—"}
                </p>
              </div>
            </>
          )}
          {isSingleDay && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>Duration</p>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>1 day</p>
            </div>
          )}
        </div>
        {selStart && (
          <button type="button" onClick={clearRange} style={{ fontSize: 14, color: "var(--muted)", background: "none", border: "none", cursor: "pointer", padding: "8px 10px" }}>
            Clear
          </button>
        )}
      </div>

      {/* Hint text */}
      <div style={{ textAlign: "center", marginTop: 12, minHeight: 20 }}>
        {!selStart && <p style={{ fontSize: 14, color: "var(--muted)" }}>Tap a date to set your pick-up day, then tap again for your return</p>}
        {selStart && !selEnd && <p style={{ fontSize: 14, fontWeight: 600, color: "var(--gold)" }}>Now select your return date (tap the same day again for a one-day hire)</p>}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border-light)", flexWrap: "wrap" }}>
        {([
          { swatch: { width: 14, height: 14, borderRadius: "50%", background: "var(--navy)", display: "inline-block" }, label: "Selected" },
          { swatch: { width: 14, height: 14, borderRadius: 3, background: "var(--navy-tint)", border: "1px solid #C0CFE8", display: "inline-block" }, label: "Range" },
          { swatch: { width: 14, height: 14, borderRadius: 3, background: "#FEF0EE", border: "1px solid #F5C6C0", display: "inline-block" }, label: "Unavailable" },
        ] as Array<{ swatch: React.CSSProperties; label: string }>).map(({ swatch, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
            <span style={swatch} />{label}
          </span>
        ))}
      </div>
    </div>
  );
}
