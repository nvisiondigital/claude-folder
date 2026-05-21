# GHS Florian App — Plan 1: Foundation + Florian's Kanban

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full Next.js app with authentication, a working 3-column kanban for Florian, project detail panel, email template composer, and embedded Google Calendar view.

**Architecture:** Next.js 14 App Router, Prisma ORM with SQLite (dev) / Postgres (prod), custom session auth via httpOnly cookie, Tailwind CSS with GHS brand colours. All data flows through typed API route handlers. Components are small and focused — one responsibility each.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Prisma, SQLite (dev), bcryptjs, jose (JWT), SWR, Vitest, React Testing Library

**This is Plan 1 of 3.**
- Plan 2 adds the Survey Form + PDF generation (shared module used by both Florian and contractors).
- Plan 3 adds the Dispatch Kanban + Contractor Portal.

**Spec:** `docs/superpowers/specs/2026-05-20-greenhouse-florian-app-design.md`

---

## File Map

```
greenhouse-app/
├── prisma/
│   └── schema.prisma                  — All data models (Project, Survey stub, DispatchJob stub, Session)
├── src/
│   ├── middleware.ts                  — Protect /app/* routes; redirect unauthenticated users to /login
│   ├── app/
│   │   ├── globals.css                — Tailwind base + GHS CSS variables
│   │   ├── layout.tsx                 — Root layout (fonts, metadata)
│   │   ├── page.tsx                   — Redirect → /app/kanban
│   │   ├── login/
│   │   │   └── page.tsx               — Florian login screen
│   │   └── app/
│   │       ├── layout.tsx             — App shell: sidebar + main area
│   │       ├── kanban/
│   │       │   └── page.tsx           — Florian's 3-column kanban
│   │       ├── agenda/
│   │       │   └── page.tsx           — Google Calendar embed + upcoming list
│   │       └── dispatch/
│   │           └── page.tsx           — Placeholder (implemented in Plan 3)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Sidebar.tsx            — Left nav: kanban / dispatch / agenda / survey links
│   │   │   ├── Button.tsx             — Reusable button with variant props
│   │   │   └── Modal.tsx              — Dark modal wrapper
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx        — Renders 3 columns, fetches projects via SWR
│   │   │   ├── KanbanColumn.tsx       — Single column: header dot, title, card list
│   │   │   ├── ProjectCard.tsx        — Card: name, city, type tag, primary CTA button
│   │   │   ├── ProjectDetailPanel.tsx — Slide-in panel: full client info, action buttons, email buttons
│   │   │   └── AddProjectModal.tsx    — Form to create a new project
│   │   ├── email/
│   │   │   └── EmailComposer.tsx      — 3-tab composer; builds mailto: URL; copy fallback
│   │   └── agenda/
│   │       ├── CalendarEmbed.tsx      — Google Calendar iframe wrapper
│   │       └── UpcomingList.tsx       — Pulls projects with appointmentDate from API
│   ├── lib/
│   │   ├── db.ts                      — Prisma client singleton
│   │   ├── auth.ts                    — hashPassword, verifyPassword, createToken, verifyToken
│   │   ├── email.ts                   — buildMailtoUrl(template, project) → string
│   │   └── types.ts                   — Shared TypeScript types (ProjectWithRelations, etc.)
│   └── app/
│       └── api/
│           ├── auth/
│           │   ├── login/route.ts     — POST: verify password → set session cookie
│           │   └── logout/route.ts    — POST: clear session cookie
│           └── projects/
│               ├── route.ts           — GET (list all) · POST (create)
│               └── [id]/
│                   └── route.ts       — GET · PATCH (update fields/category) · DELETE
└── .env.local                         — FLORIAN_PASSWORD_HASH, JWT_SECRET, GOOGLE_CALENDAR_URL
```

---

## Task 1: Bootstrap the Next.js project

**Files:**
- Create: `greenhouse-app/` (entire project)
- Create: `greenhouse-app/tailwind.config.ts`
- Create: `greenhouse-app/.env.local`

- [ ] **Step 1: Scaffold the project**

```bash
cd "/Users/nielsvandevyver/Documents/Claude Folder/.claude/worktrees/sad-williamson-440e79"
npx create-next-app@latest greenhouse-app \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --no-eslint \
  --import-alias "@/*"
cd greenhouse-app
```

- [ ] **Step 2: Install dependencies**

```bash
npm install prisma @prisma/client bcryptjs jose swr
npm install --save-dev @types/bcryptjs vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom
```

- [ ] **Step 3: Configure Tailwind with GHS colours**

Replace the contents of `tailwind.config.ts` with:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ghs: {
          bg:       '#070d0b',
          surface:  '#080e0c',
          teal:     '#1B4D47',
          green:    '#72D946',
          border:   'rgba(255,255,255,0.07)',
          text:     '#e2e8e4',
          muted:    'rgba(255,255,255,0.35)',
          dim:      'rgba(255,255,255,0.15)',
        },
        cat1: '#f59e0b',
        cat2: '#72D946',
        cat3: '#38bdf8',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, './src') },
  },
})
```

Create `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create `.env.local`**

```bash
# Generate a bcrypt hash for Florian's password (replace 'changeme' with real password)
node -e "const b=require('bcryptjs');b.hash('changeme',10).then(h=>console.log('FLORIAN_PASSWORD_HASH='+h))"
```

Copy the output. Then create `.env.local`:

```
FLORIAN_PASSWORD_HASH=<paste hash here>
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
NEXT_PUBLIC_GOOGLE_CALENDAR_SRC=<paste Google Calendar embed URL — from Google Calendar > Settings > Integrate calendar > "Embed code", extract the src attribute>
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with Tailwind and Vitest"
```

---

## Task 2: Prisma schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/db.ts`

- [ ] **Step 1: Initialise Prisma**

```bash
npx prisma init --datasource-provider sqlite
```

- [ ] **Step 2: Write the full schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Project {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Client
  clientName String
  email      String
  phone      String
  street     String
  postalCode String
  city       String

  // Project details
  category    Category
  panelCount  Int?
  roofType    String?
  description String?
  sellerNotes String?

  // Optional appointment date (for agenda view)
  appointmentDate DateTime?

  // Status
  status ProjectStatus @default(ACTIVE)

  // Relations
  survey      Survey?
  dispatchJob DispatchJob?
}

enum Category {
  CAT1
  CAT2
  CAT3
}

enum ProjectStatus {
  ACTIVE
  ARCHIVED
}

