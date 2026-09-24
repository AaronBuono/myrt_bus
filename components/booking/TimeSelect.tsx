"use client";

import { fmtWallTime } from "@/lib/time";

const OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 15) {
    OPTIONS.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

export default function TimeSelect({ id, value, onChange, invalid, name }: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  name?: string;
}) {
  return (
    <select id={id} name={name} value={value} onChange={(e) => onChange(e.target.value)} className="form-input form-input-lg" aria-invalid={invalid || undefined}>
      <option value="">Select time</option>
      {OPTIONS.map((t) => <option key={t} value={t}>{fmtWallTime(t)}</option>)}
    </select>
  );
}
