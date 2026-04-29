# Product Requirements Document
## Myrtleford Lions Club — Community Bus Booking Portal

**Version:** 1.0  
**Status:** Draft  
**Source:** `bus-portal-requirements-final.docx` v1.0 + `myrtleford-bus-prototype.html`

---

## 1. Overview

The Myrtleford Lions Club Inc. operates a Toyota HiAce Commuter 12-seater community bus serving the Alpine Shire region. This portal replaces a manual paper-based booking process. Keys are held at WAW Credit Union, Myrtleford, who handle payment collection and key handover. Registered community organisations are invoiced monthly or quarterly.

**Preferred domain:** myrtlefordcommunitybus.com.au *(not yet registered)*

---

## 2. Design Principles

| Principle | Detail |
|---|---|
| Simple first | Every screen has one clear purpose. No clutter. |
| Accessible | Large text, plain Australian English, assume elderly non-tech-confident users. |
| Mobile first | Works on any phone, tablet, or desktop — no app required. |
| Branding | Lions Club dark blue `#002868`, amber accent `#C97B0A`, clean and professional. |
| No public accounts | The booking reference number is the only identifier for public bookers. |

**Prototype reference:** The supplied `myrtleford-bus-prototype.html` establishes the visual language — card-based layout, sticky header, Inter/Segoe UI font stack, `#F5F6F8` background, `#DDE1EA` borders, `#002868` primary buttons, `#C97B0A` call-to-action buttons.

---

## 3. Users & Roles

| Role | Login | Access |
|---|---|---|
| Public Booker | None — no login required | Book the bus, submit QR photos |
| WAW Staff | Created by Lions Admin | Check-in lookup, payment, key handover, flag booker history, in-app notifications |
| Bus Coordinator | Created by Lions Admin | Mobile return inspection checklist, in-app notifications |
| Lions Admin | Master admin login | Full system — bookings, address book, invoicing, reports, flags, conditions of use, login management, notification config |

**Login management rules:**
- Only Lions Admin can create, edit, or deactivate other logins.
- Each login holds: display name, role, email, password, notification preferences.
- Deactivating a login immediately revokes access.
- Lions Admin master login cannot be deactivated from within the portal.

---

## 4. Booking Categories

Category is assigned silently by the system from the address book. The public booker never sees category codes.

| Category | Who | Rate |
|---|---|---|
| A — Community Rate | All public bookers; pre-approved community orgs assigned Cat A | Standard community rate (see Section 5) |
| C — No Charge | Lions Club of Myrtleford (official business); Myrtleford RSL & Legacy (incl. Ladies Auxiliary) | $0 |

System logic: on name entry in Step 2, silently match against address book. Match → apply assigned category. No match → default Cat A.

---

## 5. Pricing

Rates are per 24-hour period. Category C is always $0 regardless of zone or days. Rates are editable by Lions Admin — changes take effect immediately for new bookings; existing confirmed bookings are locked at the rate in place at confirmation.

| Destination Zone | Examples | Rate per Day |
|---|---|---|
| Local Area | Albury-Wodonga, Wangaratta, Yarrawonga, Benalla-Euroa | $68 |
| Shepparton / Mansfield | | $88 |
| Bendigo / Echuca | | $108 |
| Melbourne | CBD, MCG, Marvel Stadium, Airport | $149 |
| Melbourne Outer | SE Suburbs, Frankston, Geelong | $216 |
| Far Destinations | Mornington Peninsula, Surf Coast, Philip Island, Canberra | $311 |
| Additional day rate | Per extra 24hrs or part thereof — all categories | $68 |

---

## 6. Payment Model

No online payment. The site confirms the booking and displays the amount owing.

| Booker Type | Payment Method | Timing |
|---|---|---|
| Individual | In person at WAW Credit Union | On collection day, before keys are handed over |
| Registered Org (Cat A) | Invoice — monthly or quarterly | Auto-generated; paid by EFT to Lions bank account |
| Cat C (Lions / RSL / Legacy) | No charge | No payment required |