// Survey is defined here as a stub — fully implemented in Plan 2
model Survey {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  isDraft     Boolean   @default(true)
  submittedAt DateTime?
  deliveredAt DateTime? // When contractor submitted to Florian

  // Measurement fields (populated in Plan 2)
  netspanning          String?
  hoofdzekering        String?
  aardingOk            Boolean?
  elektriciteitsOk     Boolean?
  locatieOmvormer      String?
  soortBevestiging     String?
  aantalMuurdoorvoeren Int?
  geschatteLengteDc    String?
  geschatteLeugteAc    String?
  internet             Boolean?
  internetType         String?
  samenvatting         String?

  photos Photo[]
}

// Photo is a stub — fully used in Plan 2
model Photo {
  id        String @id @default(cuid())
  surveyId  String
  survey    Survey @relation(fields: [surveyId], references: [id], onDelete: Cascade)

  slotIndex Int    // 1–23
  slotName  String
  fileUrl   String
  order     Int    @default(0)
}

// DispatchJob is a stub — fully implemented in Plan 3
model DispatchJob {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  status          DispatchStatus @default(NEW_CONTACT)
  contractorName  String?
  appointmentDate DateTime?
  notes           String?
  reportSentAt    DateTime?
  deliveredAt     DateTime?
}

enum DispatchStatus {
  NEW_CONTACT
  PLANNED_IN
  SURVEY_COMPLETED
}

// Session table for auth
model Session {
  id        String   @id @default(cuid())
  token     String   @unique
  createdAt DateTime @default(now())
  expiresAt DateTime
  role      String   @default("florian") // "florian" | "contractor"
}
```

Add to `.env.local`:

```
DATABASE_URL="file:./dev.db"
```

- [ ] **Step 3: Push schema to database**

```bash
npx prisma db push
```

Expected output ends with: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 4: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['error'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Prisma schema with all models and db client"
```

---

## Task 3: Auth system

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/middleware.ts`
- Create: `src/app/api/auth/login/route.ts`
- Create: `src/app/api/auth/logout/route.ts`
- Create: `src/test/lib/auth.test.ts`

- [ ] **Step 1: Write failing auth tests**

Create `src/test/lib/auth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, createToken, verifyToken } from '@/lib/auth'

describe('auth', () => {
  it('hashes and verifies a password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })

  it('creates a JWT token and verifies it', async () => {
    process.env.JWT_SECRET = 'test-secret-32-chars-exactly-ok!'
    const token = await createToken({ role: 'florian' })
    const payload = await verifyToken(token)
    expect(payload?.role).toBe('florian')
  })

  it('returns null for an invalid token', async () => {
    process.env.JWT_SECRET = 'test-secret-32-chars-exactly-ok!'
    const result = await verifyToken('invalid.token.here')
    expect(result).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test src/test/lib/auth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/auth'`

- [ ] **Step 3: Implement auth utilities**

Create `src/lib/auth.ts`:

```typescript
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not set')
  return new TextEncoder().encode(secret)
}

export async function createToken(payload: { role: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<{ role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload as { role: string }
  } catch {
    return null
  }
}

export const SESSION_COOKIE = 'ghs_session'
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test src/test/lib/auth.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create login API route**

Create `src/app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const hash = process.env.FLORIAN_PASSWORD_HASH
  if (!hash) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const valid = await verifyPassword(password, hash)
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 })

  const token = await createToken({ role: 'florian' })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
```

- [ ] **Step 6: Create logout API route**

Create `src/app/api/auth/logout/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE)
  return res
}
```

- [ ] **Step 7: Create middleware to protect /app routes**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'florian') {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*'],
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: custom JWT auth with login/logout API and middleware"
```

---

## Task 4: Login page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: Root page redirect**

Create `src/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/app/kanban')
}
```

- [ ] **Step 2: Create the login page**

Create `src/app/login/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/app/kanban')
    } else {
      setError('Ongeldig wachtwoord. Probeer opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ghs-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ghs-green to-ghs-teal shadow-[0_0_24px_rgba(114,217,70,0.3)] mb-4" />
          <h1 className="text-lg font-bold text-white">Greenhouse Solutions</h1>
          <p className="text-xs text-ghs-muted mt-1">Florian — Operationeel dashboard</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-ghs-surface border border-ghs-border rounded-2xl p-8 shadow-[0_0_60px_rgba(114,217,70,0.05)]"
        >
          <div className="h-0.5 bg-gradient-to-r from-ghs-teal via-ghs-green to-ghs-teal opacity-60 -mx-8 -mt-8 mb-8 rounded-t-2xl" />

          <label className="block text-xs uppercase tracking-widest text-ghs-dim mb-2">
            Wachtwoord
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-ghs-text placeholder-white/20 outline-none focus:border-ghs-green/50 mb-4"
            placeholder="••••••••"
            autoFocus
          />

          {error && (
            <p className="text-xs text-red-400 mb-4">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg py-3 text-sm shadow-[0_0_16px_rgba(114,217,70,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and manually verify login**

```bash
npm run dev
```

Open `http://localhost:3000/login`. Enter the password you set in `.env.local`. You should be redirected to `/app/kanban` (404 for now — that's expected). Wrong password should show an error.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: login page with GHS branding"
```

---

## Task 5: App shell (sidebar + layout)

**Files:**
- Create: `src/components/ui/Sidebar.tsx`
- Create: `src/app/app/layout.tsx`
- Create: `src/app/app/dispatch/page.tsx`

- [ ] **Step 1: Write a test for the Sidebar**

Create `src/test/components/Sidebar.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/kanban',
}))

