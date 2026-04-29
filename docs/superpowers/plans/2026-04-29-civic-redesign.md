# Civic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic SaaS aesthetic with a clean, civic/community services look suited to elderly users and the Myrtleford Lions Club context.

**Architecture:** Pure CSS/JSX changes across 8 public-facing files — no business logic, no API, no schema changes. Global style foundations first, then page-by-page top-down.

**Tech Stack:** Next.js 15, Tailwind CSS, TypeScript, DM Sans font

> **Note:** No test runner is configured (see CLAUDE.md). Verification step is `npm run build` (catches TS + lint errors) followed by visual check with `npm run dev`.

> **Prerequisite:** This project has no git repository. Before the first commit step, run: `cd /Users/aaronjacobbuono/projects/myrt_bus && git init && git add -A && git commit -m "chore: initial commit before civic redesign"`. Skip this if a repo already exists.

---

## File Map

| File | Change |
|---|---|
| `app/globals.css` | Foundations: bg white, rounded-md buttons, no card shadow, larger form labels |
| `tailwind.config.ts` | Remove unused `cream` colour token |
| `components/PublicHeader.tsx` | Remove Home button, h-16, plain Staff Login link |
| `app/(public)/page.tsx` | New hero, typographic step numbers, clean pricing, amber-accented WAW section |
| `app/(public)/book/page.tsx` | Replace blue page header with white civic header |
| `components/booking/BookingWizard.tsx` | Progress indicator: labels + coloured bars, no circles |
| `components/booking/Step1Dates.tsx` | Zone selector: left-border accent; estimate box: top-border accent |
| `components/booking/Step2Details.tsx` | Booking summary strip, section header labels, conditions text size |

---

## Task 1: Global Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-white text-[#1A1A1A] font-sans;
  }

  input:-webkit-autofill,
  input:-webkit-autofill:hover,
  input:-webkit-autofill:focus,
  input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0px 1000px #ffffff inset !important;
    -webkit-text-fill-color: #1A1A1A !important;
    transition: background-color 5000s ease-in-out 0s;
  }
}

