// Opening-hours helpers. day_of_week: 0 = Monday … 6 = Sunday (see db/schema.sql).
// Safe to import from client and server code.

import { fmtWallTime } from "@/lib/time";

export const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export interface HoursRow {
  dayOfWeek: number;
  isOpen: boolean;
  openingTime: string | null;
  closingTime: string | null;
}

/** "Mon–Fri 9:00 AM – 5:00 PM · Sat 9:00 AM – 12:00 PM · Sun closed" */
export function summariseHours(hours: HoursRow[]): string {
  const sorted = [...hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const label = (h: HoursRow) =>
    h.isOpen && h.openingTime && h.closingTime ? `${fmtWallTime(h.openingTime)} – ${fmtWallTime(h.closingTime)}` : "closed";

  const groups: Array<{ from: number; to: number; text: string }> = [];
  for (const h of sorted) {
    const text = label(h);
    const last = groups[groups.length - 1];
    if (last && last.text === text && last.to === h.dayOfWeek - 1) last.to = h.dayOfWeek;
    else groups.push({ from: h.dayOfWeek, to: h.dayOfWeek, text });
  }
  return groups
    .map((g) => {
      const days = g.from === g.to ? DAY_NAMES_SHORT[g.from] : `${DAY_NAMES_SHORT[g.from]}–${DAY_NAMES_SHORT[g.to]}`;
      return `${days} ${g.text}`;
    })
    .join(" · ");
}