import Sidebar from '@/components/ui/Sidebar'

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Mijn kanban')).toBeInTheDocument()
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Agenda')).toBeInTheDocument()
  })

  it('marks the active route', () => {
    render(<Sidebar />)
    const activeItem = screen.getByText('Mijn kanban').closest('a')
    expect(activeItem).toHaveClass('text-ghs-green')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test src/test/components/Sidebar.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/ui/Sidebar'`

- [ ] **Step 3: Implement Sidebar**

Create `src/components/ui/Sidebar.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { label: 'Mijn kanban', href: '/app/kanban', icon: '⬛' },
  { label: 'Dispatch',    href: '/app/dispatch', icon: '📋' },
  { label: 'Agenda',      href: '/app/agenda',   icon: '📅' },
]

export default function Sidebar() {
  const pathname = usePathname()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="w-48 shrink-0 bg-[#080f0d] border-r border-white/5 flex flex-col h-full">
      {/* Logo */}
      <div className="px-3.5 py-4 border-b border-white/[0.04] flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ghs-green to-ghs-teal shadow-[0_0_10px_rgba(114,217,70,0.2)] shrink-0" />
        <div>
          <div className="text-xs font-bold text-white">GHS</div>
          <div className="text-[9px] text-white/25 mt-0.5">Florian · Operaties</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5">
        <p className="text-[9px] uppercase tracking-widest text-white/20 px-2.5 py-2.5 pt-3">
          Planning
        </p>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                active
                  ? 'bg-ghs-green/[0.08] text-ghs-green font-semibold'
                  : 'text-white/45 hover:bg-white/[0.04] hover:text-white/70'
              }`}
            >
              <span className="w-4 text-center text-[13px]">{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="m-2 p-2.5 rounded-lg text-[10px] text-white/20 hover:text-white/40 hover:bg-white/[0.03] text-left transition-colors"
      >
        ↗ Uitloggen
      </button>
    </aside>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test src/test/components/Sidebar.test.tsx
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create app shell layout**

Create `src/app/app/layout.tsx`:

```typescript
import Sidebar from '@/components/ui/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-ghs-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Create dispatch placeholder**

Create `src/app/app/dispatch/page.tsx`:

```typescript
export default function DispatchPage() {
  return (
    <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm">
      Dispatch kanban — wordt gebouwd in Plan 3
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: app shell with sidebar navigation and protected layout"
```

---

## Task 6: Projects API

**Files:**
- Create: `src/app/api/projects/route.ts`
- Create: `src/app/api/projects/[id]/route.ts`
- Create: `src/lib/types.ts`
- Create: `src/test/api/projects.test.ts`

- [ ] **Step 1: Define shared types**

Create `src/lib/types.ts`:

```typescript
import type { Project, Category, ProjectStatus } from '@prisma/client'

export type { Project, Category, ProjectStatus }

export type CreateProjectInput = {
  clientName: string
  email: string
  phone: string
  street: string
  postalCode: string
  city: string
  category: Category
  panelCount?: number
  roofType?: string
  description?: string
  sellerNotes?: string
  appointmentDate?: string // ISO string
}

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  status?: ProjectStatus
}
```

- [ ] **Step 2: Write failing API tests**

Create `src/test/api/projects.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock Prisma
const mockCreate = vi.fn()
const mockFindMany = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/db', () => ({
  prisma: {
    project: {
      create: mockCreate,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete,
    },
  },
}))

// Mock auth middleware helper
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return { ...actual, verifyToken: vi.fn().mockResolvedValue({ role: 'florian' }) }
})

import { GET, POST } from '@/app/api/projects/route'
import { NextRequest } from 'next/server'

