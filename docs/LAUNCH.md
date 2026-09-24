# Launch checklist: Alpine Community Bus v2

Everything here happens outside the code: Neon, Vercel, Resend, GoDaddy, and decisions for Lions.
Do it in this order. Steps marked **(prod)** touch the live site.

---

## 1. Neon: staging branch first

1. **Create a staging branch.** Neon Console → your project → Branches → *Create branch* from `main`, named `staging`. Copy its connection string.
2. **Point local dev at staging.** In `.env.local`, set `DATABASE_URL` to the staging connection string. Don't develop against production.
3. **Check for existing double bookings.** On staging, run this. It must return no rows, or the migration's overlap constraint will fail:
   ```sql
   SELECT a.reference, b.reference, a.start_date, a.end_date, b.start_date, b.end_date
   FROM bookings a JOIN bookings b ON a.id < b.id
   WHERE a.status IN ('confirmed','in_use') AND b.status IN ('confirmed','in_use')
     AND daterange(a.start_date, a.end_date, '[]') && daterange(b.start_date, b.end_date, '[]');
   ```
   Cancel or fix any rows it returns.
4. **Migrate staging:**
   ```bash
   npm run db:migrate -- db/migrations/001_v2_booking_overhaul.sql
   ```
   It runs in one transaction, so it either fully applies or changes nothing.
5. **Seed staging with test data** (refuses to run if there are real bookings):
   ```bash
   npm run db:seed
   ```
   This includes a booking across the October daylight-saving change (47 hours, not 48), one currently out, one returned with damage notes, a cancelled one, one whose dates were changed, and a bounced email.
6. **Neon Auth trusted domains (this is the login fix).** Neon Console → Auth → Settings (Domains / trusted origins). Add:
   - `https://alpinecommunitybus.com.au`
   - `https://www.alpinecommunitybus.com.au`

   The app's `/api/auth` proxy forwards the browser's `Origin`, and Neon rejects origins it doesn't know. That's why login works on the old Vercel URL and fails on the new domain. You don't need a cookie-domain setting: the proxy sets auth cookies on whichever domain serves the page. Staff will need to log in once on the new domain.
7. **(prod) Migrate production** at a quiet time, just before merging (see §5). Between the migration finishing and the new code going live (1–2 minutes), the old code can't create bookings.

## 2. Vercel

Settings → Environment Variables. Set these for **Production**, then redeploy. `NEXT_PUBLIC_*` values are baked in at build time.

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | main branch (unchanged) | **staging branch** |
| `NEON_AUTH_BASE_URL` | unchanged | staging branch's Auth URL if it has its own, else unchanged |
| `NEXT_PUBLIC_APP_URL` | `https://alpinecommunitybus.com.au` | leave unset, or your preview URL |
| `CANONICAL_HOST` | `alpinecommunitybus.com.au` | leave unset |
| `EMAIL_FROM` | `Alpine Community Bus <bookings@alpinecommunitybus.com.au>` | same |
| `RESEND_WEBHOOK_SECRET` | from Resend (§3.5) | same |
| `BLOB_READ_WRITE_TOKEN` | added automatically in step 2 below | same |

1. **Domains.** Settings → Domains: make `alpinecommunitybus.com.au` the primary domain and set `www` to redirect to it. With `CANONICAL_HOST` set, the app also redirects the old `*.vercel.app` production URL to the new domain (preview deployments are left alone).
2. **Blob storage** (return damage photos): Storage → Create → Blob → connect it to this project.
3. **Optional:** Firewall → add a rate-limit rule for `/api/bookings` and `/api/manage/*` as a second layer. The app already rate-limits in the database.

## 3. Resend and GoDaddy DNS (blocker for all email)

1. Resend → Domains → **Add domain** `alpinecommunitybus.com.au`.
2. In GoDaddy → DNS → add **exactly** the records Resend shows. Typically:
   - **MX** `send` → `feedback-smtp.<region>.amazonses.com`, priority 10 (the return path, which handles bounces)
   - **TXT** `send` → `v=spf1 include:amazonses.com ~all` (SPF)
   - **TXT** `resend._domainkey` → the long `p=...` key (DKIM)

   In GoDaddy's *Name* field, enter only `send` / `resend._domainkey`. GoDaddy appends the domain itself, and typing the full domain is the most common reason verification fails.
3. Add **DMARC** too. Gmail and Outlook increasingly expect it:
   - **TXT** `_dmarc` → `v=DMARC1; p=none; rua=mailto:<an inbox you read>`
4. Wait for Resend to show *Verified* (usually minutes, can take a few hours).
5. **Webhook:** Resend → Webhooks → Add endpoint
   `https://alpinecommunitybus.com.au/api/webhooks/resend`
   Events: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, `email.failed`.
   Copy the signing secret (`whsec_...`) into `RESEND_WEBHOOK_SECRET` in Vercel, then redeploy.
6. **Test deliverability.** Make a real booking with a Gmail address and an Outlook/Hotmail address.
   - Check both arrive in the inbox, not spam.
   - In Gmail, open ⋮ → *Show original*: SPF, DKIM and DMARC should all say `PASS`.
   - To test the bounce path, book with `bounced@resend.dev`. It should appear under *Emails that didn't arrive* on the admin dashboard within a minute.
7. In the admin portal → Settings, set **Email Reply-To** to an inbox someone reads. It's also shown as the contact email on the home page.

## 4. Decisions needed from Lions before launch

- **Organisation field:** currently *optional*. If it becomes mandatory, change `organisation` in `lib/validation/booking.ts` (a comment marks the spot) and add an "Individual / no organisation" choice in `components/booking/Step2Details.tsx`.
- **Cancellation cutoff:** Admin → Settings → *Online cancel cutoff (hours before pickup)*. Default is 0, meaning customers can change or cancel online any time before pickup. There's no card payment integration in the code (payment happens at pickup), so **refunds are manual**. The admin gets an email on every customer cancellation.
- **Conditions of use text:** the current version (v1) says "a standard Victorian car licence", "cancel and rebook to change dates" and mentions QR photos. That no longer matches the site (AU/NZ licences, online date changes, odometer recorded at the counter). Publish a revised version in Admin → Conditions. Every booking records which version the customer agreed to.
- **Roles:** your notes mention `lions_admin` / `super_admin`; the app's roles are `admin` (full access) and `lions_staff`. Only those two see licence numbers and addresses. Pickup/return can be recorded by `admin` and `waw_staff`. Change `PII_ROLES` / `COUNTER_ROLES` in `lib/auth.ts` if Lions wants it different.
- **Bus photo:** the home page uses a placeholder illustration (`components/home/BusIllustration.tsx`). Swap in a real photo after the rewrap.

## 5. Git and deploy

1. Review the branch `feat/alpine-community-bus-v2`, commit, push, open a PR.
2. The PR's preview deployment uses the **Preview** env vars, which point at staging. Test there:
   - Book, change dates, cancel (manage link from the email).
   - On a phone: Today view → record pickup → record return with a photo.
   - Check the audit history and email log on the booking detail page.
3. At a quiet time: **(prod)** run the migration on production (§1.7), then merge the PR. Vercel deploys `main` automatically.
4. Bookings made before v2 have no manage link. If a customer needs one, open the booking in admin and press **Resend confirmation**.

## Deferred (don't build yet)

Partner pickup location, EFTPOS/Tyro, deposits and holds, per-km pricing, approved-org address book with invoicing and surcharge waivers, auto-invoicing, SMS. The odometer fields and status states are already in place, so none of these need a schema rewrite.
