# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Myrtleford Lions Club Community Bus Booking Portal** — a Next.js 15 app that replaces a manual paper-based bus booking process for a 12-seater community bus in the Alpine Shire region of Victoria, Australia. The full product spec is in [PRD.md](PRD.md).

**Deployed stack:** Vercel (hosting) + Neon (serverless Postgres + auth) + Resend (transactional email)

---

## Commands

```bash
npm run dev        # Start dev server (Next.js 15 with Turbopack)
npm run build      # Production build
npm run lint       # ESLint
npm run db:push    # Apply db/schema.sql to the database (reads DATABASE_URL from .env.local)
```

No test runner is configured yet.

---

## Architecture

### Route Groups

- `app/(public)/` — No login required: home (`/`), booking wizard (`/book`), QR photo submission (`/qr`)
- `app/(protected)/` — Login required, gated by [middleware.ts](middleware.ts) and [app/(protected)/layout.tsx](app/(protected)/layout.tsx): `/waw`, `/coordinator`, `/admin`, `/dashboard`
- `app/api/` — API routes: `POST /api/bookings`, `GET /api/bookings/lookup`, Neon Auth proxy at `/api/auth/[...path]`
- Auth-related pages (no group): `/login`, `/reset-password`, `/unauthorized`

`/dashboard` is not a real page — it redirects to the role-appropriate destination (`/admin`, `/waw`, or `/coordinator`).

The protected role pages are fully built. Each has tab-based navigation driven by `?section=` URL search params — all rendering is server-side, no client state for navigation.

### Auth Flow

[middleware.ts](middleware.ts) uses `neonAuthMiddleware` to redirect unauthenticated requests on protected routes to `/login`. Inside protected pages, [lib/auth.ts](lib/auth.ts) exposes `getUser()` and `requireRole(...roles)`. Roles are stored in the `users` table with a `neon_auth_user_id` foreign key linking to Neon Auth's managed `neon_auth.users_sync` table.

Role → page access:
- `waw_staff` → `/waw`
- `bus_coordinator` → `/coordinator`
- `lions_admin` → `/admin`

Public bookers have **no accounts** — the booking reference number (format `BK-YYYY-NNN`) is their only identifier.

### Database Layer

[lib/db.ts](lib/db.ts) exports a `sql` tagged-template function using Neon's serverless driver. All DB access goes through this. Query helpers are grouped in [lib/queries/](lib/queries/):
- `booking.ts` — public booking flow (unavailable dates, org lookup, pricing snapshot, conditions, reference generation)
- `admin.ts` — all staff-facing reads and writes (bookings list, pricing, conditions, settings, bank, organisations, users)
- `home.ts` — homepage data (pricing zones, active bank + opening hours)

The full schema is in [db/schema.sql](db/schema.sql). Key design points:
- Pricing rates are **snapshotted into each booking row** at confirmation time — existing bookings are never affected by rate changes.
- `conditions_of_use` is versioned; the `is_current` partial unique index enforces a single active version.
- `bank_records` similarly has a partial unique index for the single active bank.
- Booking status lifecycle: `confirmed → in_use → pending_inspection → complete` (or `cancelled`).

Transactions use the manual `sql\`BEGIN\`` / `sql\`COMMIT\`` / `sql\`ROLLBACK\`` pattern (Neon's serverless driver does not support `BEGIN` inside a tagged template automatically — see [app/api/bookings/route.ts](app/api/bookings/route.ts) for the pattern).

### Booking API

`POST /api/bookings` — validates the wizard payload, looks up the org, snapshots pricing, generates a reference, inserts `bookings` + `booking_drivers` in a transaction, then fires a confirmation email non-blocking.

`GET /api/bookings/lookup?name=<org>` — used by the booking wizard to silently check whether a booker name matches a known organisation (returns `category` and `isInvoicedOrg`).

### Admin Portal

All staff mutations live in [app/actions/admin.ts](app/actions/admin.ts) as Next.js Server Actions — they call `requireRole()` internally, then the relevant query, then `revalidatePath`.

**`/admin`** (`lions_admin`) — 7-tab portal. Each tab is a server component under [app/(protected)/admin/sections/](app/(protected)/admin/sections/):
- `DashboardSection` — stat cards + recent bookings
- `BookingsSection` — filterable table with cancel; filter state lives in URL params so the filter form uses `method="GET"` with a hidden `name="section"` input to preserve the tab
- `PricingSection` — per-zone rate + additional day rate, one form per zone
- `ConditionsSection` — publish new version (textarea → server action), collapsible version history via `<details>`
- `OrgsSection` — address book CRUD; edit/create state uses `?editId=` / `?create=1` URL params so the form and table coexist on the same server-rendered page
- `StaffSection` — same URL-param pattern as orgs; toggle active uses a plain form POST
- `SettingsSection` — org settings, bank details, per-day opening hours (one form per row)

**`/coordinator`** (`bus_coordinator`) — Dashboard + Bookings tabs only; reuses the same section components from the admin folder.

**`/waw`** (`waw_staff`) — Single page (no tabs): payment/bank details, currently-in-use indicator, upcoming confirmed bookings awaiting payment.

**Shared admin components** in [components/admin/](components/admin/):
- `AdminNav.tsx` — tab link list; receives current section as prop, no client JS
- `StatusBadge.tsx` — maps booking status strings to coloured badge classes
- `CancelBookingBtn.tsx` — the only client component in the admin portal; uses `useTransition` + `window.confirm`

**Neon null parameter gotcha:** when filtering with optional parameters in tagged-template SQL, always cast nullable params explicitly (e.g. `${value ?? null}::text`) — bare `null` causes a "could not determine data type" error because PostgreSQL can't infer the type of an untyped `$N` parameter.

### Booking Wizard Components

The multi-step booking form is in [components/booking/](components/booking/):
- `BookingWizard.tsx` — top-level client component, owns step state and collected form data
- `Step1Dates.tsx` — date selection using `Calendar.tsx`; fetches unavailable dates from the server at load time
- `Step2Details.tsx` — booker, driver, trip details form
- `Step3Confirmed.tsx` — confirmation screen shown after successful `POST /api/bookings`

### Booking Categories

Category is assigned silently from the `organisations` address book — the public booker never sees category codes:
- **Cat A** — standard community rate (all individuals + most orgs)
- **Cat C** — no charge (Lions Club, RSL, Legacy)

Name matching in `lookupOrganisation()` is a case-insensitive exact match (`LOWER(name) = LOWER($input)`).

### Email

[lib/email.ts](lib/email.ts) wraps Resend. Confirmation emails are sent non-blocking (fire-and-forget with `.catch(console.error)`) after a successful booking insert. `EMAIL_FROM` env var controls the from address.

### Environment Variables

Copy [`.env.local.example`](.env.local.example) to `.env.local`:
- `DATABASE_URL` — Neon connection string
- `NEON_AUTH_BASE_URL` — Neon Auth endpoint
- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — verified sender domain

### Branding

Primary: `#002868` (Lions Club dark blue), accent: `#C97B0A` (amber). Background `#F5F6F8`, borders `#DDE1EA`. Logo assets are in [public/](public/) (`logo-lions.png`, `logo-alpine.png`). Primary font is **DM Sans** (`var(--font-dm-sans)`).

Tailwind color tokens (defined in [tailwind.config.ts](tailwind.config.ts)):
- `brand-blue` `#002868`, `brand-amber` `#C97B0A`, `brand-gold` `#FFD700`, `brand-green` `#1B4332`, `brand-cream` `#F5F0E8`

Large text throughout — minimum 14px body, 19px+ headings — the target audience includes elderly, non-tech-confident users.