---

## 7. Site Structure

### Public Pages (no login required)

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Welcome, how it works, pricing, Book Now |
| Book the Bus | `/book` | 3-step booking flow |
| QR Check Page | `/qr` | Mobile photo submission — fuel, odometer, incidents |

### Protected Pages (login required)

| Page | Route | Login | Purpose |
|---|---|---|---|
| WAW Check-In | `/waw` | WAW login | Booking lookup, payment, key handover, return |
| Bus Coordinator | `/coordinator` | Coordinator login | Mobile return inspection |
| Admin Portal | `/admin` | Admin login | Full system management |

---

## 8. Public Pages

### 8.1 Home Page

Kept deliberately simple. Large text, single clear call to action.

**Contains:**
- Myrtleford Lions Club name + logo (high-res PNG received)
- Alpine Shire Council logo (high-res PNG received — confirm usage approval)
- Tagline: *"Available to community groups and residents across the Alpine Shire region"*
- How It Works — 4 steps with large numbered icons: Check Dates → Book Online → Pay at WAW → Collect Keys
- Pricing table — community rate by destination zone, no category codes
- Large prominent "Book the Bus" button
- Contact details for enquiries — Lions Bus Commissioner
- WAW Credit Union callout with opening hours (from Settings — see Section 13)
- Footer: keys and payment at WAW Credit Union, Myrtleford

**Design rules:**
- Large font sizes throughout (minimum 14px body, headings 19px+)
- No more than two actions visible on screen at any time
- No jargon or category codes visible to the public

---

### 8.2 Public Booking Flow — 3 Steps

Progress indicator displayed clearly at the top of every step. Back button on every step.

#### Step 1 — Select Your Dates and Destination

**Calendar:**
- Large, easy-to-read monthly calendar
- Unavailable dates shown in red with strikethrough — cannot be selected
- Available dates selectable by tap or click
- Multi-day selection — tap each day individually
- Selected dates shown in blue
- Summary below calendar: *"3 days selected — 2 Jun to 4 Jun 2026"*
- Month navigation arrows — large and easy to tap

**Destination Zone:**
- Six zones as large selectable cards
- Each card shows: zone name, example destinations, rate per day
- Selected zone highlighted in blue
- Once both dates and zone selected, estimated amount displayed prominently: *"Estimated amount due at WAW: $149"*

**Validation:**
- Continue button greyed out until at least one date AND a zone are selected

---

#### Step 2 — Your Details

Three clearly labelled sections. Large input fields. Plain labels. No jargon.

**Section A — Organisation or Your Name**
- Organisation or individual name (required)
- Contact person (required)
- Contact phone (required)
- Email address (required — confirmation sent here)
- *On name entry:* system silently checks address book and shows small indicator — either "Lions Club — No Charge" or "Community Rate — $X due at WAW"

**Section B — Driver Details**
- Driver's full name (required)
- Driver's mobile number (required)
- Driver's licence number (required)
- Licence expiry date — Day / Month / Year dropdowns, displayed as DD-MMM-YYYY (required)
- Driver's home address (required)
- "I confirm the driver is 21 years of age or older" — checkbox (required)
- Helper note: *"A standard Victorian car licence is sufficient for this vehicle"*

**Section C — Trip Details**
- Pick-up time — booking start date displayed + 15-minute interval time dropdown (required)
- Drop-off time — booking end date displayed + 15-minute interval time dropdown (required)
- Destination — city or venue name (required)
- Purpose of trip (optional)
- Number of passengers including driver — maximum 12, validated (optional)

**Conditions of Use:**
- Scrollable panel displaying the full Conditions of Use text (editable by Lions Admin — see Section 13)
- "I have read and agree to the Conditions of Use" — single checkbox (required)
- Cannot proceed without ticking
- Acceptance recorded with timestamp against the booking record

