# Civic Redesign — Design Spec

**Date:** 2026-04-29
**Scope:** Public-facing pages — home page, booking wizard, header, shared styles

---

## Goal

Replace the current generic SaaS aesthetic with a clean, civic/community services look that feels appropriate for the Myrtleford Lions Club and Alpine Shire context. The primary audience includes elderly and non-tech-confident users; clarity, contrast, and readability are the top priorities.

Lions Club identity colours (`#002868` blue, `#C97B0A` amber) are retained throughout.

---

## 1. Design Foundations

### Colour

| Token | Current | New | Notes |
|---|---|---|---|
| `brand-cream` background | `#F5F0E8` | `#FFFFFF` | Pure white — higher contrast, cleaner |
| Filler backgrounds | `#EEF2FF`, `#F9F6F0` | `#F8F9FA` or `#FFFFFF` | Eliminate blue-tinted filler |
| Border | `#DDE1EA` | `#E2E8F0` | Slightly cooler, more neutral |
| Secondary text | `#5E6470` | `#64748B` | Keeps readability, more standard |

`brand-blue` (`#002868`) and `brand-amber` (`#C97B0A`) are unchanged.

### Typography

- Minimum body text size: **16px** (up from 14px/12px in current implementation)
- Form labels: **14px** (up from 11px — current is too small for elderly users)
- Heading sizes stay the same or increase; never decrease

### Buttons

- Change from `rounded-full` (pill) to `rounded-md` across all button variants — less generic startup feel
- `btn-cta` (amber) stays the primary public-facing action
- `btn-primary` (blue) used only for navigation/secondary actions
- `btn-secondary` stays as outlined blue

### Cards

- Remove `shadow-sm` from `.card` — no floating effect
- Keep `border border-[#E2E8F0]` only
- `rounded-xl` stays (still soft, just not floating)

---

## 2. PublicHeader

**Current problems:** Redundant "Home" button (logo already links home), two bare logos without labels, overall cramped at 56px.

**New design:**
- Height: `h-16` (64px)
- Left: Lions logo + divider + Alpine Shire logo, with "Community Bus" label — identical to current minus the redundant Home nav button
- Right: "Book the Bus" amber CTA button (`btn-cta` sizing down to `text-sm px-4 py-2`) + "Staff Login" as a plain text link (`text-sm text-slate-500 hover:text-brand-blue`)
- Remove the blue "Home" `btn-primary` link entirely

---

## 3. Home Page (`app/(public)/page.tsx`)

### Hero section

**Current:** Full-width dark blue block (`bg-brand-blue`) with logos, large heading, subtext, CTA button.

**New:** White background section, content constrained to `max-w-3xl mx-auto px-6`, left-aligned:
- Full-width `4px` solid `#002868` top accent bar above the section — visual grounding without a colour block
- Logos displayed in header only — do not repeat in hero body
- Large heading: "Myrtleford Lions Club Community Bus" — `text-4xl font-bold text-brand-blue`
- Subheading: "Available to community groups and residents across the Alpine Shire region." — `text-lg text-slate-600`
- Amber CTA button below, left-aligned
- Generous padding: `py-16`
- A light `border-b border-[#E2E8F0]` separates it from the next section

### How it Works section

**Current:** 4-column grid with `w-9 h-9 rounded-full bg-brand-blue` number bubbles — looks generic.

**New:** Same 4-column grid, but:
- Number rendered as large muted text (`text-5xl font-bold text-[#E2E8F0]`) positioned above the title — typographic, not clipart
- Title: `text-base font-bold text-brand-blue`
- Body: `text-sm text-slate-600`
- No coloured circle background

### Pricing section

**Current:** Table with alternating `bg-[#F9F6F0]` row tint and a `bg-[#EEF2FF]` info callout below.

**New:**
- White rows only — no alternating tint
- Keep the `border border-[#E2E8F0]` table border
- Info callout below: white background with a `border-l-4 border-brand-blue` left accent (blockquote style) instead of `bg-[#EEF2FF]`

### WAW / Opening Hours callout

**Current:** `bg-[#EEF2FF]` tinted box with a 🔑 emoji avatar.

**New:**
- Remove emoji entirely
- White background with `border-l-4 border-brand-amber` left accent
- Bank name as a `text-lg font-bold text-brand-blue` heading
- Address and hours in normal text below
- No tinted background

### Bottom CTA

Keep as-is (simple centered amber button) — it works fine.

---

## 4. Booking Wizard

### Progress indicator (`BookingWizard.tsx`)

**Current:** Numbered circles + connecting lines — visually busy.

**New:** Horizontal step track:
- Three step labels in a row, separated by `flex-1 h-px bg-[#E2E8F0]` lines
- Active step: label bold blue, number plain
- Completed step: label with a `✓` prefix in green, greyed number
- Future step: muted slate text
- No filled circle backgrounds

### Zone selector (`Step1Dates.tsx`)

**Current:** Selected state fills with `bg-[#EEF2FF]` and `border-brand-blue`.

**New:** Selected state: white background + `border-l-4 border-brand-blue` + `border border-[#E2E8F0]` — border accent only, no fill.

### Estimate box (`Step1Dates.tsx`)

**Current:** `bg-[#EEF2FF] border-[#C7D4F0]` blue-tinted fill.

**New:** White background, `border border-[#E2E8F0]`, `border-t-4 border-t-brand-blue` top accent. Amount in `text-3xl font-bold text-brand-blue`.

### Form inputs (`Step2Details.tsx`)

- Form labels: `text-sm` (14px) instead of `text-[11px]` uppercase — more readable, less shouty
- Keep existing `form-input` styling (it's clean already)

---

## 5. Files to Change

| File | Change |
|---|---|
| `app/globals.css` | Update `.card` (remove shadow), `.btn-primary/.btn-secondary/.btn-cta` (rounded-md), `.form-label` (text-sm, remove uppercase tracking), `body` bg to white |
| `tailwind.config.ts` | Update `brand-cream` to `#FFFFFF` or remove it (body bg moves to white) |
| `components/PublicHeader.tsx` | Remove Home button, style tweaks, height to h-16 |
| `app/(public)/page.tsx` | New hero section, updated How It Works numbers, pricing table, WAW callout |
| `components/booking/BookingWizard.tsx` | New progress indicator |
| `components/booking/Step1Dates.tsx` | Zone selector selected state, estimate box |
| `components/booking/Step2Details.tsx` | Form label sizing |

---

## Out of Scope

- Protected pages (`/admin`, `/coordinator`, `/waw`, `/dashboard`) — staff-facing, separate concern
- Login/reset-password pages
- Any changes to data fetching, API routes, or business logic
- New features or content changes
