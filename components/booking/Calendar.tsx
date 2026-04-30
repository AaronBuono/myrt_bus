"use client";

import React from "react";

export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_LABELS = ["Mo","Tu","We","Th","Fr","Sa","Su"];

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfWeek(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

export function getDateRange(a: string, b: string): string[] {
  const dates: string[] = [];
  const cur = new Date(a + "T00:00:00");
  const end = new Date(b + "T00:00:00");
  while (cur <= end) {
    dates.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export function fmtDateShort(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function fmtDateLong(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-AU", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

interface MonthGridProps {
  year: number;
  month: number;
  todayISO: string;
  unavailableSet: Set<string>;
  rangeFrom: string | null;
  rangeTo: string | null;
  selStart: string | null;
  effectiveEnd: string | null;
  onDateClick: (iso: string) => void;
  onDateHover: (iso: string) => void;
}

export function MonthGrid({
  year, month, todayISO, unavailableSet,
  rangeFrom, rangeTo, selStart, effectiveEnd,
  onDateClick, onDateHover,
}: MonthGridProps) {
  const total = daysInMonth(year, month);
  const offset = firstDayOfWeek(year, month);
  const isSinglePoint = rangeFrom !== null && rangeFrom === rangeTo;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--muted-light)", padding: "4px 0", userSelect: "none", letterSpacing: "0.05em" }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`e${i}`} style={{ height: 52 }} />
        ))}
        {Array.from({ length: total }).map((_, i) => {
          const day = i + 1;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isPast = iso < todayISO;
          const isUnavailable = unavailableSet.has(iso);
          const disabled = isPast || isUnavailable;

          const isRangeStart = !isSinglePoint && rangeFrom !== null && iso === rangeFrom;
          const isRangeEnd = !isSinglePoint && rangeTo !== null && iso === rangeTo;
          const isInRange = rangeFrom !== null && rangeTo !== null && iso > rangeFrom && iso < rangeTo;
          const hasCircle = iso === selStart || iso === effectiveEnd;

          let showBand = false;
          let bandLeft = "0";
          let bandRight = "0";
          if (!isSinglePoint && (isRangeStart || isRangeEnd || isInRange)) {
            showBand = true;
            if (isRangeStart) { bandLeft = "50%"; bandRight = "0"; }
            else if (isRangeEnd) { bandLeft = "0"; bandRight = "50%"; }
          }

          const circleStyle: React.CSSProperties = {
            position: "relative",
            zIndex: 2,
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: hasCircle ? 700 : isInRange ? 600 : 400,
            cursor: disabled ? "default" : "pointer",
            transition: "background 0.15s, color 0.15s",
            fontFamily: "inherit",
            background: hasCircle ? "var(--navy)" : "transparent",
            color: hasCircle
              ? "#fff"
              : isUnavailable
              ? "#D4C4B8"
              : isPast
              ? "#CFC9C2"
              : isInRange
              ? "var(--navy)"
              : "var(--text)",
            textDecoration: isUnavailable ? "line-through" : "none",
          };

          return (
            <div key={iso} style={{ position: "relative", height: 52, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {showBand && (
                <div style={{
                  position: "absolute", top: 6, bottom: 6,
                  left: bandLeft, right: bandRight,
                  background: "var(--navy-tint)", pointerEvents: "none", zIndex: 1,
                }} />
              )}
              <button
                disabled={disabled}
                onClick={() => !disabled && onDateClick(iso)}
                onMouseEnter={() => !disabled && onDateHover(iso)}
                style={{ background: "none", border: "none", padding: 0, cursor: disabled ? "default" : "pointer", position: "relative", zIndex: 2 }}
                tabIndex={disabled ? -1 : 0}
                className={!disabled && !hasCircle ? "cal-day-hover" : ""}
              >
                <span style={circleStyle}>{day}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