**Validation:**
- All required fields must be completed before proceeding
- Clear, plain-language error messages for missing fields
- Age confirmation checkbox must be ticked
- Conditions of Use must be accepted
- Passenger count capped at 12 with a warning if exceeded

---

#### Step 3 — Booking Confirmed

**Confirmation Banner:**
- Large green tick and bold "Booking Confirmed" message
- Booking reference shown prominently (format: BK-YYYY-NNN, e.g. BK-2026-147)
- "A confirmation has been sent to [email address]"

**Payment Notice (by category):**
- Cat A individual: *"Amount due at WAW Credit Union: $X — bring this confirmation and your driver's licence"*
- Cat A invoiced org: *"Your organisation will be invoiced. No payment required at WAW."*
- Cat C: *"No payment required."*

**What Happens Next — 4 numbered steps:**
1. Check your email — save or print your confirmation before your trip
2. Go to WAW Credit Union, Myrtleford — bring your confirmation and driver's licence
3. Pay and collect the keys — WAW will go through a short checklist with you
4. Return the bus and keys to WAW — ensure it is clean and the tank is full

**QR Code Instructions:**
- "Before you drive away, scan the QR code on the sticker inside the bus to record the fuel level and odometer reading"
- "Do the same when you return, before you hand the keys back to WAW"

**Printable Booking Confirmation** (print-optimised layout):
- Lions Club and Alpine Shire logos at top
- Booking reference number
- All booking details — hirer, driver, trip, dates, times, destination, passengers, amount due
- QR code linking to the photo submission page for this booking
- Condensed Conditions of Use
- Key collection instructions
- $100 cleaning fee and full tank reminder

---

### 8.3 QR Mobile Page — Photo & Incident Submission

Accessed by scanning the QR code sticker inside the bus, or the QR code on the printed booking form. No app required — opens in the phone browser. No login required. Booking reference links photos to the correct booking record.

**Pre-Trip Submission (On Pick-Up — before driving away):**
- Booking reference field (pre-filled if accessed via confirmation QR)
- "Take a photo of the fuel gauge" — upload button
- "Take a photo of the odometer" — upload button
- Timestamp captured automatically
- "Submit Pre-Trip Photos" — large submit button

**Post-Trip Submission (On Return — before handing keys to WAW):**
- Booking reference field (pre-filled if same device)
- "Take a photo of the fuel gauge" — upload button
- "Take a photo of the odometer" — upload button
- Timestamp captured automatically
- "Did anything happen during this trip?" — Yes / No
  - If Yes: incident report — description, location, up to 3 photo uploads, timestamp, immediate notification to Lions Admin
- "Submit Return Photos" — large submit button

Both pre and post submissions are attached to the booking record and visible side by side in the admin portal and WAW check-in screen.

**Design rules for QR page:**
- One prompt per screen — no scrolling required
- Very large buttons and text
- Plain language throughout
- Works on any smartphone camera

---

## 9. Protected Pages

### 9.1 WAW Check-In

Shared WAW login — single password for all WAW staff.

**Booking Lookup:**
- "Enter booking reference" — single large text field
- Large Look Up button (also triggered by pressing Enter)
- Reference is case-insensitive
- Clear plain-language error if not found

**Booking Detail Screen:**
- Reference number, booker / organisation name, driver name and licence number
- Booking dates and times, destination zone, amount due / No Charge / Invoice

**Booker History Flags** (shown prominently before checklist):
- Displayed in amber or red
- Shows all prior flags against this booker or organisation
- Examples: "Tank returned empty — 14 Mar 2026", "Returned late — 2 Feb 2026"

**Pre-Trip Checklist (Keys Out):**
- [ ] Photo ID sighted — matches driver name on booking
- [ ] Driver confirmed 21 years or older
- [ ] Payment collected — amount shown (or "Invoice — no payment required" or "No charge")
- [ ] Logbook handed to driver
- [ ] Vehicle condition noted
- [ ] QR code process explained to driver
- **Action button:** "Mark as Paid & Keys Collected" → status moves to **In Use**