@layer components {
  .btn-primary {
    @apply bg-brand-blue text-white font-bold px-6 py-2.5 rounded-md text-sm hover:opacity-85 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed;
  }
  .btn-secondary {
    @apply bg-transparent text-brand-blue border border-brand-blue font-semibold px-6 py-2.5 rounded-md text-sm hover:opacity-85 transition-opacity;
  }
  .btn-cta {
    @apply bg-brand-amber text-white font-bold px-8 py-3 rounded-md text-base hover:opacity-85 transition-opacity;
  }
  .card {
    @apply bg-white border border-[#E2E8F0] rounded-xl p-5;
  }
  .form-label {
    @apply block text-sm font-semibold text-[#374151] mb-1;
  }
  .form-input {
    @apply w-full border border-[#E2E8F0] rounded-md px-3 py-2.5 text-base text-[#1A1A1A] bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-colors;
  }
  .section-header {
    @apply border-l-4 border-brand-blue pl-3 mb-4;
  }
  .badge-amber {
    @apply inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800;
  }
  .badge-red {
    @apply inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800;
  }
  .badge-green {
    @apply inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800;
  }
  .badge-blue {
    @apply inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800;
  }
}
```

- [ ] **Step 2: Update `tailwind.config.ts` — remove `cream` token**

Verify it is unused first:
```bash
grep -r "brand-cream" /Users/aaronjacobbuono/projects/myrt_bus/app /Users/aaronjacobbuono/projects/myrt_bus/components
```
Expected: no output (globals.css was the only user, now changed to `bg-white`).

Then update the config:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#002868",
          amber: "#C97B0A",
          gold: "#FFD700",
          green: "#1B4332",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "DM Sans", "Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 3: Build to verify no errors**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully` with no type errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add app/globals.css tailwind.config.ts && git commit -m "style: civic redesign foundations — white bg, rounded-md buttons, larger labels, no card shadow"
```

---

## Task 2: PublicHeader

**Files:**
- Modify: `components/PublicHeader.tsx`

- [ ] **Step 1: Replace `components/PublicHeader.tsx`**

```tsx
import Image from "next/image";
import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="bg-white border-b border-[#E2E8F0] sticky top-0 z-50 h-16 flex items-center justify-between px-6">
      <Link href="/" className="flex items-center gap-3">
        <Image src="/logo-lions.png" alt="Myrtleford Lions Club" width={34} height={34} className="rounded-full" />
        <div className="w-px h-6 bg-[#E2E8F0]" />
        <Image src="/logo-alpine.png" alt="Alpine Shire Council" width={26} height={26} className="rounded-full" />
        <span className="text-sm font-bold text-brand-blue ml-1">Community Bus</span>
      </Link>
      <nav className="flex items-center gap-4">
        <Link href="/book" className="btn-cta text-sm px-4 py-2">Book the Bus</Link>
        <Link href="/login" className="text-sm text-slate-500 hover:text-brand-blue transition-colors">
          Staff Login
        </Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add components/PublicHeader.tsx && git commit -m "style: civic header — remove redundant Home button, h-16, plain staff login link"
```

---

## Task 3: Home Page

**Files:**
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1: Replace `app/(public)/page.tsx`**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { getHomePageData } from "@/lib/queries/home";
import type { OpeningHour } from "@/lib/queries/home";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function fmt12h(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function HoursRow({ hour }: { hour: OpeningHour }) {
  const day = DAYS[hour.dayOfWeek];
  if (!hour.isOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-sm font-semibold px-3 py-1 rounded">
        {day} <span className="font-normal opacity-70">Closed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#EEF2FF] text-brand-blue text-sm font-semibold px-3 py-1 rounded">
      {day} <span className="font-normal opacity-80">{fmt12h(hour.openingTime)} – {fmt12h(hour.closingTime)}</span>
    </span>
  );
}

export default async function HomePage() {
  const { zones, bank, hours } = await getHomePageData();

  return (
    <div>
      {/* ── Hero ── */}
      <div className="border-t-4 border-brand-blue" />
      <div className="max-w-3xl mx-auto px-6 py-16 border-b border-[#E2E8F0]">
        <h1 className="text-4xl font-bold text-brand-blue mb-4 tracking-tight">
          Myrtleford Lions Club<br />Community Bus
        </h1>
        <p className="text-lg text-slate-600 max-w-lg mb-8 leading-relaxed">
          Available to community groups and residents across the Alpine Shire region.
        </p>
        <Link href="/book" className="btn-cta text-base px-10 py-3">
          Book the Bus
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">

        {/* ── How it works ── */}
        <section>
          <h2 className="text-2xl font-bold text-brand-blue mb-2">How it works</h2>
          <p className="text-base text-slate-500 mb-8">Four steps from booking to collecting the keys.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {[
              { n: 1, title: "Check dates", body: "Browse the calendar for an available date." },
              { n: 2, title: "Fill in details", body: "Enter your driver details and agree to the conditions." },
              { n: 3, title: "Get your reference", body: "Receive a booking reference and confirmation by email." },
              { n: 4, title: "Pay & collect keys", body: "Pay at WAW Credit Union and pick up the keys." },
            ].map(({ n, title, body }) => (
              <div key={n}>
                <p className="text-5xl font-bold text-[#E2E8F0] leading-none mb-2 select-none">{n}</p>
                <p className="text-base font-bold text-brand-blue mb-1">{title}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section>
          <h2 className="text-2xl font-bold text-brand-blue mb-2">Pricing</h2>
          <p className="text-base text-slate-500 mb-5">
            Community rate — per 24-hour period. An additional $68 applies for each extra day or part thereof.
            Payment is made in person at WAW Credit Union when you collect the keys.
          </p>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-brand-blue text-white">
                  <th className="text-left px-4 py-3 text-base font-semibold">Destination</th>
                  <th className="text-left px-4 py-3 text-base font-semibold hidden sm:table-cell">Examples</th>
                  <th className="text-right px-4 py-3 text-base font-semibold">Rate per day</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr key={z.id} className="border-t border-[#E2E8F0]">
                    <td className="px-4 py-3 text-base font-semibold text-[#1A1A1A]">{z.zoneName}</td>
                    <td className="px-4 py-3 text-base text-slate-500 hidden sm:table-cell">{z.examples ?? "—"}</td>
                    <td className="px-4 py-3 text-base font-bold text-brand-blue text-right">${z.ratePerDay}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 border-l-4 border-brand-blue pl-4 py-1">
            <p className="text-sm text-slate-600">A $100 cleaning fee applies if the vehicle is returned unsatisfactorily. The tank must be returned full.</p>
          </div>
        </section>

        {/* ── WAW callout ── */}
        {bank && (
          <section className="border-l-4 border-brand-amber pl-5 py-1">
            <p className="text-lg font-bold text-brand-blue mb-1">Keys and payment — {bank.bankName}</p>
            <p className="text-base text-slate-500 mb-4">{bank.streetAddress}</p>
            {hours.length > 0 && (
              <>
                <p className="text-sm font-bold text-brand-blue mb-2">Opening hours</p>
                <div className="flex flex-wrap gap-2">
                  {hours.map((h) => <HoursRow key={h.dayOfWeek} hour={h} />)}
                </div>
              </>
            )}
          </section>
        )}

        {/* ── Book CTA ── */}
        <section className="text-center py-4 border-t border-[#E2E8F0]">
          <p className="text-base text-slate-500 mb-5">Ready to make a booking?</p>
          <Link href="/book" className="btn-cta text-base px-10 py-3">
            Book the Bus
          </Link>
        </section>

      </div>
    </div>
  );
}
```

Note: The `Image` import from `next/image` is removed — logos no longer appear in the hero. Verify the `Image` import is not needed before saving.

- [ ] **Step 2: Build to verify**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add app/\(public\)/page.tsx && git commit -m "style: civic home page — white hero with blue accent bar, typographic step numbers, clean pricing table, amber WAW callout"
```

---

## Task 4: Book Page Header

**Files:**
- Modify: `app/(public)/book/page.tsx`

- [ ] **Step 1: Replace the blue header block in `app/(public)/book/page.tsx`**

Change this:
```tsx
<div className="bg-brand-blue px-6 py-8 text-center">
  <h1 className="text-2xl font-bold text-white mb-1">Book the Bus</h1>
  <p className="text-white/70 text-sm">Select your dates, fill in your details, and get a booking reference instantly.</p>
</div>
```

To this:
```tsx
<div className="border-t-4 border-brand-blue" />
<div className="max-w-4xl mx-auto px-6 py-10 border-b border-[#E2E8F0]">
  <h1 className="text-3xl font-bold text-brand-blue mb-2">Book the Bus</h1>
  <p className="text-base text-slate-500">Select your dates, fill in your details, and get a booking reference instantly.</p>
</div>
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add app/\(public\)/book/page.tsx && git commit -m "style: civic book page header — replace blue block with white header and top accent bar"
```

---

## Task 5: BookingWizard Progress Indicator

**Files:**
- Modify: `components/booking/BookingWizard.tsx`

- [ ] **Step 1: Replace the progress indicator block in `components/booking/BookingWizard.tsx`**

Replace this block (lines 38–57):
```tsx
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
```

With:
```tsx
{/* Progress */}
<div className="flex gap-3 mb-10">
  {STEPS.map((label, i) => {
    const n = i + 1;
    const active = step === n;
    const done = step > n;
    return (
      <div key={n} className="flex-1">
        <p className={`text-sm font-semibold mb-2 ${
          done ? "text-green-600" : active ? "text-brand-blue" : "text-slate-400"
        }`}>
          {done ? `✓ ${label}` : label}
        </p>
        <div className={`h-1 rounded-full transition-colors ${
          done || active ? "bg-brand-blue" : "bg-[#E2E8F0]"
        }`} />
      </div>
    );
  })}
</div>
```

- [ ] **Step 2: Build to verify**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add components/booking/BookingWizard.tsx && git commit -m "style: booking wizard — replace circle progress indicator with label + bar track"
```

---

## Task 6: Step1Dates — Zone Selector and Estimate Box

**Files:**
- Modify: `components/booking/Step1Dates.tsx`

- [ ] **Step 1: Update zone selector button classes**

Find this block in `components/booking/Step1Dates.tsx` (around line 163):
```tsx
className={`text-left px-4 py-3 rounded-xl border-2 transition-colors w-full ${
  zoneId === z.id
    ? "border-brand-blue bg-[#EEF2FF]"
    : "border-[#DDE1EA] bg-white hover:border-brand-blue/40"
}`}
```

Replace with:
```tsx
className={`text-left px-4 py-3 rounded-xl border transition-colors w-full ${
  zoneId === z.id
    ? "border-[#E2E8F0] border-l-4 border-l-brand-blue bg-white"
    : "border-[#E2E8F0] bg-white hover:border-l-4 hover:border-l-brand-blue/40"
}`}
```

- [ ] **Step 2: Update the estimate box classes**

Find this block (around line 185):
```tsx
<div className={`rounded-xl border px-4 py-3 text-center transition-all ${
  estimate !== null
    ? "bg-[#EEF2FF] border-[#C7D4F0]"
    : "bg-[#F8F9FC] border-[#DDE1EA]"
}`}>
```

Replace with:
```tsx
<div className={`rounded-xl border border-[#E2E8F0] px-4 py-3 text-center transition-all ${
  estimate !== null ? "border-t-4 border-t-brand-blue" : ""
}`}>
```

- [ ] **Step 3: Update the calendar selected day and hover colours to match new border tokens**

Find (around line 121):
```tsx
else                   cls += "text-[#1A1A1A] hover:bg-[#EEF2FF] cursor-pointer";
```

Replace with:
```tsx
else                   cls += "text-[#1A1A1A] hover:bg-[#F0F4FF] cursor-pointer";
```

Find the legend selected swatch (around line 146):
```tsx
<span className="w-3 h-3 rounded bg-brand-blue inline-block" /> Selected
```
This is correct — leave it unchanged.

- [ ] **Step 4: Build to verify**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add components/booking/Step1Dates.tsx && git commit -m "style: step 1 — left-border zone selection, top-accent estimate box, no blue fill backgrounds"
```

---

## Task 7: Step2Details — Booking Summary, Section Headers, Conditions Text

**Files:**
- Modify: `components/booking/Step2Details.tsx`

- [ ] **Step 1: Update booking summary strip (line 150)**

Find:
```tsx
<div className="bg-[#EEF2FF] border border-[#C7D4F0] rounded-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
```

Replace with:
```tsx
<div className="border border-[#E2E8F0] border-l-4 border-l-brand-blue rounded-r-xl px-4 py-3 flex items-center justify-between flex-wrap gap-2">
```

- [ ] **Step 2: Update all three section header labels from tiny uppercase to readable text**

Find (Section A, line 162):
```tsx
<p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Section A — Organisation or Your Name</p>
```
Replace with:
```tsx
<p className="text-sm font-bold text-brand-blue">Section A — Organisation or Your Name</p>
```

Find (Section B, around line 188):
```tsx
<p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Section B — Driver Details</p>
```
Replace with:
```tsx
<p className="text-sm font-bold text-brand-blue">Section B — Driver Details</p>
```

Find (Section C, around line 233):
```tsx
<p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Section C — Trip Details</p>
```
Replace with:
```tsx
<p className="text-sm font-bold text-brand-blue">Section C — Trip Details</p>
```

Find (Conditions of Use, around line 263):
```tsx
<p className="text-[11px] font-bold text-brand-blue uppercase tracking-wider">Conditions of Use</p>
```
Replace with:
```tsx
<p className="text-sm font-bold text-brand-blue">Conditions of Use</p>
```

- [ ] **Step 3: Update the Section B description text and conditions scrollable area**

Find (line 189):
```tsx
<p className="text-xs text-[#5E6470]">A standard Victorian car licence is sufficient for this vehicle.</p>
```
Replace with:
```tsx
<p className="text-sm text-slate-500">A standard Victorian car licence is sufficient for this vehicle.</p>
```

Find the conditions scrollable area (line 265):
```tsx
<div className="h-48 overflow-y-auto bg-[#F8F9FC] rounded-lg p-4 text-xs text-[#5E6470] leading-relaxed whitespace-pre-line border border-[#DDE1EA]">
```
Replace with:
```tsx
<div className="h-48 overflow-y-auto bg-white rounded-lg p-4 text-sm text-slate-600 leading-relaxed whitespace-pre-line border border-[#E2E8F0]">
```

- [ ] **Step 4: Build to verify**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run build
```
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && git add components/booking/Step2Details.tsx && git commit -m "style: step 2 — amber-accented summary strip, readable section headers, larger conditions text"
```

---

## Visual Check

After all tasks are committed:

- [ ] **Start the dev server**

```bash
cd /Users/aaronjacobbuono/projects/myrt_bus && npm run dev
```

- [ ] **Check these pages at `http://localhost:3000`:**
  - `/` — Hero has blue accent bar at top, left-aligned heading, no blue blob. How It Works has large muted numbers. Pricing table has no row tint. WAW section has amber left border, no emoji.
  - `/book` — Blue accent bar header, no blue block. Progress indicator shows labels + coloured bars.
  - `/book` step 2 — Section headers are readable (not tiny uppercase). Booking summary strip has left blue border.
  - Header — No "Home" button. "Book the Bus" is amber. "Staff Login" is plain text link.
