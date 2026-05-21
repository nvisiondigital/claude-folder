# GHS Florian App — Plan 1 Complete

**Date:** 2026-05-21  
**Status:** ✅ Plan 1 done — 32/32 tests passing, build clean

---

## What was built

Full Next.js 16 app in `greenhouse-app/`. Florian can log in and use the kanban, detail panel, email templates, and agenda.

### Modules

| Module | Files | Tests |
|---|---|---|
| Auth (JWT, bcrypt, httpOnly cookie) | `src/lib/auth.ts` · `src/app/api/auth/login/route.ts` · `src/app/api/auth/logout/route.ts` · `src/proxy.ts` | 3 |
| Prisma schema (Project, Survey stub, DispatchJob stub, Session) | `prisma/schema.prisma` · `src/lib/db.ts` | — |
| Login page (GHS branding) | `src/app/login/page.tsx` | — |
| App shell — sidebar + protected layout | `src/components/ui/Sidebar.tsx` · `src/app/app/layout.tsx` | 2 |
| Projects CRUD API (auth-guarded) | `src/app/api/projects/route.ts` · `src/app/api/projects/[id]/route.ts` · `src/lib/types.ts` | 11 |
| 3-column Kanban (CAT 1/2/3, SWR) | `src/components/kanban/KanbanBoard.tsx` · `KanbanColumn.tsx` · `kanban/page.tsx` | 5 |
| Add project modal | `src/components/kanban/AddProjectModal.tsx` | 2 |
| Project detail panel (client info, tool links, email buttons) | `src/components/kanban/ProjectDetailPanel.tsx` | 4 |
| Email composer (3 templates, mailto + copy) | `src/lib/email.ts` · `src/components/email/EmailComposer.tsx` | 4 |
| Agenda (Google Calendar embed + upcoming list) | `src/components/agenda/CalendarEmbed.tsx` · `UpcomingList.tsx` · `src/app/app/agenda/page.tsx` · `src/app/api/projects/upcoming/route.ts` | 1 |

---

## Tech stack

- **Next.js 16.2.6** App Router (middleware in `src/proxy.ts`, params are a `Promise`)
- **Tailwind v4** — CSS-first, colours via `@theme inline` in `globals.css` (no `tailwind.config.ts`)
- **Prisma 7** — adapter pattern (`@prisma/adapter-better-sqlite3`) required
- **Auth** — `bcryptjs` + `jose` HS256, cookie `ghs_session`, `sameSite: 'strict'`
- **SWR** — data fetching on kanban board (30s refresh) and upcoming list
- **Vitest** + React Testing Library

---

## Git log

```
044f386 fix: add unused NextRequest param to GET /api/projects for TypeScript compliance
cc2c2a2 feat: Plan 1 complete — foundation, kanban, email templates, agenda
ef5674e feat: agenda page with Google Calendar embed and upcoming opmetingen list
5262851 feat: email template composer with mailto links and copy fallback
976c9bd feat: project detail slide-in panel with contact info, tool links, and email templates
ce3e211 fix: reset loading state in AddProjectModal on fetch error
0f2aa46 feat: add project modal with all fields and category selector
a413b97 fix: add error state and HTTP error handling to KanbanBoard
8078d53 feat: 3-column kanban board with project cards
5e5d46d fix: auth guard, 404 handling, and validation on projects API
07bda44 feat: projects CRUD API with typed inputs
835be36 feat: app shell with sidebar navigation and protected layout
8f720dc feat: login page with GHS branding
6bff067 fix: safe JSON parsing in login route, tighten sameSite and test setup
af8a816 feat: custom JWT auth with login/logout API and middleware
42d7ca4 fix: schema typo, dev.db gitignore, fix dep placement
5e9adbe feat: add Prisma schema with all models and db client
252aed6 fix: load Inter font, add vitest globals types, remove unused tailwind config
fa4f088 feat: bootstrap Next.js project with Tailwind and Vitest
```

---

## .env.local (gitignored — must recreate on new machine)

```
FLORIAN_PASSWORD_HASH=<bcrypt hash of Florian's password>
JWT_SECRET=<32-byte hex — generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_GOOGLE_CALENDAR_SRC=https://calendar.google.com/calendar/embed?src=placeholder
DATABASE_URL="file:./dev.db"
```

---

## To run locally

```bash
cd greenhouse-app
npm install
npm run dev
# Open http://localhost:3000
# Password: whatever you hashed in FLORIAN_PASSWORD_HASH
```

---

## To deploy to Vercel (still to do)

1. Create a free Postgres DB at [neon.tech](https://neon.tech)
2. In `prisma/schema.prisma`, change provider to `postgresql`
3. Run `npx prisma db push` with the Neon DATABASE_URL
4. `npx vercel --prod` from inside `greenhouse-app/`
5. Set these env vars in Vercel dashboard:
   - `FLORIAN_PASSWORD_HASH`
   - `JWT_SECRET`
   - `DATABASE_URL` (Neon Postgres URL)
   - `NEXT_PUBLIC_GOOGLE_CALENDAR_SRC`

---

## What comes next

### Plan 2 — Survey form + PDF generation
- 23-slot photo upload form (shared between Florian and contractors)
- Measurement fields (netspanning, hoofdzekering, aarding, etc.)
- Draft state — save and return later, add drone photos after on-site visit
- PDF generation — GHS branded A4, 2-col detail photos, full-width drone shots
- Florian flow: save → "Verslag doorsturen" email with PDF auto-attached
- Contractor flow: submit to Florian for review

### Plan 3 — Dispatch kanban + contractor portal
- Dispatch kanban (New contact / Planned in / Survey completed)
- "Stuur naar dispatch" button on CAT 3 cards
- Contractor portal (`/contractor`) — shared password login
- Contractor claim, schedule, survey, deliver flow
- "Indienen bij Florian" handoff — locks survey, moves to Florian's dispatch
- Florian reviews PDF and sends to client (contractors cannot email clients)

---

*Spec:* `docs/superpowers/specs/2026-05-20-greenhouse-florian-app-design.md`  
*Plan 1:* `docs/superpowers/plans/2026-05-21-plan-1-foundation-kanban.md`
