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
- `app/(protected)/` — Login required, gated by [middleware.ts](middleware.ts): `/waw`, `/coordinator`, `/admin`, `/dashboard`
- `app/api/` — API routes: `POST /api/bookings`, `GET /api/bookings/lookup`, Neon Auth proxy at `/api/auth/[...path]`

### Auth Flow

[middleware.ts](middleware.ts) uses `neonAuthMiddleware` to redirect unauthenticated requests on protected routes to `/login`. Inside protected pages, [lib/auth.ts](lib/auth.ts) exposes `getUser()` and `requireRole(...roles)`. Roles are stored in the `users` table with a `neon_auth_user_id` foreign key linking to Neon Auth's managed `neon_auth.users_sync` table. The three roles are `waw_staff`, `bus_coordinator`, and `lions_admin`.

Public bookers have **no accounts** — the booking reference number (format `BK-YYYY-NNN`) is their only identifier.

### Database Layer

[lib/db.ts](lib/db.ts) exports a `sql` tagged-template function using Neon's serverless driver. All DB access goes through this. Query helpers are grouped in [lib/queries/](lib/queries/): `booking.ts` (public booking flow), `admin.ts`, `home.ts`.

The full schema is in [db/schema.sql](db/schema.sql). Key design points:
- Pricing rates are **snapshotted into each booking row** at confirmation time — existing bookings are never affected by rate changes.
- `conditions_of_use` is versioned; the `is_current` partial unique index enforces a single active version.
- `bank_records` similarly has a partial unique index for the single active bank.
- Booking status lifecycle: `confirmed → in_use → pending_inspection → complete` (or `cancelled`).

### Booking Categories

Category is assigned silently from the `organisations` address book — the public booker never sees category codes:
- **Cat A** — standard community rate (all individuals + most orgs)
- **Cat C** — no charge (Lions Club, RSL, Legacy)

Name matching happens server-side in `lookupOrganisation()` in [lib/queries/booking.ts](lib/queries/booking.ts).

### Email

[lib/email.ts](lib/email.ts) wraps Resend. Confirmation emails are sent non-blocking (fire-and-forget with `.catch(console.error)`) after a successful booking insert. `EMAIL_FROM` env var controls the from address.

### Environment Variables

Copy [`.env.local.example`](.env.local.example) to `.env.local`:
- `DATABASE_URL` — Neon connection string
- `NEON_AUTH_BASE_URL` — Neon Auth endpoint
- `RESEND_API_KEY` — Resend API key
- `EMAIL_FROM` — verified sender domain

### Branding

Primary: `#002868` (Lions Club dark blue), accent: `#C97B0A` (amber). Background `#F5F6F8`, borders `#DDE1EA`. Logo assets are in [public/](public/) (`logo-lions.png`, `logo-alpine.png`). Inter/Segoe UI font stack. Large text throughout — minimum 14px body, 19px+ headings — the target audience includes elderly, non-tech-confident users.
