# Greenhouse Solutions — Florian Operations App
**Design spec** · Started 2026-05-20 · Status: Design complete ✅

---

## What is this?

A dedicated webapp for Florian (field operations coordinator at Greenhouse Solutions) that replaces 8+ scattered tools with one unified workspace. Built to be hosted online so it can be demoed to other companies. Designed to eventually plug into a larger company-wide CRM.

---

## Users

| User | Access | Description |
|---|---|---|
| Florian | Full app | Main user — coordinates surveys, dispatches contractors, manages all projects |
| Contractor | Contractor portal only | Shared URL + single shared password. No individual accounts. |
| Florian's successor | Full app | Same access as Florian — single-user tool |

---

## Tech stack & hosting

- **Framework:** Next.js (same stack as nvision CRM)
- **Hosting:** Vercel (free tier, shareable URL, no server to manage)
- **Database:** TBD during implementation planning
- **Auth:** Simple login for Florian · Shared password for contractor portal

---

## Phases

### Phase 1 — Build now (this spec)
Full standalone app. Florian enters project info manually (no Teamleader sync yet). Core modules + contractor portal fully working.

### Phase 2 — After Phase 1 ships
- Teamleader API sync (deals flow into kanban automatically from pipeline stages)
- Sharepoint smart links (open correct project folder from within a project card)
- Product database (admin panel to add products with specs/dimensions)
- Flat roof layout map tool (Google Maps / Mapbox with drawing tools for roof measurement)

### Phase 3 — Ambitious
- AI assistant linked to GHS Sharepoint database — Florian can ask questions about products, installation methods, dimensions and get answers sourced from internal docs

---

## Module overview

### Module 1 — Florian's Kanban (main view)

3 columns mirroring Teamleader pipeline stages:

| Column | Teamleader stage | Meaning |
|---|---|---|
| CAT 1 — Klaar voor inplanning | klaar voor inplanning | Ready to install, no survey needed |
| CAT 2 — Opmeting intern | verwerkt | Florian does the site survey himself |
| CAT 3 — Extern | opmeting binnen | External contractor does the survey |

**Project cards show:** Client name, city, brief description  
**CAT 2 cards:** "▶ Opmeting starten" button  
**CAT 3 cards:** "→ Stuur naar dispatch" button

**Project detail panel** (slides in when card is clicked):
- Client name, address, phone, email
- Panel count, roof type
- Seller notes
- Primary action button (context-aware per CAT)
- External tool shortcuts: ESDEC ↗, Solaredge ↗, Geopunt ↗ (pre-filled with project address)
- 3 email template buttons (see Module 1b below)

### Module 1b — Email templates

3 pre-filled email templates accessible from every project card. Client name, address and email are auto-filled from the project. Florian can edit the content before sending. Sending opens Outlook with the message pre-loaded (mailto: link); a "Copy text" button is available as fallback.

1. **Afspraak inplannen** — Request client availability for a site visit, propose dates based on agenda. No attachment.
2. **Verslag doorsturen** — Send completed survey PDF to client for sign-off. PDF is auto-attached.
3. **Wijzigingen bespreken** — Follow-up when client requests changes to the report. No attachment.

Pre-filled fields use merge tags for: client name, address, and date placeholders that Florian edits manually.

### Module 2 — Survey form (shared module — used by Florian AND contractors)

Triggered by "▶ Opmeting starten" from:
- A CAT 2 project card in Florian's kanban
- An "Ingepland" card in the contractor portal

This is a single shared form — the same 23-slot photo form and measurement fields are used in both contexts. The resulting PDF is identical regardless of who fills it in.

**Photo upload section — 23 labeled slots:**
```
Foto 1:  Parkeergelegenheid
Foto 2:  Digitale meter / teller
Foto 3:  Stroomsterkte / hoofdschakelaar
Foto 4:  Omgevingsfoto's elektrische installatie
Foto 5:  Zekeringskast gesloten
Foto 6:  Zekeringskast geopend
Foto 7:  Hoofd en gevoelige differentieel
Foto 8:  Aardingsonderbreker
Foto 9:  Aardingsmeting
Foto 10: Aardingsmeting opstelling (in & out)
Foto 11: Keuringsverslag (indien aanwezig)
--- indien van toepassing ---
Foto 12: Bestaande omvormer
Foto 13: Aantal strings omvormer (onderkant)
Foto 14: Technische data omvormer (zijkant)
Foto 15: Extra relevante zekeringskasten
--- te plaatsen installatie ---
Foto 16: Modem / router (UTP-poorten zichtbaar)
Foto 17: Locatie omvormer / batterij
Foto 18: Locaties kabeltraject (meerdere mogelijk)
--- daksituatie (drone) ---
Foto 19: Foto's dakvlakken
Foto 20: Omgevingsfoto's
Foto 21: Nok en dakgoot
Foto 22: Dakpan close-up
Foto 23: Extra foto's
```
Photo file names = label from list above (e.g. "Bestaande omvormer 1", "Bestaande omvormer 2" for multiples).