**Return Checklist (Keys In):**
- [ ] Pre-trip and post-trip QR photo submissions received
- [ ] Keys returned
- [ ] Logbook returned and completed
- [ ] Any issues to flag against this booker?

**Flag Booker:**
- Flag types: Empty tank / Late return / Returned dirty / Damage / Other
- Free text notes field
- Flag saved to booking record and booker history — visible on all future check-ins

- **Action button:** "Mark as Keys Returned" → status moves to **Pending Inspection**, triggers Bus Coordinator task

---

### 9.2 Bus Coordinator Mobile View

Mobile-optimised. Designed to be used on-site at the bus. One question per screen throughout.

**Dashboard — two options on login:**

**Option 1 — Post-Booking Inspection:**
- List of bookings pending return inspection
- Each entry: booker name, return date, booking reference
- Tap to open inspection

**Option 2 — Log Maintenance:**
- Opens maintenance entry form (available at any time, not tied to a specific booking)

**Return Inspection — one question per screen:**
1. Odometer reading on return — number input
2. Fuel level on return — Full / Three-quarter / Half / Below half
3. Was the tank full when returned? — Yes / No
4. Interior cleanliness — Good / Acceptable / Dirty
5. Exterior condition — No issues / Minor marks / Damage found
6. If damage found — photo upload + description of damage
7. Logbook completed correctly? — Yes / No / Incomplete
8. Any other issues? — free text, optional
9. Your name — text field (captured manually as login is shared)
10. Review summary screen — all answers shown before submitting
11. Submit inspection

**On inspection submission:**
- Report attached to booking record in admin portal
- Any adverse flags (dirty, damage, fuel below full, logbook incomplete) automatically added to booker history
- Lions Admin notified immediately of any damage or issues
- Booking status updated to **Complete**

**Maintenance Log Entry** (also accessible via full admin portal):
- Date of maintenance (required)
- Odometer reading at time of service (required)
- Type of work — Service / Repair / Tyre / Cleaning / Other (required)
- Description of work carried out (required)
- Provider / workshop name (required)
- Cost (optional)
- Next service due — date or odometer, whichever applies (optional)
- Your name (required)

On submission: entry added to asset register maintenance history log with timestamp; Lions Admin notified; next service due date / odometer updated on asset record if provided.

---

### 9.3 Admin Portal

Full system access. Desktop-optimised but functional on tablet.

**Dashboard:**
- Summary stats: bookings this month, revenue collected, outstanding invoices, bus currently in use
- Bookings pending return inspection
- Active incidents or damage flags
- Public liability policies expiring within 30 days

---

**Bookings Tab:**
- Full bookings list with filters: date range, status, category, booker name
- Status indicators: Pending / Confirmed / In Use / Pending Inspection / Complete / Cancelled
- Each booking expandable to show: booking details, driver info, Conditions of Use acceptance timestamp, pre/post QR photos side by side, incident report, return inspection report, booker flags
- Ability to cancel a booking on behalf of a booker
- Ability to add a manual flag to booker history

---

**Address Book Tab:**
- Full list of registered organisations
- Per entry: name, category, authorised contact, phone, email, invoicing frequency, public liability status, policy expiry
- Expiry warning when policy is within 30 days of expiry or has lapsed
- Booker history flags listed per organisation
- Add / edit / remove organisations
- Upload / replace public liability certificate of currency

**Each organisation record holds:**
- Organisation name
- Booking category (A or C)
- Authorised contact person
- Contact phone
- Contact email
- Invoicing frequency (monthly or quarterly) — Cat A only
- Public liability insurance held (yes / no)
- If yes: insurer name, policy number, policy expiry date, certificate of currency upload
- Notes
- Booker history flags

**Address book rules:**
- Only Lions Admin or WAW can create, edit, or remove organisation records
- Certificate upload is required if insurance checkbox is ticked
- System shows expiry warning when policy is within 30 days of expiry or has lapsed

---

