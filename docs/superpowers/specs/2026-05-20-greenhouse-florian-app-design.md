# Greenhouse Solutions — Florian Operations App
**Design spec** · Started 2026-05-20 · Status: In progress (design phase)

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

3 pre-filled email templates accessible from every project:

1. **Afspraak inplannen** — Request client availability for a site visit, propose dates based on agenda
2. **Verslag doorsturen** — Send completed survey PDF to client for sign-off
3. **Wijzigingen bespreken** — Follow-up when client requests changes to the report

### Module 2 — Survey form (CAT 2 — Florian's own surveys)

Triggered by "▶ Opmeting starten" on a CAT 2 project.

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
Florian takes photos on his phone on-site. Upload method TBD during implementation (options: QR code upload link, AirDrop, or direct phone browser access to same webapp).

**PDF generation:**
- Branded in Greenhouse Solutions style (dark teal #1B4D47, lime green #72D946)
- Summary + extra info at top
- All photos displayed per label, in order
- Clean A4 layout, auto-print button
- Saved to project, also downloadable

**After survey:**
- Save button → survey saved to project
- Direct link to "Verslag doorsturen" email template with PDF auto-attached

### Module 3 — Dispatch Kanban

For managing external contractors. Florian sends a CAT 3 project here via "→ Stuur naar dispatch".

**3 columns:**

| Column | Meaning |
|---|---|
| New contact | Just dispatched, not yet claimed by a contractor |
| Planned in | Appointment scheduled with client |
| Survey completed | Files + notes uploaded, ready for Florian to review |

"Survey completed" cards show a link to the uploaded files and contractor notes.

### Module 4 — Contractor portal

Separate URL (e.g. `/contractor`), protected by a single shared password.

**What contractors can do:**
- See all dispatched jobs across all 3 dispatch columns
- Claim a job by selecting their name from a dropdown (name added to the job card)
- Move their job between columns (New → Planned in → Completed)
- Upload files (photos, documents) when survey is done
- Add a text note with details/observations

**What contractors cannot do:**
- See Florian's main kanban
- Access the survey form
- Access email templates
- See other modules

---

## Tool integration plan

| Tool | Approach | Phase |
|---|---|---|
| iLovePDF | ❌ Replaced — native PDF generation | 1 |
| Outlook | ❌ Replaced — 3 built-in email templates | 1 |
| ESDEC calculator | 🔗 External link (proprietary certified tool — cannot replicate) | 1 |
| Solaredge designer | 🔗 External link | 1 |
| WebODM | 🔗 External link | 1 |
| GEOPUNT | 🔗 Smart link pre-filled with project address | 1 |
| Google Calendar | 🔗 Embedded panel inside app | 1 |
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

---

## Screens designed so far ✅

1. **Overall app layout** — sidebar, navigation, 3-column kanban — ✅ Approved
2. **Project detail panel** — slides in on card click, shows client info + actions + email templates — ✅ Approved

## Screens still to design ⏳

3. Survey form (photo upload slots + measurement fields)
4. PDF output preview
5. Dispatch kanban
6. Contractor portal
7. Email template composer
8. Google Calendar embed / agenda view

---

## Open questions for implementation planning

- Photo upload flow: QR code on phone? AirDrop? Direct phone browser?
- Database choice: SQLite (simple) vs Postgres (scalable)?
- PDF generation library: Puppeteer? React-PDF? jsPDF?
- Email sending: SMTP via Nodemailer? Or just open Outlook via mailto: link?
- File storage: Local filesystem? Vercel Blob? S3?

---

*Spec written during brainstorming session. To resume: open this file, review the "Screens still to design" section, and continue with Module 2 survey form design.*