Each photo slot has three controls: camera button (take/upload photo), add-more button (camera + plus icon, for multiple photos per slot), delete button (trash icon).

**Measurement & electrical fields:**
- Netspanning
- Hoofdzekering
- Aarding ok? (yes/no)
- Elektriciteit ok? (yes/no)
- Locatie omvormer
- Soort bevestiging
- Aantal muurdoorvoeren
- Geschatte lengte DC
- Geschatte lengte AC
- Internet (yes/no + type)
- Samenvatting opmeting (free text)

**Photo upload flow (phone → laptop):**
Florian (or contractor) takes photos on phone on-site. Upload method TBD during implementation (options: QR code upload link, AirDrop, or direct phone browser access to same webapp). A QR code hint is shown in the save bar.

**Draft state:** Survey can be saved as draft and returned to later (e.g. to add drone photos after the fact). Drone photos (slots 19–23) can be added from file library after the on-site visit.

**PDF generation:**
- Branded in Greenhouse Solutions style (dark teal #1B4D47, lime green #72D946)
- Summary + measurements table at top
- 2-column grid for detail/electrical/installation photos (~75mm wide on A4)
- Full-width for drone overview shots (~160mm) — maximises roof visibility
- Photos grouped by section with section headers
- Multiple photos per slot shown as 03a, 03b, 03c etc.
- Draft state: amber warning banner + send button locked until drone photos present
- Clean A4 layout, save button only (no print button)
- Saved to project, also downloadable

**After survey (Florian's flow):**
- Save button → survey saved to project
- Direct link to "Verslag doorsturen" email template with PDF auto-attached

**After survey (contractor's flow):**
- Survey saved as concept PDF on the contractor portal job card
- Contractor reviews PDF in "Opmeting gedaan" column — can still edit
- Contractor clicks "→ Indienen bij Florian" → card moves to Florian's dispatch "Survey completed" column
- Contractor can no longer edit after delivery

### Module 3 — Dispatch Kanban

For managing external contractors. Florian sends a CAT 3 project here via "→ Stuur naar dispatch".

**3 columns:**

| Column | Meaning |
|---|---|
| New contact | Just dispatched, not yet claimed by a contractor |
| Planned in | Appointment scheduled — contractor has claimed the job and set a date/time |
| Survey completed | Contractor has submitted the survey via the contractor portal — ready for Florian to review |

**"Survey completed" cards** show the submitted PDF report and two actions:
- "👁 Rapport bekijken" — open the PDF for review
- "✉ Verslag doorsturen naar klant" — opens the "Verslag doorsturen" email template with PDF auto-attached

Florian is the only person who can send the report to the client. The contractor portal has no email functionality.

After Florian sends the report, the card shows a small timestamp note: "Verslag verstuurd op [datum]" — confirming delivery without moving the card to a separate column.

### Module 4 — Contractor portal

Separate URL (e.g. `/contractor`), protected by a single shared password. Login screen shows GHS branding, shared password field, and the note "Wachtwoord vergeten? Neem contact op met Florian."

**3 columns (mirroring dispatch):**

| Column | Meaning |
|---|---|
| Nieuw contact | Dispatched jobs not yet claimed |
| Ingepland | Job claimed + appointment scheduled |
| Opmeting gedaan | Survey submitted — awaiting Florian's review |

**Card info visible to contractors:**
- Client name
- City, full street address, postal code
- Phone number
- Survey type tag (e.g. "Plat dak", "20 panelen")

**What contractors can do:**

1. **Claim a job** (Nieuw contact): Select name from a dropdown. After claiming, a scheduling block appears on the card with date + time fields and a "Bevestigen & markeer als ingepland" button.

2. **Start survey** (Ingepland): The appointment date/time badge is shown on the card. "▶ Opmeting starten" opens the shared survey form (Module 2) — identical to Florian's form.

3. **Review & deliver** (Opmeting gedaan — concept): After completing the form, a concept PDF is generated. The contractor can:
   - "✏ Aanpassen" — go back to the survey form to make changes
   - "→ Indienen bij Florian" — deliver the report; card becomes read-only and a "Ingediend bij Florian op [datum]" banner appears

4. **After delivery** (Opmeting gedaan — ingediend): Card is locked. Message: "Florian zal het verslag nakijken en naar de klant versturen."

**What contractors cannot do:**
- See Florian's main kanban
- Access email templates
- Contact clients directly
- Edit a survey after delivering it to Florian
- See other modules

### Module 5 — Agenda view

Google Calendar embedded inside the app shell, accessible via the sidebar navigation.

**Layout:** Full-week view (Mon–Sun) with hourly time slots. Today's column is subtly highlighted with a live current-time indicator line.

**Event colour coding:**
- 🟢 Teal/green — Florian's own opmetingen (CAT 2, from the GHS system)
- 🟡 Amber — Contractor appointments (CAT 3, from dispatch system)
- 🔵 Blue — Other Google Calendar events (personal, meetings, etc.)

**Right panel:** "Aankomende opmetingen" — a list of upcoming survey appointments pulled from the GHS system, showing client name, date/time, city, and CAT badge. This lets Florian see all scheduled opmetingen at a glance without scrolling the calendar.

**"Openen in Google Calendar" button** at the bottom of the right panel — opens the full Google Calendar in a new tab for editing events.

---

## Tool integration plan

| Tool | Approach | Phase |
|---|---|---|
| iLovePDF | ❌ Replaced — native PDF generation | 1 |
| Outlook | ❌ Replaced — 3 built-in email templates (mailto: link opens Outlook) | 1 |
| ESDEC calculator | 🔗 External link (proprietary certified tool — cannot replicate) | 1 |
| Solaredge designer | 🔗 External link | 1 |
| WebODM | 🔗 External link | 1 |
| GEOPUNT | 🔗 Smart link pre-filled with project address | 1 |
| Google Calendar | 🔗 Embedded panel inside app + "open in Google Calendar" link | 1 |
| Teamleader | ⏳ API sync (deals → kanban automatically) | 2 |
| Sharepoint | ⏳ Smart links to project folders | 2 |
| Product database | ⏳ Admin CRUD panel | 2 |
| Flat roof map tool | ⏳ Google Maps / Mapbox with drawing tools | 2 |
| AI assistant (GHS docs) | 🚀 Claude API linked to Sharepoint | 3 |

---

## Design direction

- **Style:** Dark mode, minimal, futuristic
- **Brand colours:** Dark teal `#1B4D47`, lime green `#72D946`
- **Background:** Near-black `#070d0b` with subtle green tint
- **Accents:** Gradient `#1B4D47 → #72D946`, glowing coloured dots per CAT
- **Cards:** Dark with subtle borders, lots of breathing room
- **Primary button:** Lime green gradient with green glow
- **Font:** System sans-serif (Inter / -apple-system)
- **Layout:** Left sidebar (dark teal) + main content area

**Column accent colours:**
- CAT 1: Amber `#f59e0b`
- CAT 2: Lime green `#72D946`
- CAT 3: Sky blue `#38bdf8`
- Dispatch "New contact": Red `#f87171`
- Dispatch "Planned in": Amber `#f59e0b`
- Dispatch "Survey completed": Lime green `#72D946`

---

## All screens — designed & approved ✅

1. **Overall app layout** — sidebar, navigation, 3-column kanban — ✅
2. **Project detail panel** — slides in on card click, client info + actions + email templates — ✅
3. **Survey form** — section sidebar, 4 photo sections, 23 labeled slots (camera / add-more / delete), measurement fields, save bar with QR hint — ✅
4. **PDF output** — white A4 doc in dark viewer, GHS branded, summary + measurements table, 2-col detail photos, full-width drone shots, draft state with locked send button — ✅
5. **Dispatch kanban** — 3 columns, "verslag verstuurd op datum" on completed cards — ✅
6. **Contractor portal** — login screen, 3-column kanban, claim + schedule flow, shared survey form, "Indienen bij Florian" delivery button — ✅
7. **Email template composer** — 3 tabs, merge tags auto-filled from project, mailto: Outlook button + copy fallback, PDF auto-attached on template 2 — ✅
8. **Agenda view** — week calendar in app shell, 3 event colours, right panel with upcoming opmetingen, "open in Google Calendar" link — ✅

---

## PDF photo layout decisions ✅
- 2-column grid for all detail/electrical/installation photos (~75mm wide on A4)
- Full-width for drone overview shots (~160mm) — maximises roof visibility for client
- Photos grouped by section with section headers
- Multiple photos per slot shown as 03a, 03b, 03c etc.
- Draft state: amber warning banner + send button locked until drone photos present
- No print button — save button only; Florian opens PDF and prints from there if needed

---

## Key architectural decisions

- **Survey form is a shared module.** The same form (Module 2) is used by Florian (CAT 2 projects) and by contractors (via contractor portal). This avoids maintaining two separate data collection systems and ensures consistent PDF output.
- **Contractors cannot email clients.** The email send button only exists in Florian's views. Contractors deliver via "Indienen bij Florian" — Florian reviews and sends.
- **No individual contractor accounts.** Single shared password for the contractor portal. Contractors identify themselves by selecting their name from a dropdown when claiming a job.
- **Contractor edits are locked after delivery.** Once a contractor clicks "Indienen bij Florian", the survey is read-only on their side. Florian reviews the submitted PDF in his dispatch kanban.

---

## Open questions for implementation planning

- Photo upload flow: QR code on phone? AirDrop? Direct phone browser?
- Database choice: SQLite (simple) vs Postgres (scalable)?
- PDF generation library: Puppeteer? React-PDF? jsPDF?
- Email sending: mailto: link to open Outlook, or SMTP via Nodemailer?
- File storage: Local filesystem? Vercel Blob? S3?
- Google Calendar embed: OAuth per user, or read-only public calendar embed?

---

*Spec written and completed during brainstorming session 2026-05-20/21. All 8 screens approved. Ready for implementation planning.*