**Asset Register Tab:**
- Full list of all assets — current and retired
- Accessible by Lions Admin (full access) and Bus Coordinator (view + maintenance log only) — not visible to WAW
- Only Lions Admin can add, edit, or retire an asset record
- Records are never deleted — retired assets retained permanently

**Vehicle record fields:**
- Asset ID (auto-generated), make, model, year, body type, colour, seating capacity, VIN / chassis number, engine number
- Registration: plate number, expiry date, state (VIC), registered operator — expiry warning at 30 days
- TAC charge due date — warning at 30 days
- Insurance: insurer name, policy number, expiry date (warning at 30 days), coverage type, annual premium
- Ownership: date acquired, acquired from, acquisition method, purchase price / transfer value, current estimated value
- Maintenance: last service date and odometer, next service due, service provider, full maintenance history log
- Status: Active / Retired / Disposed; date retired / disposed; reason; notes

**Asset alerts (notified to Lions Admin):**
- Registration expiry within 30 days
- TAC charge due within 30 days
- Insurance policy expiry within 30 days
- Next service due date reached or odometer threshold passed

---

**Pricing Tab:**
- Editable table of all current zone rates and additional day rate
- Changes take effect immediately for new bookings
- Existing confirmed bookings locked at the rate in place at confirmation
- Rate changes logged with date and time for audit purposes
- Pricing flows automatically through: booking estimate → confirmation → WAW check-in → tax invoice → org invoice → reports

---

**Invoicing Tab:**

*Consolidated Organisation Invoice (Cat A organisations):*
- Invoicing frequency set per organisation: monthly or quarterly
- System auto-generates and emails invoices on schedule
- Manual generation also available at any time
- Invoice auto-populated from confirmed booking records — no manual data entry
- Invoice status tracked: Draft / Sent / Paid
- Stored against the organisation record

*Invoice contains:*
- Lions Club name, registration number, ABN, postal address
- Lions Club logo and Alpine Shire Council logo
- Invoice number (sequential, auto-generated)
- Invoice date
- Organisation name, address, contact person (from address book)
- Line-by-line booking table: reference, date(s), destination, days, rate per day, line total
- Total amount due
- "Please quote invoice number in your payment advice"
- WAW BSB and account number
- Lions Treasurer name and contact mobile

*Tax Invoice — Paid (individual bookings):*
- Auto-generated when WAW marks a booking as paid
- Emailed immediately to booker's email address
- Can be manually triggered by WAW or Lions Admin
- Stored against the booking record

*Tax Invoice contains:*
- Lions Club name, registration number, ABN, postal address
- Lions Club logo and Alpine Shire Council logo
- Invoice number (separate sequential series from org invoices)
- Invoice date (date payment was recorded)
- Booker name and contact details, driver name
- Description: hire of community bus — date(s), destination zone, destination, number of days
- Rate per day and total amount
- Payment status: PAID — date paid, method (cash / card / EFT)
- No GST applies
- Lions Treasurer name and contact mobile

---

**Print Sheet Tab:**
- Selectable period: next 7 days / next 14 days / this month
- Formatted WAW counter reference sheet with manual tick boxes: ID / Paid / Keys Out / Keys In
- Print button

---

**Reports Tab:**
- Revenue by destination zone (bar chart)
- Bookings by category and by month
- Outstanding payments and overdue invoices
- Booker history flags summary — repeat offenders visible

---

**Login Management Tab:**
- List of all active logins: name, role, email, last login date, status
- Add new login — set name, role, email, temporary password
- Edit existing login — update name, email, password, notification preferences
- Deactivate login — immediately revokes access
- Per-login notification preferences — toggle each notification event on/off independently
- Lions Admin master login is not editable from this tab

---

**Conditions of Use Tab:**
- Full editable text of the Conditions of Use
- Changes apply to all new bookings from the point of change
- Previous versions retained for reference