function makeRequest(method: string, body?: object) {
  return new NextRequest('http://localhost/api/projects', {
    method,
    headers: { 'Content-Type': 'application/json', cookie: 'ghs_session=valid' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const sampleProject = {
  id: 'cuid1',
  clientName: 'Test User',
  email: 'test@test.com',
  phone: '0499000000',
  street: 'Teststraat 1',
  postalCode: '9000',
  city: 'Gent',
  category: 'CAT2',
  panelCount: null,
  roofType: null,
  description: null,
  sellerNotes: null,
  appointmentDate: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/projects', () => {
  it('returns list of projects', async () => {
    mockFindMany.mockResolvedValueOnce([sampleProject])
    const res = await GET(makeRequest('GET'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].clientName).toBe('Test User')
  })
})

describe('POST /api/projects', () => {
  it('creates a project and returns 201', async () => {
    mockCreate.mockResolvedValueOnce({ ...sampleProject, id: 'new-id' })
    const res = await POST(makeRequest('POST', {
      clientName: 'Test User',
      email: 'test@test.com',
      phone: '0499000000',
      street: 'Teststraat 1',
      postalCode: '9000',
      city: 'Gent',
      category: 'CAT2',
    }))
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.id).toBe('new-id')
  })

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest('POST', { clientName: 'Only Name' }))
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npm test src/test/api/projects.test.ts
```

Expected: FAIL — routes not found

- [ ] **Step 4: Implement list + create route**

Create `src/app/api/projects/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { CreateProjectInput } from '@/lib/types'

const REQUIRED_FIELDS: (keyof CreateProjectInput)[] = [
  'clientName', 'email', 'phone', 'street', 'postalCode', 'city', 'category',
]

export async function GET() {
  const projects = await prisma.project.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const body: CreateProjectInput = await req.json()

  for (const field of REQUIRED_FIELDS) {
    if (!body[field]) {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
    }
  }

  const project = await prisma.project.create({
    data: {
      clientName:      body.clientName,
      email:           body.email,
      phone:           body.phone,
      street:          body.street,
      postalCode:      body.postalCode,
      city:            body.city,
      category:        body.category,
      panelCount:      body.panelCount ?? null,
      roofType:        body.roofType ?? null,
      description:     body.description ?? null,
      sellerNotes:     body.sellerNotes ?? null,
      appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
```

- [ ] **Step 5: Implement get + update + delete route**

Create `src/app/api/projects/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { UpdateProjectInput } from '@/lib/types'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const project = await prisma.project.findUnique({ where: { id: params.id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body: UpdateProjectInput = await req.json()

  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      ...(body.clientName      && { clientName: body.clientName }),
      ...(body.email           && { email: body.email }),
      ...(body.phone           && { phone: body.phone }),
      ...(body.street          && { street: body.street }),
      ...(body.postalCode      && { postalCode: body.postalCode }),
      ...(body.city            && { city: body.city }),
      ...(body.category        && { category: body.category }),
      ...(body.panelCount  !== undefined && { panelCount: body.panelCount }),
      ...(body.roofType    !== undefined && { roofType: body.roofType }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.sellerNotes !== undefined && { sellerNotes: body.sellerNotes }),
      ...(body.status      !== undefined && { status: body.status }),
      ...(body.appointmentDate !== undefined && {
        appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
      }),
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.project.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test src/test/api/projects.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: projects CRUD API with typed inputs"
```

---

## Task 7: Florian's kanban page

**Files:**
- Create: `src/app/app/kanban/page.tsx`
- Create: `src/components/kanban/KanbanBoard.tsx`
- Create: `src/components/kanban/KanbanColumn.tsx`
- Create: `src/components/kanban/ProjectCard.tsx`
- Create: `src/test/components/ProjectCard.test.tsx`

- [ ] **Step 1: Write failing ProjectCard test**

Create `src/test/components/ProjectCard.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjectCard from '@/components/kanban/ProjectCard'
import type { Project } from '@prisma/client'

const baseProject: Project = {
  id: '1',
  clientName: 'Jan Janssen',
  email: 'jan@test.be',
  phone: '0499000000',
  street: 'Teststraat 1',
  postalCode: '9000',
  city: 'Gent',
  category: 'CAT2',
  panelCount: 12,
  roofType: 'Hellend dak',
  description: null,
  sellerNotes: null,
  appointmentDate: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ProjectCard', () => {
  it('renders client name and city', () => {
    render(<ProjectCard project={baseProject} onSelect={vi.fn()} />)
    expect(screen.getByText('Jan Janssen')).toBeInTheDocument()
    expect(screen.getByText(/Gent/)).toBeInTheDocument()
  })

  it('shows "Opmeting starten" button for CAT2', () => {
    render(<ProjectCard project={baseProject} onSelect={vi.fn()} />)
    expect(screen.getByText(/Opmeting starten/i)).toBeInTheDocument()
  })

  it('shows "Stuur naar dispatch" button for CAT3', () => {
    render(<ProjectCard project={{ ...baseProject, category: 'CAT3' }} onSelect={vi.fn()} />)
    expect(screen.getByText(/Stuur naar dispatch/i)).toBeInTheDocument()
  })

  it('shows no action button for CAT1', () => {
    render(<ProjectCard project={{ ...baseProject, category: 'CAT1' }} onSelect={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onSelect when card is clicked', async () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={baseProject} onSelect={onSelect} />)
    screen.getByText('Jan Janssen').click()
    expect(onSelect).toHaveBeenCalledWith(baseProject)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test src/test/components/ProjectCard.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/kanban/ProjectCard'`

- [ ] **Step 3: Implement ProjectCard**

Create `src/components/kanban/ProjectCard.tsx`:

```typescript
import type { Project } from '@prisma/client'

const CAT_COLOURS = {
  CAT1: { dot: 'bg-cat1 shadow-[0_0_6px_rgba(245,158,11,0.5)]', btn: '' },
  CAT2: { dot: 'bg-cat2 shadow-[0_0_6px_rgba(114,217,70,0.5)]', btn: 'bg-ghs-green/10 border border-ghs-green/25 text-ghs-green' },
  CAT3: { dot: 'bg-cat3 shadow-[0_0_6px_rgba(56,189,248,0.5)]',  btn: 'bg-cat3/10 border border-cat3/25 text-cat3' },
}

const CAT_LABELS = { CAT1: 'CAT 1', CAT2: 'CAT 2', CAT3: 'CAT 3' }

function PrimaryButton({ category }: { category: 'CAT1' | 'CAT2' | 'CAT3' }) {
  if (category === 'CAT2') {
    return (
      <button className={`w-full text-center rounded-md py-1.5 text-[11px] font-semibold mt-2 ${CAT_COLOURS.CAT2.btn}`}>
        ▶ Opmeting starten
      </button>
    )
  }
  if (category === 'CAT3') {
    return (
      <button className={`w-full text-center rounded-md py-1.5 text-[11px] font-semibold mt-2 ${CAT_COLOURS.CAT3.btn}`}>
        → Stuur naar dispatch
      </button>
    )
  }
  return null
}

interface Props {
  project: Project
  onSelect: (p: Project) => void
}

export default function ProjectCard({ project, onSelect }: Props) {
  const colours = CAT_COLOURS[project.category]

  return (
    <div
      onClick={() => onSelect(project)}
      className="bg-white/[0.04] border border-ghs-border rounded-lg p-3 cursor-pointer hover:border-white/15 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-2 h-2 rounded-full shrink-0 ${colours.dot}`} />
        <span className="text-[9px] text-white/25 uppercase tracking-wider">{CAT_LABELS[project.category]}</span>
      </div>
      <div className="text-[12px] font-bold text-ghs-text mb-0.5">{project.clientName}</div>
      <div className="text-[11px] text-ghs-muted">
        {project.city}{project.description ? ` · ${project.description}` : ''}
      </div>
      <PrimaryButton category={project.category} />
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test src/test/components/ProjectCard.test.tsx
```

Expected: PASS (5 tests)

- [ ] **Step 5: Implement KanbanColumn**

Create `src/components/kanban/KanbanColumn.tsx`:

```typescript
import type { Project } from '@prisma/client'
import ProjectCard from './ProjectCard'

const COLUMN_STYLES = {
  CAT1: { dot: 'bg-cat1 shadow-[0_0_6px_rgba(245,158,11,0.5)]', title: 'text-cat1', label: 'CAT 1 — Klaar voor inplanning' },
  CAT2: { dot: 'bg-cat2 shadow-[0_0_6px_rgba(114,217,70,0.5)]', title: 'text-cat2', label: 'CAT 2 — Opmeting intern' },
  CAT3: { dot: 'bg-cat3 shadow-[0_0_6px_rgba(56,189,248,0.5)]',  title: 'text-cat3', label: 'CAT 3 — Extern' },
}

interface Props {
  category: 'CAT1' | 'CAT2' | 'CAT3'
  projects: Project[]
  onSelect: (p: Project) => void
}

export default function KanbanColumn({ category, projects, onSelect }: Props) {
  const style = COLUMN_STYLES[category]
  return (
    <div className="flex-1 bg-white/[0.025] border border-white/[0.06] rounded-xl overflow-hidden flex flex-col">
      <div className="px-3.5 py-3 flex items-center gap-2 border-b border-white/[0.05]">
        <div className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
        <span className={`text-[11px] font-bold ${style.title}`}>{style.label}</span>
        <span className="ml-auto bg-white/[0.07] rounded-full px-2 py-0.5 text-[10px] text-white/35">
          {projects.length}
        </span>
      </div>
      <div className="p-2.5 flex flex-col gap-2 flex-1 overflow-y-auto">
        {projects.map(p => (
          <ProjectCard key={p.id} project={p} onSelect={onSelect} />
        ))}
        {projects.length === 0 && (
          <p className="text-[10px] text-white/15 text-center py-6">Geen projecten</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Implement KanbanBoard**

Create `src/components/kanban/KanbanBoard.tsx`:

```typescript
'use client'

import useSWR from 'swr'
import type { Project } from '@prisma/client'
import KanbanColumn from './KanbanColumn'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface Props {
  onSelect: (p: Project) => void
  onAdd: () => void
}

export default function KanbanBoard({ onSelect, onAdd }: Props) {
  const { data: projects = [], isLoading } = useSWR<Project[]>('/api/projects', fetcher, {
    refreshInterval: 30_000,
  })

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm">Laden...</div>
  }

  const byCategory = (cat: 'CAT1' | 'CAT2' | 'CAT3') =>
    projects.filter(p => p.category === cat)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3 bg-ghs-surface">
        <div>
          <h1 className="text-sm font-bold text-white">Mijn kanban</h1>
          <p className="text-[11px] text-white/30 mt-0.5">{projects.length} actieve projecten</p>
        </div>
        <button
          onClick={onAdd}
          className="ml-auto bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg px-4 py-2 text-xs shadow-[0_0_14px_rgba(114,217,70,0.2)] hover:shadow-[0_0_20px_rgba(114,217,70,0.35)] transition-shadow"
        >
          + Project toevoegen
        </button>
      </div>

      {/* Columns */}
      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        <KanbanColumn category="CAT1" projects={byCategory('CAT1')} onSelect={onSelect} />
        <KanbanColumn category="CAT2" projects={byCategory('CAT2')} onSelect={onSelect} />
        <KanbanColumn category="CAT3" projects={byCategory('CAT3')} onSelect={onSelect} />
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Create kanban page**

Create `src/app/app/kanban/page.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Project } from '@prisma/client'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import AddProjectModal from '@/components/kanban/AddProjectModal'

export default function KanbanPage() {
  const [selected, setSelected] = useState<Project | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="flex h-full overflow-hidden">
      <KanbanBoard onSelect={setSelected} onAdd={() => setShowAdd(true)} />
      {selected && (
        <ProjectDetailPanel project={selected} onClose={() => setSelected(null)} />
      )}
      {showAdd && (
        <AddProjectModal onClose={() => setShowAdd(false)} />
      )}
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: 3-column kanban board with project cards"
```

---

## Task 8: Add/Edit project form

**Files:**
- Create: `src/components/kanban/AddProjectModal.tsx`
- Create: `src/test/components/AddProjectModal.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/test/components/AddProjectModal.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AddProjectModal from '@/components/kanban/AddProjectModal'

vi.mock('swr', () => ({ mutate: vi.fn() }))

describe('AddProjectModal', () => {
  it('renders all required fields', () => {
    render(<AddProjectModal onClose={vi.fn()} />)
    expect(screen.getByLabelText(/naam klant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/telefoon/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/straat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/categorie/i)).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<AddProjectModal onClose={onClose} />)
    fireEvent.click(screen.getByText(/annuleren/i))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test src/test/components/AddProjectModal.test.tsx
```

Expected: FAIL

- [ ] **Step 3: Implement AddProjectModal**

Create `src/components/kanban/AddProjectModal.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { mutate } from 'swr'

interface Props {
  onClose: () => void
}

const inputClass = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ghs-text placeholder-white/20 outline-none focus:border-ghs-green/40 transition-colors'
const labelClass = 'block text-[10px] uppercase tracking-wider text-white/30 mb-1.5'

export default function AddProjectModal({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    clientName: '', email: '', phone: '',
    street: '', postalCode: '', city: '',
    category: 'CAT2',
    panelCount: '', roofType: '', description: '', sellerNotes: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        panelCount: form.panelCount ? parseInt(form.panelCount) : undefined,
      }),
    })
    await mutate('/api/projects')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-ghs-surface border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-ghs-teal via-ghs-green to-ghs-teal opacity-60" />

        <div className="p-6">
          <h2 className="text-sm font-bold text-white mb-5">Nieuw project toevoegen</h2>

          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Client info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label htmlFor="clientName" className={labelClass}>Naam klant *</label>
                <input id="clientName" required value={form.clientName} onChange={e => set('clientName', e.target.value)} className={inputClass} placeholder="Jan Janssen" />
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>E-mail *</label>
                <input id="email" type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} placeholder="jan@voorbeeld.be" />
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>Telefoon *</label>
                <input id="phone" required value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} placeholder="0499 00 00 00" />
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label htmlFor="street" className={labelClass}>Straat + nummer *</label>
                <input id="street" required value={form.street} onChange={e => set('street', e.target.value)} className={inputClass} placeholder="Kerkstraat 12" />
              </div>
              <div>
                <label htmlFor="postalCode" className={labelClass}>Postcode *</label>
                <input id="postalCode" required value={form.postalCode} onChange={e => set('postalCode', e.target.value)} className={inputClass} placeholder="9000" />
              </div>
              <div className="col-span-3">
                <label htmlFor="city" className={labelClass}>Gemeente *</label>
                <input id="city" required value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="Gent" />
              </div>
            </div>

            {/* Category + details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="category" className={labelClass}>Categorie *</label>
                <select id="category" value={form.category} onChange={e => set('category', e.target.value)} className={inputClass + ' cursor-pointer'}>
                  <option value="CAT1">CAT 1 — Klaar voor inplanning</option>
                  <option value="CAT2">CAT 2 — Opmeting intern</option>
                  <option value="CAT3">CAT 3 — Extern</option>
                </select>
              </div>
              <div>
                <label htmlFor="panelCount" className={labelClass}>Aantal panelen</label>
                <input id="panelCount" type="number" value={form.panelCount} onChange={e => set('panelCount', e.target.value)} className={inputClass} placeholder="20" />
              </div>
              <div>
                <label htmlFor="roofType" className={labelClass}>Daktype</label>
                <input id="roofType" value={form.roofType} onChange={e => set('roofType', e.target.value)} className={inputClass} placeholder="Hellend dak" />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Beschrijving</label>
                <input id="description" value={form.description} onChange={e => set('description', e.target.value)} className={inputClass} placeholder="Kort omschrijving" />
              </div>
            </div>
            <div>
              <label htmlFor="sellerNotes" className={labelClass}>Notities verkoper</label>
              <textarea id="sellerNotes" value={form.sellerNotes} onChange={e => set('sellerNotes', e.target.value)} className={inputClass + ' resize-none h-20'} placeholder="..." />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg py-2.5 text-sm text-ghs-muted hover:text-white/60 transition-colors">
                Annuleren
              </button>
              <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg py-2.5 text-sm disabled:opacity-50">
                {loading ? 'Opslaan...' : 'Project opslaan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test src/test/components/AddProjectModal.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add project modal with all fields and category selector"
```

---

## Task 9: Project detail panel

**Files:**
- Create: `src/components/kanban/ProjectDetailPanel.tsx`
- Create: `src/test/components/ProjectDetailPanel.test.tsx`

- [ ] **Step 1: Write failing test**

Create `src/test/components/ProjectDetailPanel.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import type { Project } from '@prisma/client'

const project: Project = {
  id: '1', clientName: 'An Claeys', email: 'an@test.be',
  phone: '0477 00 00 00', street: 'Dorpstraat 5', postalCode: '2000',
  city: 'Antwerpen', category: 'CAT2', panelCount: 16,
  roofType: 'Hellend', description: null, sellerNotes: 'Let op dakvenster',
  appointmentDate: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
}

describe('ProjectDetailPanel', () => {
  it('shows client name and contact info', () => {
    render(<ProjectDetailPanel project={project} onClose={vi.fn()} />)
    expect(screen.getByText('An Claeys')).toBeInTheDocument()
    expect(screen.getByText('an@test.be')).toBeInTheDocument()
    expect(screen.getByText('0477 00 00 00')).toBeInTheDocument()
  })

  it('shows seller notes', () => {
    render(<ProjectDetailPanel project={project} onClose={vi.fn()} />)
    expect(screen.getByText('Let op dakvenster')).toBeInTheDocument()
  })

  it('shows 3 email template buttons', () => {
    render(<ProjectDetailPanel project={project} onClose={vi.fn()} />)
    expect(screen.getByText(/Afspraak inplannen/i)).toBeInTheDocument()
    expect(screen.getByText(/Verslag doorsturen/i)).toBeInTheDocument()
    expect(screen.getByText(/Wijzigingen bespreken/i)).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<ProjectDetailPanel project={project} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /sluiten/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test src/test/components/ProjectDetailPanel.test.tsx
```

- [ ] **Step 3: Implement ProjectDetailPanel**

Create `src/components/kanban/ProjectDetailPanel.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Project } from '@prisma/client'
import EmailComposer from '@/components/email/EmailComposer'

const EXTERNAL_TOOLS = [
  { label: 'ESDEC ↗',      href: (p: Project) => 'https://my.esdec.com' },
  { label: 'Solaredge ↗',  href: (_: Project) => 'https://solaredge.com/solaredge-portal/solution/login' },
  { label: 'Geopunt ↗',    href: (p: Project) => `https://www.geopunt.be/catalogus#q=${encodeURIComponent(p.street + ' ' + p.city)}` },
  { label: 'WebODM ↗',     href: (_: Project) => 'https://webodm.net' },
]

type EmailTemplate = 'afspraak' | 'verslag' | 'wijzigingen'

interface Props {
  project: Project
  onClose: () => void
}

export default function ProjectDetailPanel({ project, onClose }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null)

  return (
    <aside className="w-96 shrink-0 bg-ghs-surface border-l border-white/[0.06] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">{project.clientName}</h2>
          <p className="text-[11px] text-ghs-muted mt-0.5">{project.city} · {project.category}</p>
        </div>
        <button
          aria-label="Sluiten"
          onClick={onClose}
          className="ml-auto w-7 h-7 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/40 text-sm transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Contact info */}
        <section className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Klantgegevens</p>
          <div className="space-y-2 text-[12px]">
            <div className="flex gap-2">
              <span className="text-white/30 w-16 shrink-0">Adres</span>
              <span className="text-ghs-text">{project.street}, {project.postalCode} {project.city}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white/30 w-16 shrink-0">Telefoon</span>
              <span className="text-ghs-text">{project.phone}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-white/30 w-16 shrink-0">E-mail</span>
              <span className="text-ghs-text">{project.email}</span>
            </div>
          </div>
        </section>

        {/* Project details */}
        <section className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Project</p>
          <div className="space-y-2 text-[12px]">
            {project.panelCount && (
              <div className="flex gap-2">
                <span className="text-white/30 w-16 shrink-0">Panelen</span>
                <span className="text-ghs-text">{project.panelCount}</span>
              </div>
            )}
            {project.roofType && (
              <div className="flex gap-2">
                <span className="text-white/30 w-16 shrink-0">Dak</span>
                <span className="text-ghs-text">{project.roofType}</span>
              </div>
            )}
            {project.sellerNotes && (
              <div>
                <span className="text-white/30 text-[10px] block mb-1">Notities verkoper</span>
                <p className="text-[11px] text-ghs-muted bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 leading-relaxed">
                  {project.sellerNotes}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* External tools */}
        <section className="px-5 py-4 border-b border-white/[0.05]">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Externe tools</p>
          <div className="grid grid-cols-2 gap-2">
            {EXTERNAL_TOOLS.map(tool => (
              <a
                key={tool.label}
                href={tool.href(project)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/[0.03] border border-white/[0.07] rounded-lg px-3 py-2 text-[11px] text-ghs-muted hover:border-ghs-green/30 hover:text-white/60 transition-colors text-center"
              >
                {tool.label}
              </a>
            ))}
          </div>
        </section>

        {/* Email templates */}
        <section className="px-5 py-4">
          <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">E-mail templates</p>
          <div className="flex flex-col gap-2">
            {(['afspraak', 'verslag', 'wijzigingen'] as EmailTemplate[]).map(tpl => (
              <button
                key={tpl}
                onClick={() => setActiveTemplate(activeTemplate === tpl ? null : tpl)}
                className={`text-left rounded-lg px-3 py-2.5 text-[11px] border transition-colors ${
                  activeTemplate === tpl
                    ? 'bg-ghs-green/[0.08] border-ghs-green/30 text-ghs-green'
                    : 'bg-white/[0.03] border-white/[0.07] text-ghs-muted hover:border-white/15 hover:text-white/60'
                }`}
              >
                ✉{' '}
                {tpl === 'afspraak' && 'Afspraak inplannen'}
                {tpl === 'verslag'  && 'Verslag doorsturen'}
                {tpl === 'wijzigingen' && 'Wijzigingen bespreken'}
              </button>
            ))}
          </div>
        </section>

        {/* Email composer (inline, below the buttons) */}
        {activeTemplate && (
          <div className="px-5 pb-5">
            <EmailComposer template={activeTemplate} project={project} />
          </div>
        )}
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test src/test/components/ProjectDetailPanel.test.tsx
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: project detail slide-in panel with contact info and tool links"
```

---

## Task 10: Email template composer

**Files:**
- Create: `src/lib/email.ts`
- Create: `src/components/email/EmailComposer.tsx`
- Create: `src/test/lib/email.test.ts`

- [ ] **Step 1: Write failing email tests**

Create `src/test/lib/email.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildMailtoUrl, EMAIL_TEMPLATES } from '@/lib/email'
import type { Project } from '@prisma/client'

const project: Project = {
  id: '1', clientName: 'Jan Janssen', email: 'jan@test.be',
  phone: '0499', street: 'Kerkstraat 1', postalCode: '9000',
  city: 'Gent', category: 'CAT2', panelCount: null,
  roofType: null, description: null, sellerNotes: null,
  appointmentDate: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
}

describe('buildMailtoUrl', () => {
  it('produces a mailto: URL with correct recipient', () => {
    const url = buildMailtoUrl('afspraak', project)
    expect(url).toMatch(/^mailto:jan@test\.be/)
  })

  it('includes a subject in the mailto URL', () => {
    const url = buildMailtoUrl('afspraak', project)
    expect(url).toContain('subject=')
    expect(url).toContain('Jan%20Janssen')
  })

  it('includes a body in the mailto URL', () => {
    const url = buildMailtoUrl('afspraak', project)
    expect(url).toContain('body=')
  })

  it('builds mailto URLs for all 3 templates', () => {
    const templates = ['afspraak', 'verslag', 'wijzigingen'] as const
    for (const tpl of templates) {
      expect(() => buildMailtoUrl(tpl, project)).not.toThrow()
    }
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
npm test src/test/lib/email.test.ts
```

- [ ] **Step 3: Implement email utility**

Create `src/lib/email.ts`:

```typescript
import type { Project } from '@prisma/client'

export type EmailTemplate = 'afspraak' | 'verslag' | 'wijzigingen'

function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}

export const EMAIL_TEMPLATES = {
  afspraak: {
    label: 'Afspraak inplannen',
    subject: (p: Project) => `Afspraak opmeting zonnepanelen — ${p.clientName}`,
    body: (p: Project) => `Beste ${firstName(p.clientName)},

We willen graag een afspraak inplannen voor de opmeting van uw installatie op ${p.street}, ${p.postalCode} ${p.city}.

Zou een van de volgende momenten passen voor u?

  • [Datum voorstel 1]
  • [Datum voorstel 2]

Gelieve te laten weten welk moment het beste uitkomt, of stel gerust een alternatief voor.

Met vriendelijke groeten,
Florian
Greenhouse Solutions`,
  },

  verslag: {
    label: 'Verslag doorsturen',
    subject: (p: Project) => `Opmetingsverslag — ${p.clientName} — ${p.street}, ${p.city}`,
    body: (p: Project) => `Beste ${firstName(p.clientName)},

In bijlage vindt u het opmetingsverslag voor uw installatie op ${p.street}, ${p.postalCode} ${p.city}.

Gelieve dit verslag door te nemen en te bevestigen. Bij vragen of opmerkingen kan u ons steeds contacteren.

Met vriendelijke groeten,
Florian
Greenhouse Solutions`,
  },

  wijzigingen: {
    label: 'Wijzigingen bespreken',
    subject: (p: Project) => `Wijzigingen opmetingsverslag — ${p.clientName}`,
    body: (p: Project) => `Beste ${firstName(p.clientName)},

We ontvingen uw vraag tot aanpassingen aan het opmetingsverslag voor de installatie op ${p.street}, ${p.postalCode} ${p.city}.

We bekijken de gevraagde wijzigingen en nemen zo snel mogelijk contact met u op.

Met vriendelijke groeten,
Florian
Greenhouse Solutions`,
  },
} as const

export function buildMailtoUrl(template: EmailTemplate, project: Project): string {
  const tpl = EMAIL_TEMPLATES[template]
  const subject = encodeURIComponent(tpl.subject(project))
  const body = encodeURIComponent(tpl.body(project))
  return `mailto:${project.email}?subject=${subject}&body=${body}`
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm test src/test/lib/email.test.ts
```

Expected: PASS (4 tests)

- [ ] **Step 5: Implement EmailComposer component**

Create `src/components/email/EmailComposer.tsx`:

```typescript
'use client'

import { useState } from 'react'
import type { Project } from '@prisma/client'
import { buildMailtoUrl, EMAIL_TEMPLATES, type EmailTemplate } from '@/lib/email'

interface Props {
  template: EmailTemplate
  project: Project
}

export default function EmailComposer({ template, project }: Props) {
  const [copied, setCopied] = useState(false)
  const tpl = EMAIL_TEMPLATES[template]
  const body = tpl.body(project)
  const subject = tpl.subject(project)
  const mailtoUrl = buildMailtoUrl(template, project)

  async function handleCopy() {
    await navigator.clipboard.writeText(`Onderwerp: ${subject}\n\n${body}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-ghs-bg border border-white/[0.08] rounded-xl overflow-hidden mt-3">
      {/* To + Subject */}
      <div className="px-4 py-3 space-y-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-white/25 w-14 shrink-0 uppercase tracking-wider text-[9px]">Aan</span>
          <span className="text-ghs-text font-medium">{project.email}</span>
        </div>
        <div className="flex items-start gap-3 text-[11px]">
          <span className="text-white/25 w-14 shrink-0 uppercase tracking-wider text-[9px] pt-0.5">Onderwerp</span>
          <span className="text-ghs-muted">{subject}</span>
        </div>
      </div>

      {/* Body preview */}
      <pre className="px-4 py-3 text-[11px] text-ghs-muted whitespace-pre-wrap leading-relaxed font-sans max-h-52 overflow-y-auto">
        {body}
      </pre>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-white/[0.05] flex gap-2">
        <a
          href={mailtoUrl}
          className="flex-[2] bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg py-2 text-[11px] text-center shadow-[0_0_10px_rgba(114,217,70,0.2)] hover:shadow-[0_0_16px_rgba(114,217,70,0.35)] transition-shadow"
        >
          ✉ Versturen via Outlook
        </a>
        <button
          onClick={handleCopy}
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 text-[11px] text-ghs-muted hover:text-white/60 transition-colors"
        >
          {copied ? '✓ Gekopieerd' : '📋 Kopieer'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: email template composer with mailto links and copy fallback"
```

---

## Task 11: Agenda page (Google Calendar + upcoming list)

**Files:**
- Create: `src/app/app/agenda/page.tsx`
- Create: `src/components/agenda/CalendarEmbed.tsx`
- Create: `src/components/agenda/UpcomingList.tsx`
- Create: `src/app/api/projects/upcoming/route.ts`
- Create: `src/test/components/UpcomingList.test.tsx`

- [ ] **Step 1: Upcoming projects API**

Create `src/app/api/projects/upcoming/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const projects = await prisma.project.findMany({
    where: {
      status: 'ACTIVE',
      appointmentDate: { gte: now, lte: twoWeeksLater },
    },
    orderBy: { appointmentDate: 'asc' },
  })

  return NextResponse.json(projects)
}
```

- [ ] **Step 2: Write failing UpcomingList test**

Create `src/test/components/UpcomingList.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: [
      {
        id: '1', clientName: 'Piet Peeters', city: 'Brugge',
        category: 'CAT2',
        appointmentDate: new Date('2026-05-23T09:00:00').toISOString(),
      },
    ],
    isLoading: false,
  })),
}))

import UpcomingList from '@/components/agenda/UpcomingList'

describe('UpcomingList', () => {
  it('renders upcoming appointment', () => {
    render(<UpcomingList />)
    expect(screen.getByText('Piet Peeters')).toBeInTheDocument()
    expect(screen.getByText(/Brugge/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run — expect FAIL**

```bash
npm test src/test/components/UpcomingList.test.tsx
```

- [ ] **Step 4: Implement UpcomingList**

Create `src/components/agenda/UpcomingList.tsx`:

```typescript
'use client'

import useSWR from 'swr'
import type { Project } from '@prisma/client'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const CAT_COLOURS = {
  CAT1: 'text-cat1 border-cat1/20 bg-cat1/[0.07]',
  CAT2: 'text-cat2 border-cat2/20 bg-cat2/[0.07]',
  CAT3: 'text-cat3 border-cat3/20 bg-cat3/[0.07]',
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('nl-BE', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export default function UpcomingList() {
  const { data: projects = [], isLoading } = useSWR<Project[]>('/api/projects/upcoming', fetcher)

  if (isLoading) return <div className="p-3 text-[10px] text-white/20">Laden...</div>

  return (
    <div className="flex flex-col gap-2 p-2.5 overflow-y-auto flex-1">
      {projects.length === 0 && (
        <p className="text-[10px] text-white/15 text-center py-6">
          Geen afspraken deze week
        </p>
      )}
      {projects.map(p => (
        <div key={p.id} className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-2.5 hover:border-white/15 cursor-pointer transition-colors">
          <div className="text-[9px] text-white/25 mb-1.5">
            📅 {p.appointmentDate ? formatDate(p.appointmentDate as unknown as string) : '—'}
          </div>
          <div className="text-[11px] font-semibold text-white/75 mb-0.5">{p.clientName}</div>
          <div className="text-[10px] text-white/30">{p.city}</div>
          <span className={`inline-flex mt-1.5 text-[9px] border rounded-full px-2 py-0.5 ${CAT_COLOURS[p.category]}`}>
            {p.category} — {p.category === 'CAT2' ? 'Florian' : p.category === 'CAT3' ? 'Aannemer' : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test src/test/components/UpcomingList.test.tsx
```

- [ ] **Step 6: Implement CalendarEmbed**

Create `src/components/agenda/CalendarEmbed.tsx`:

```typescript
export default function CalendarEmbed() {
  const src = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_SRC

  if (!src) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-3 text-ghs-muted">
        <p className="text-sm">Google Calendar niet geconfigureerd</p>
        <p className="text-[11px] text-white/20">
          Voeg <code className="text-ghs-green/70">NEXT_PUBLIC_GOOGLE_CALENDAR_SRC</code> toe aan .env.local
        </p>
      </div>
    )
  }

  return (
    <iframe
      src={src}
      className="flex-1 w-full border-0"
      style={{ colorScheme: 'light' }}
      title="Google Calendar"
    />
  )
}
```

Add to `.env.local`:
```
NEXT_PUBLIC_GOOGLE_CALENDAR_SRC=<your Google Calendar embed src URL>
```

- [ ] **Step 7: Create agenda page**

Create `src/app/app/agenda/page.tsx`:

```typescript
import CalendarEmbed from '@/components/agenda/CalendarEmbed'
import UpcomingList from '@/components/agenda/UpcomingList'

export default function AgendaPage() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Main: Calendar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.05] bg-ghs-surface shrink-0">
          <h1 className="text-sm font-bold text-white">Agenda</h1>
          <p className="text-[11px] text-white/30 mt-0.5">Google Calendar</p>
        </div>
        <CalendarEmbed />
      </div>

      {/* Right: Upcoming opmetingen */}
      <aside className="w-56 shrink-0 border-l border-white/[0.05] bg-white/[0.015] flex flex-col overflow-hidden">
        <div className="px-3.5 py-3 border-b border-white/[0.05] shrink-0">
          <p className="text-[11px] font-bold text-white/60">Aankomende opmetingen</p>
          <p className="text-[10px] text-white/20 mt-0.5">Komende 2 weken</p>
        </div>
        <UpcomingList />
        <div className="p-2.5 border-t border-white/[0.05] shrink-0">
          <a
            href={`https://calendar.google.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-white/[0.04] border border-white/[0.08] rounded-lg py-2 text-[10px] text-white/30 hover:text-white/50 hover:border-ghs-green/30 transition-colors"
          >
            ↗ Openen in Google Calendar
          </a>
        </div>
      </aside>
    </div>
  )
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: agenda page with Google Calendar embed and upcoming opmetingen list"
```

---

## Task 12: Final check + deploy to Vercel

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected: All tests PASS. Fix any failures before proceeding.

- [ ] **Step 2: Run the dev server and manually verify the full flow**

```bash
npm run dev
```

Check each of these manually:
- `http://localhost:3000` → redirects to `/app/kanban`
- `/app/kanban` → redirects to `/login` (not logged in)
- `/login` → enter password → lands on kanban
- Kanban shows 3 columns; "+ Project toevoegen" opens modal; fill in form, save → card appears
- Click a card → detail panel slides in; client info, tool links, email buttons all visible
- Click an email template button → composer expands; "Versturen via Outlook" opens mail client
- `/app/agenda` → Calendar embed loads (if configured); upcoming list shows appointments
- `/app/dispatch` → placeholder message

- [ ] **Step 3: Build for production**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 4: Deploy to Vercel**

```bash
npx vercel --prod
```

During the flow, set these environment variables in the Vercel dashboard (`Settings → Environment Variables`):
- `FLORIAN_PASSWORD_HASH` — the bcrypt hash from Task 1
- `JWT_SECRET` — the random 32-char hex from Task 1
- `DATABASE_URL` — for production, use a Postgres URL from [neon.tech](https://neon.tech) (free tier). Switch `schema.prisma` provider to `postgresql` and re-run `npx prisma db push`.
- `NEXT_PUBLIC_GOOGLE_CALENDAR_SRC` — Google Calendar embed URL

- [ ] **Step 5: Switch to Postgres for production**

In `prisma/schema.prisma`, change:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Run `npx prisma db push` after setting `DATABASE_URL` to your Neon connection string.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Plan 1 complete — foundation, kanban, email templates, agenda"
```

---

## Summary

After Plan 1, Florian has a fully working app where he can:
- Log in securely
- See all projects in a 3-column kanban (CAT 1/2/3)
- Add and view projects with full client details
- Open pre-filled email templates that open Outlook
- See his Google Calendar with upcoming appointments

**Next: Plan 2** adds the survey form (23 photo slots, measurement fields) and PDF generation.  
**Next: Plan 3** adds the dispatch kanban and contractor portal.
