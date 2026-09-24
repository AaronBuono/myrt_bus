# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Alpine Community Bus** booking portal (alpinecommunitybus.com.au), operated by the Lions Club of Myrtleford — a Next.js 16 app that replaces a manual paper-based bus booking process for a 12-seater community bus in the Alpine Shire region of Victoria, Australia. The full product spec is in [PRD.md](PRD.md); launch tasks outside the code are in [docs/LAUNCH.md](docs/LAUNCH.md).

**Deployed stack:** Vercel (hosting + Blob for damage photos) + Neon (serverless Postgres + auth) + Resend (transactional email + delivery webhooks)

---

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (also type-checks)
npm test           # Unit + DB integration tests (Node test runner + in-memory Postgres via PGlite)
npm run db:push    # Apply db/schema.sql to an EMPTY database (reads DATABASE_URL from .env.local)
npm run db:migrate -- db/migrations/001_v2_booking_overhaul.sql   # Apply one migration to an existing database
npm run db:seed    # Load test data (refuses to run on a database with real bookings)
```

`npm run lint` is broken: Next 16 removed `next lint` and there's no ESLint config yet.

Tests import app code through [tests/loader.mjs](tests/loader.mjs), which maps `@/…`, stubs `server-only`, and swaps `@/lib/db` for [tests/pglite-db.ts](tests/pglite-db.ts). `tests/` is excluded from `tsconfig.json`.

---

## Architecture

### Route Groups

- `app/(public)/` — No login required: home (`/`), booking wizard (`/book`), self-service manage page (`/manage/[token]`), full conditions (`/conditions`), QR placeholder (`/qr`)
- `app/(protected)/` — Login required, gated by [middleware.ts](middleware.ts) and [app/(protected)/layout.tsx](app/(protected)/layout.tsx): `/waw`, `/coordinator`, `/admin`, `/dashboard`
- `app/api/` — API routes: `POST /api/bookings`, `GET /api/bookings/lookup`, `POST /api/manage/[token]` (cancel / change dates), `POST /api/webhooks/resend` (delivery status), Neon Auth proxy at `/api/auth/[...path]`
- Auth-related pages (no group): `/login`, `/reset-password`, `/unauthorized`

`/dashboard` is not a real page — it redirects to the role-appropriate destination (`/admin` for `admin`, `/coordinator?section=day` for `waw_staff`, `/coordinator` for the rest).

[middleware.ts](middleware.ts) also 308-redirects any non-canonical host to `CANONICAL_HOST` in production (not previews, not `/api/webhooks/*`).

The protected role pages are fully built. Each has tab-based navigation driven by `?section=` URL search params — all rendering is server-side, no client state for navigation.

### Auth Flow

[middleware.ts](middleware.ts) uses `neonAuthMiddleware` to redirect unauthenticated requests on protected routes to `/login`. Inside protected pages, [lib/auth.ts](lib/auth.ts) exposes `getUser()`, `requireRole(...roles)`, `canSeePii(user)` (`PII_ROLES`: admin, lions_staff — licence numbers and addresses) and `canUseCounter(user)` (`COUNTER_ROLES`: admin, waw_staff — record pickup/return). The Neon Auth proxy forwards the browser's `Origin`, so every production domain must be in Neon Auth's trusted domains. Roles are stored in the `users` table with a `neon_auth_user_id` foreign key linking to Neon Auth's managed `neon_auth.users_sync` table.

Role → page access:
- `admin` → `/admin` — full access: bookings (with cancel), pricing, conditions, orgs, staff management, settings, bank details
- `lions_staff` → `/coordinator` — read-only: day view, dashboard, bookings (sees licence numbers + addresses)
- `bus_coordinator` → `/coordinator` — read-only: day view, dashboard, bookings (no licence numbers / addresses)
- `waw_staff` → `/coordinator` (lands on the day view) — records pickups and returns; no licence numbers / addresses

Permission boundaries:
- All write operations except pickup/return (cancel/change/resend booking, pricing, conditions, orgs/staff/settings/bank) require `admin`
- Pickup/return (`app/actions/counter.ts`) require a `COUNTER_ROLES` role
- `/waw` (bank/payment details page) is `admin`-only
- Only `admin` can add, edit, or deactivate staff and assign roles

Public bookers have **no accounts**. Their reference (`ACB-` + 6 chars from an alphabet without 0/O/1/I/L, see [lib/reference.ts](lib/reference.ts); legacy rows use `BK-YYYY-NNN`) identifies the booking to staff, and a private manage link lets them change or cancel it. The link holds a 32-byte random token; only its SHA-256 is stored (`bookings.manage_token_hash`). It's cleared on cancel/pickup and replaced on date change or admin resend.

### Database Layer

[lib/db.ts](lib/db.ts) exports a `sql` tagged-template function using Neon's serverless driver. All DB access goes through this. Query helpers are grouped in [lib/queries/](lib/queries/):
- `booking.ts` — booking lifecycle shared by public and admin code: create, manage-link lookup, cancel, change dates, rotate token, email data, unavailable dates
- `admin.ts` — staff-facing reads and writes (bookings list/detail, day view, pickup/return, audit + email logs, pricing, conditions, settings, bank, organisations, users)
- `home.ts` — homepage data (pricing zones, active bank + opening hours, contact email)

The full schema is in [db/schema.sql](db/schema.sql) (fresh installs); existing databases get [db/migrations/](db/migrations/) applied in order. Test data: [db/seed.sql](db/seed.sql). Key design points:
- Pricing rates are **snapshotted into each booking row** at confirmation time — existing bookings are never affected by rate changes.
- `conditions_of_use` is versioned; the `is_current` partial unique index enforces a single active version. Bookings store `conditions_version_id` + `conditions_accepted_at` (this replaces the paper signature).
- `bank_records` similarly has a partial unique index for the single active bank. `opening_hours.day_of_week`: 0 = Monday … 6 = Sunday.
- Booking status lifecycle: `confirmed → picked_up → returned` (or `cancelled`). Only `confirmed` and `picked_up` block the calendar.
- **Times:** `pickup_at` / `return_at` (timestamptz, UTC) are the source of truth; `start_date`/`end_date`/`pickup_time`/`dropoff_time` are Melbourne-local copies. Convert with `melbourneToUtc()` and display with the helpers in [lib/time.ts](lib/time.ts), which always use `Australia/Melbourne`.
- **Double-booking prevention** is in the database: the `bookings_no_overlap` exclusion constraint (btree_gist, `tstzrange(pickup_at, return_at, '[)')`, active statuses only). It's `DEFERRABLE` so a date change can cancel + re-insert in one statement. Catch it with `isOverlapViolation()` (SQLSTATE 23P01).
- **Date changes** cancel the old row (reason "Dates changed; replaced by …") and insert a replacement with `replaces_booking_id`, a new reference and a new token, so staff can recognise an old confirmation.
- `audit_log` records every booking status change and admin edit (`logAudit()` in [lib/audit.ts](lib/audit.ts), or an audit CTE inside the booking statement). `email_log` records every send; the Resend webhook updates its status.
- `purpose` and `passenger_count` are no longer collected; the columns stay for historic rows.

**Transactions:** Neon's HTTP driver runs every query in its own transaction, so `sql\`BEGIN\`` / `sql\`COMMIT\`` across separate calls is **not** atomic. Put related writes in one statement with data-modifying CTEs (see `createBooking`, `modifyBookingDates`, `updateZoneRate`), or use `getDb().transaction([...])`.

### Booking API

`POST /api/bookings` — rate-limited, validates with the shared zod schema ([lib/validation/booking.ts](lib/validation/booking.ts), also used by the wizard), rejects a stale conditions version (409 `conditions_changed`), looks up the org, snapshots pricing, and inserts `bookings` + `booking_drivers` + `audit_log` in one statement (retrying on reference collision). An overlap returns 409 `unavailable`. The confirmation email is sent in `after()`.

`POST /api/manage/[token]` — `{action: "cancel"}` or `{action: "modify", startDate, endDate, pickupTime, returnTime}`. Blocked after pickup time and within `system_settings.self_cancel_cutoff_hours` (0 = no cutoff). Customer cancellations email the customer and `admin_notify_email` (or every active admin).

Rate limiting ([lib/rate-limit.ts](lib/rate-limit.ts)) is a fixed-window counter in the `rate_limits` table, keyed by a hash of the client IP; it fails open.

`GET /api/bookings/lookup?name=<org>` — used by the booking wizard to silently check whether a booker name matches a known organisation (returns `category` and `isInvoicedOrg`).

### Admin Portal

Admin mutations live in [app/actions/admin.ts](app/actions/admin.ts) and counter (pickup/return) mutations in [app/actions/counter.ts](app/actions/counter.ts), as Next.js Server Actions — they call `requireRole()` internally, then the relevant query, then `logAudit()` and `revalidatePath`.

**`/admin`** (`admin`) — 8-tab portal. Each tab is a server component under [app/(protected)/admin/sections/](app/(protected)/admin/sections/):
- `DaySection` (`section=day`, "Today") — mobile-first counter view for a Melbourne date (`&date=`): pickups, returns, overdue, and cancelled bookings greyed out. Pickup/return forms are client components (`PickupForm`, `ReturnForm`; the return form shrinks damage photos in the browser before uploading to Vercel Blob)
- `DashboardSection` — stat cards, emails that bounced/failed, recent bookings
- `BookingsSection` — filterable table with cancel; rows are clickable; filter state lives in URL params so the filter form uses `method="GET"` with a hidden `name="section"` input to preserve the tab
- `PricingSection` — per-zone rate, one form per zone
- `ConditionsSection` — publish new version (textarea → server action), collapsible version history via `<details>`
- `OrgsSection` — address book CRUD; edit/create state uses `?editId=` / `?create=1` URL params so the form and table coexist on the same server-rendered page
- `StaffSection` — same URL-param pattern as orgs; toggle active uses a plain form POST; role options: `admin`, `lions_staff`, `bus_coordinator`, `waw_staff`
- `SettingsSection` — org settings, bank details, per-day opening hours (one form per row)

The booking detail (`BookingsSection` → `BookingDetailSection`) takes a `viewer` ({ canManage, showPii, basePath }). Admins get cancel, change dates (`&modify=1`), and resend confirmation (which issues a new manage link); everyone sees the audit history and email log.

**`/coordinator`** (`lions_staff`, `bus_coordinator`, `waw_staff`) — Today + Dashboard + Bookings tabs; reuses the admin section components with a restricted `viewer`.

**`/waw`** (`admin`) — Single page (no tabs): payment/bank details, currently-in-use indicator, upcoming confirmed bookings awaiting payment. Admin-only.

**Shared admin components** in [components/admin/](components/admin/):
- `AdminNav.tsx` — tab link list; receives current section as prop, no client JS
- `StatusBadge.tsx` — maps booking status strings to coloured badge classes
- `CancelBookingBtn.tsx` — client component; uses `useTransition` + `window.confirm`
- `ResendConfirmationBtn.tsx`, `ModifyDatesForm.tsx`, `PickupForm.tsx`, `ReturnForm.tsx` — client components using `useActionState`
- `ClickableRow.tsx` — client component; wraps a `<tr>` with router navigation on click, skipping clicks on buttons/links/forms

**Neon null parameter gotcha:** when filtering with optional parameters in tagged-template SQL, always cast nullable params explicitly (e.g. `${value ?? null}::text`) — bare `null` causes a "could not determine data type" error because PostgreSQL can't infer the type of an untyped `$N` parameter.

### Booking Wizard Components

The multi-step booking form is in [components/booking/](components/booking/):
- `BookingWizard.tsx` — top-level client component, owns step state and collected form data
- `Step1Dates.tsx` — `DateRangePicker` (also used by the manage page) + zone choice
- `Step2Details.tsx` — contact, driver (licence state, "same as contact address"), trip, conditions checkbox; validates with the shared zod schema and shows per-field errors
- `Step3Confirmed.tsx` — confirmation screen shown after successful `POST /api/bookings`
- `Calendar.tsx` — month grid + date helpers. `toISO()` uses **local** date parts (UTC would shift Melbourne mornings back a day)

### Booking Categories

Category is assigned silently from the `organisations` address book by the (optional) organisation name — the public booker never sees category codes:
- **Cat A** — standard community rate (all individuals + most orgs)
- **Cat C** — no charge (Lions Club, RSL, Legacy)

Name matching in `lookupOrganisation()` is a case-insensitive exact match (`LOWER(name) = LOWER($input)`).

### Email

[lib/email.ts](lib/email.ts) wraps Resend with a branded layout, HTML escaping (`esc()` — always escape user input) and a plain-text part. `sendEmail()` records every send in `email_log`; [lib/notifications.ts](lib/notifications.ts) loads booking data and sends confirmations/cancellations. Send them inside `after()` from `next/server` — an unawaited promise can be frozen when a Vercel function returns. `EMAIL_FROM` controls the from address.

### Environment Variables

Copy [`.env.local.example`](.env.local.example) to `.env.local`:
- `DATABASE_URL` — Neon connection string (use a staging branch locally)
- `NEON_AUTH_BASE_URL` — Neon Auth endpoint
- `NEXT_PUBLIC_APP_URL` — public origin for links in emails; `CANONICAL_HOST` — production host to redirect to
- `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET` — Resend
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (damage photos)
- `NEON_FETCH_ENDPOINT` — optional, local dev only: point the Neon driver at a local Neon HTTP proxy

### Branding

Site name "Alpine Community Bus" and URLs live in [lib/site.ts](lib/site.ts). Primary: `#002868` (dark blue), accent: `#C97B0A` (amber). Background `#F5F6F8`, borders `#DDE1EA`. Favicon/app icons are generated from [app/icon.svg](app/icon.svg) (copy in `public/logo-acb.svg`); partner logos are `public/logo-lions.png`, `public/logo-alpine.png`. Primary font is **DM Sans** (`var(--font-dm-sans)`).

Home page motion uses `motion` (`import { motion } from "motion/react"`) only in the client components in [components/home/Motion.tsx](components/home/Motion.tsx); the page stays a server component, the app is wrapped in `<MotionConfig reducedMotion="user">`, and CTAs are never inside an animated wrapper that hides them.

Tailwind color tokens (defined in [tailwind.config.ts](tailwind.config.ts)):
- `brand-blue` `#002868`, `brand-amber` `#C97B0A`, `brand-gold` `#FFD700`, `brand-green` `#1B4332`, `brand-cream` `#F5F0E8`

Large text throughout — minimum 14px body, 19px+ headings — the target audience includes elderly, non-tech-confident users.