**Current conditions text (18 clauses):**
1. For community use only — not for commercial or profit-making purposes
2. Maximum 12 passengers including the driver at all times
3. Driver must be 21 years of age or older
4. A standard Victorian car licence is sufficient for this vehicle
5. No smoking — prohibited by law in all vehicles
6. No alcohol — strictly prohibited on board at any time
7. Seatbelts must be worn by all passengers at all times when in motion
8. The hirer is responsible for the conduct and behaviour of all passengers
9. The bus must be returned with a full tank of fuel
10. If fuel is below full on return, the cost of refuelling plus a surcharge will be charged *(surcharge amount TBC — see Open Items)*
11. The bus must be returned in a clean condition — a $100 cleaning fee applies if returned dirty
12. Late returns are charged at $68 per 24-hour period or part thereof beyond the agreed drop-off time
13. The hirer must submit fuel gauge and odometer photos via the QR code before departure and again on return
14. Any accident or incident during the hire period must be reported immediately via the QR incident report
15. The hirer accepts liability for any damage caused to the vehicle during the hire period
16. To change booking dates, the existing booking must be cancelled and a new booking made
17. Late cancellations and policy breaches are recorded against the hirer's booking history
18. Lions Club of Myrtleford reserves the right to refuse future bookings based on hire history

---

**Settings Tab:**

All values configured here flow automatically to the home page, booking confirmation, invoices, and WAW check-in screen. No hardcoded values anywhere in the system.

*Key Collection Bank:*
- Multiple bank records can be stored
- A single checkbox marks which one is currently active
- Active bank fields: bank name, street address, phone number, BSB, account number
- Changing the active bank updates all screens automatically

*Opening Hours (Active Bank):*
- Set per day of the week (Mon–Sun): Open / Closed toggle, opening time, closing time
- Displayed on home page, booking confirmation, printable form, and WAW check-in screen

*Lions Club Details:*
- Registered name, registration number, ABN, postal address, Treasurer name, Treasurer mobile

*Email Settings:*
- System from-address (default: NoReply@myrtlefordcommunitybus.com.au)
- Reply-to address (optional)

---

## 10. Notifications

Email as minimum for launch. SMS to be considered post-launch. All notification routing is configurable per login by Lions Admin.

**In-App Notification Bell:**
- Appears at the top of every screen for logged-in users (WAW, Bus Coordinator, Lions Admin)
- Shows unread notification count as a badge
- Clicking opens a notification panel showing recent events with timestamp
- Notifications marked as read when panel is opened

**Email Notifications — Default Routing:**

| Event | WAW | Bus Coord. | Lions Admin |
|---|:---:|:---:|:---:|
| New booking confirmed | ✓ | | ✓ |
| Bus In Use — keys collected | ✓ | | ✓ |
| QR photos submitted — pre-trip | ✓ | | |
| QR photos submitted — post-trip | ✓ | | ✓ |
| Incident reported | ✓ | | ✓ |
| Keys returned | ✓ | ✓ | ✓ |
| Return inspection submitted | | | ✓ |
| Flag added to booker | | | ✓ |
| Invoice generated | ✓ | | ✓ |
| Public liability expiring (30 days + 7 days) | ✓ | | ✓ |

*Booking confirmation to public booker and invoice to organisation contact are always sent and are not configurable.*

---

## 11. Booking Status Lifecycle

```
Confirmed
    ↓ WAW: Mark as Paid & Keys Collected
In Use
    ↓ WAW: Mark as Keys Returned
Pending Inspection
    ↓ Bus Coordinator: Submit return inspection
Complete
```

Cancellation can occur from any pre-In Use status by Lions Admin (or WAW) on behalf of the booker.

---

## 12. Out of Scope — Current Version

- Online payment processing
- Individual user accounts for public bookers
- Self-service booking amendments
- SMS notifications
- Driver accreditation checks
- Recurring or standing bookings
- Integration with accounting software (Xero, MYOB)

---

## 13. Open Items — To Be Confirmed

### Business
| Item | Status |
|---|---|
| Conditions of Use final text | ✅ Confirmed — text approved as-is |
| Lions Club logo | ✅ Confirmed — high-resolution PNG received |
| Alpine Shire Council logo | ✅ Confirmed — high-resolution PNG received |
| Alpine Shire logo usage | ✅ Confirmed — approved for use on portal and invoices |
| WAW Credit Union address | ✅ Confirmed: 27 Clyde St, Myrtleford VIC 3737 |
| Fuel surcharge amount | ✅ Confirmed — TBC (awaiting figure) |
| Lions banking details | WAW BSB and account number for invoice payment instructions — TBC |
| Lions Club registration number & ABN | TBC |
| Lions Club postal address | Confirm PO Box or street address for invoice header |
| Lions Treasurer name and mobile | TBC |
| Lions Admin master login credentials | Confirm for production |
| Invoice numbering starting numbers | Confirm starting number for individual and org invoice series |

### Technical
| Item | Status |
|---|---|
| Email provider | ✅ Confirmed — **Resend** (resend.com). Native Vercel integration, purpose-built for transactional email, excellent Next.js SDK. Neon handles database and auth only — email is a separate service. |
| Hosting | ✅ Confirmed — **Vercel** |
| Database & Auth | ✅ Confirmed — **Neon** (serverless Postgres) |
| Pricing — 30% uplift confirmation | ✅ Confirmed — rate card locked as final |
| QR code sticker placement | Confirm placement inside vehicle (recommend dashboard or sun visor) |
| Public liability minimum value | Confirm whether $20M is required or another figure |
| Beta testing plan | Who tests, which user stories, timeline before go-live |
| Domain | Preferred: myrtlefordcommunitybus.com.au (not yet registered) |
| System from-address | NoReply@myrtlefordcommunitybus.com.au (once domain is secured) |

---

## 14. Implementation Notes

### Pages to Build
1. **Home** — static content + dynamic pricing table and WAW hours from settings
2. **Book the Bus** — 3-step wizard with calendar, zone cards, form validation
3. **QR Check Page** — camera upload flow, pre-trip and post-trip modes
4. **WAW Check-In** — login-gated, booking lookup, checklists, flag management
5. **Bus Coordinator** — mobile-optimised, inspection wizard, maintenance log
6. **Admin Portal** — tabbed dashboard with full CRUD across all entities

### Confirmed Stack
| Layer | Choice | Notes |
|---|---|---|
| Hosting | Vercel | Serverless, zero-config deploys |
| Database | Neon (serverless Postgres) | Branching for dev/staging, connection pooling via Neon proxy |
| Auth | Neon Auth | Role-based — WAW, Coordinator, Admin; public booker has no account |
| Email | Resend | Transactional email for confirmations, invoices, notifications; Vercel integration available |
| Domain | myrtlefordcommunitybus.com.au | Not yet registered |

### Key Technical Concerns
- **Calendar availability** — must reflect confirmed/in-use bookings in real time; unavailable dates blocked clearly
- **Address book matching** — silent lookup on name entry in Step 2; no UI exposure of category codes
- **QR code generation** — each booking confirmation generates a unique QR URL pre-filled with the booking reference
- **Photo upload** — mobile camera capture, multiple uploads per submission, stored against booking record; use Vercel Blob or similar for file storage
- **Invoice generation** — PDF output with logo assets, auto-populated from booking data, sent via Resend on trigger
- **Printable confirmation** — print-optimised CSS layout, QR code embedded
- **Rate locking** — snapshot the active rate into the booking record at time of confirmation; Neon stores historical rate per booking row
- **Notification system** — per-login toggles stored in Neon, in-app bell + Resend email, extensible to SMS post-launch
- **Settings propagation** — all bank, hours, Lions details, and email settings must flow through dynamically with no hardcoded values

### Assets Available
- `Logo - LIONS CLUB.png` — use in header, home hero, invoices, printable confirmation
- `Logo - MAJOR - Alpine-Shire-Council-logo.png` — use alongside Lions logo in same locations
