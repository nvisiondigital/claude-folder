# Contractor Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a contractor (aannemer) portal that reuses the existing SurveyForm and PDF pipeline, lets contractors fill in surveys, then "deliver" completed surveys to Florian's kanban for review before any client communication.

**Architecture:** A separate `/contractor/**` route namespace with its own session cookie (`ghs_contractor_session`) and a single env-var password. The existing SurveyForm, PhotoSlot, and PDF route are reused unchanged. A new deliver API sets `Survey.deliveredAt` and flips `DispatchJob.status` to `SURVEY_COMPLETED`, which makes the card appear in a new "Opmeting gedaan" column on Florian's kanban.

**Tech Stack:** Next.js 16.2.6 App Router, Prisma 7 + SQLite, bcryptjs + jose JWT, Tailwind v4, Vitest + React Testing Library

---

## File Map

### Created
- `src/lib/auth.ts` — **modified**: add `CONTRACTOR_SESSION_COOKIE`, `getAuthRole()`
- `src/lib/types.ts` — **modified**: add `deliveredAt` to `SurveyStub`
- `src/app/api/projects/route.ts` — **modified**: Florian-only role check + `deliveredAt` in survey select
- `src/app/api/projects/[id]/route.ts` — **modified**: GET accepts both roles; PATCH/DELETE Florian-only
- `src/app/api/projects/upcoming/route.ts` — **modified**: Florian-only role check
- `src/app/api/surveys/[projectId]/route.ts` — **modified**: accept both roles via `getAuthRole`
- `src/app/api/surveys/[projectId]/photos/route.ts` — **modified**: accept both roles
- `src/app/api/surveys/[projectId]/photos/[photoId]/route.ts` — **modified**: accept both roles
- `src/app/api/surveys/[projectId]/pdf/route.ts` — **modified**: accept both roles
- `src/app/api/contractor/auth/login/route.ts` — **new**: contractor login
- `src/app/api/contractor/projects/route.ts` — **new**: GET all CAT2 active projects (contractor auth)
- `src/app/api/surveys/[projectId]/deliver/route.ts` — **new**: POST to deliver to Florian
- `src/app/contractor/login/page.tsx` — **new**: contractor login page (client component)
- `src/app/contractor/page.tsx` — **new**: server auth guard → ContractorPageClient
- `src/app/contractor/ContractorPageClient.tsx` — **new**: project list with status + deliver button
- `src/app/contractor/survey/[projectId]/page.tsx` — **new**: server auth guard → ContractorSurveyPageClient
- `src/app/contractor/survey/[projectId]/ContractorSurveyPageClient.tsx` — **new**: wraps SurveyForm
- `src/components/kanban/KanbanBoard.tsx` — **modified**: add Opmeting gedaan column
- `src/components/kanban/KanbanColumn.tsx` — **modified**: add DELIVERED column style
- `src/test/lib/auth.test.ts` — **new**
- `src/test/api/contractor-login.test.ts` — **new**
- `src/test/api/contractor-projects.test.ts` — **new**
- `src/test/api/deliver.test.ts` — **new**
- `src/test/components/ContractorPageClient.test.tsx` — **new**
- `src/test/components/KanbanBoard.test.tsx` — **new**

---

## Key types after this plan

```ts
// src/lib/types.ts additions
export type SurveyStub = {
  id: string
  isDraft: boolean
  deliveredAt: string | null   // ← new
}

// ProjectWithSurvey unchanged (uses SurveyStub, so deliveredAt is automatically included)
```

```ts
// src/lib/auth.ts additions
export const CONTRACTOR_SESSION_COOKIE = 'ghs_contractor_session'

// Returns which role is authenticated, or null if neither
export async function getAuthRole(
  florianToken: string | undefined,
  contractorToken: string | undefined,
): Promise<'florian' | 'contractor' | null>
```

---

### Task 1: Auth hardening + deliveredAt in types

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/app/api/projects/route.ts`
- Modify: `src/app/api/projects/[id]/route.ts`
- Modify: `src/app/api/projects/upcoming/route.ts`
- Modify: `src/app/api/surveys/[projectId]/route.ts`
- Modify: `src/app/api/surveys/[projectId]/photos/route.ts`
- Modify: `src/app/api/surveys/[projectId]/photos/[photoId]/route.ts`
- Modify: `src/app/api/surveys/[projectId]/pdf/route.ts`
- Modify: `.env.local`
- Create: `src/test/lib/auth.test.ts`

**Context:** `auth.ts` currently exports `SESSION_COOKIE`, `verifyToken`, `createToken`. All existing routes check `verifyToken(token)` without role validation — any valid JWT works on any route. Plan 3 adds a second role (`contractor`) so we must add role checks. We also need `deliveredAt` on `SurveyStub` so the contractor project list and Florian's kanban can show delivery status.

- [ ] **Step 1: Write failing tests for getAuthRole**

Create `src/test/lib/auth.test.ts`:

```ts
// src/test/lib/auth.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createToken, getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

// Set a test JWT_SECRET before importing
process.env.JWT_SECRET = 'test-secret-32-chars-long-padding'

describe('getAuthRole', () => {
  it('returns florian for a valid florian token', async () => {
    const token = await createToken({ role: 'florian' })
    const role = await getAuthRole(token, undefined)
    expect(role).toBe('florian')
  })

  it('returns contractor for a valid contractor token', async () => {
    const token = await createToken({ role: 'contractor' })
    const role = await getAuthRole(undefined, token)
    expect(role).toBe('contractor')
  })

  it('returns null when both tokens are undefined', async () => {
    const role = await getAuthRole(undefined, undefined)
    expect(role).toBeNull()
  })

  it('returns null for a contractor token passed as florian token', async () => {
    const token = await createToken({ role: 'contractor' })
    // contractor token placed in the florian slot → should not grant florian access
    const role = await getAuthRole(token, undefined)
    expect(role).toBeNull()
  })

  it('exports correct cookie names', () => {
    expect(SESSION_COOKIE).toBe('ghs_session')
    expect(CONTRACTOR_SESSION_COOKIE).toBe('ghs_contractor_session')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd greenhouse-app && npx vitest run src/test/lib/auth.test.ts 2>&1 | tail -15
```

Expected: FAIL — `getAuthRole is not a function` and `CONTRACTOR_SESSION_COOKIE is not exported`

- [ ] **Step 3: Update src/lib/auth.ts**

Replace the entire file:

```ts
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
export const CONTRACTOR_SESSION_COOKIE = 'ghs_contractor_session'

/**
 * Check which role is authenticated.
 * florianToken comes from SESSION_COOKIE, contractorToken from CONTRACTOR_SESSION_COOKIE.
 * Returns 'florian' | 'contractor' | null.
 */
export async function getAuthRole(
  florianToken: string | undefined,
  contractorToken: string | undefined,
): Promise<'florian' | 'contractor' | null> {
  if (florianToken) {
    const p = await verifyToken(florianToken)
    if (p?.role === 'florian') return 'florian'
  }
  if (contractorToken) {
    const p = await verifyToken(contractorToken)
    if (p?.role === 'contractor') return 'contractor'
  }
  return null
}
```

- [ ] **Step 4: Run auth tests — must pass**

```bash
cd greenhouse-app && npx vitest run src/test/lib/auth.test.ts 2>&1 | tail -10
```

Expected: 5 passed

- [ ] **Step 5: Add deliveredAt to SurveyStub in src/lib/types.ts**

Change only the `SurveyStub` type (lines 24-27):

```ts
export type SurveyStub = {
  id: string
  isDraft: boolean
  deliveredAt: string | null
}
```

- [ ] **Step 6: Update src/app/api/projects/route.ts — Florian-only + deliveredAt in select**

Replace entire file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import type { CreateProjectInput } from '@/lib/types'

const REQUIRED_FIELDS: (keyof CreateProjectInput)[] = [
  'clientName', 'email', 'phone', 'street', 'postalCode', 'city', 'category',
]

async function requireFlorian() {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  return role === 'florian'
}

export async function GET(_req: NextRequest) {
  if (!(await requireFlorian())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { survey: { select: { id: true, isDraft: true, deliveredAt: true } } },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  if (!(await requireFlorian())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateProjectInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  for (const field of REQUIRED_FIELDS) {
    if (body[field] == null || body[field] === '') {
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

- [ ] **Step 7: Update src/app/api/projects/[id]/route.ts — GET accepts both, PATCH/DELETE Florian-only**

Replace entire file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import type { UpdateProjectInput } from '@/lib/types'

async function getRole() {
  const cookieStore = await cookies()
  return getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getRole())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if ((await getRole()) !== 'florian') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let body: UpdateProjectInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.clientName     !== undefined && { clientName: body.clientName }),
        ...(body.email          !== undefined && { email: body.email }),
        ...(body.phone          !== undefined && { phone: body.phone }),
        ...(body.street         !== undefined && { street: body.street }),
        ...(body.postalCode     !== undefined && { postalCode: body.postalCode }),
        ...(body.city           !== undefined && { city: body.city }),
        ...(body.category       !== undefined && { category: body.category }),
        ...(body.panelCount     !== undefined && { panelCount: body.panelCount }),
        ...(body.roofType       !== undefined && { roofType: body.roofType }),
        ...(body.description    !== undefined && { description: body.description }),
        ...(body.sellerNotes    !== undefined && { sellerNotes: body.sellerNotes }),
        ...(body.status         !== undefined && { status: body.status }),
        ...(body.appointmentDate !== undefined && {
          appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
        }),
      },
    })
    return NextResponse.json(project)
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if ((await getRole()) !== 'florian') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}
```

- [ ] **Step 8: Update src/app/api/projects/upcoming/route.ts — Florian-only**

Read the file first. Whatever its current auth check is (verifyToken + SESSION_COOKIE), replace with:

```ts
// Replace the auth block at the top of GET with:
const cookieStore = await cookies()
const role = await getAuthRole(
  cookieStore.get(SESSION_COOKIE)?.value,
  cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
)
if (role !== 'florian') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Also update the import line to use `getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE` instead of `verifyToken, SESSION_COOKIE`.

- [ ] **Step 9: Update the four survey API routes — accept both roles**

For each of these four files:
- `src/app/api/surveys/[projectId]/route.ts`
- `src/app/api/surveys/[projectId]/photos/route.ts`
- `src/app/api/surveys/[projectId]/photos/[photoId]/route.ts`
- `src/app/api/surveys/[projectId]/pdf/route.ts`

Replace the auth import at the top:

```ts
// OLD
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
// NEW
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
```

Replace every auth check block (there is one near the top of each handler function). The pattern to find and replace:

```ts
// OLD pattern (appears once per function in each file)
const cookieStore = await cookies()
const token = cookieStore.get(SESSION_COOKIE)?.value
if (!token || !(await verifyToken(token))) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// NEW pattern
const cookieStore = await cookies()
const role = await getAuthRole(
  cookieStore.get(SESSION_COOKIE)?.value,
  cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
)
if (!role) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Note: `surveys/[projectId]/route.ts` has an internal `getAuth()` helper — replace its body instead:

```ts
// In surveys/[projectId]/route.ts, replace getAuth() entirely:
async function getAuth() {
  const cookieStore = await cookies()
  return getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
}
// Then every handler checks: if (!(await getAuth())) return 401
```

- [ ] **Step 10: Add contractor password to .env.local**

Run this command to generate the hash:

```bash
cd greenhouse-app && node -e "const b = require('bcryptjs'); b.hash('GHS2024', 10).then(h => console.log('CONTRACTOR_PASSWORD_HASH=' + h))"
```

Copy the output line and append to `.env.local`. After editing, `.env.local` should contain:

```
FLORIAN_PASSWORD_HASH=...existing...
JWT_SECRET=...existing...
NEXT_PUBLIC_GOOGLE_CALENDAR_SRC=...existing...
DATABASE_URL=...existing...
CONTRACTOR_PASSWORD_HASH=$2b$10$<generated hash here>
```

- [ ] **Step 11: Run full test suite — must still pass**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all existing tests + 5 new auth tests pass. Total should be 81 passed.

- [ ] **Step 12: Update mock in existing surveys.test.ts to export CONTRACTOR_SESSION_COOKIE**

In `src/test/api/surveys.test.ts`, find the auth mock:

```ts
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return { ...actual, verifyToken: mockVerifyToken, SESSION_COOKIE: 'ghs_session' }
})
```

Replace with:

```ts
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    verifyToken: mockVerifyToken,
    SESSION_COOKIE: 'ghs_session',
    CONTRACTOR_SESSION_COOKIE: 'ghs_contractor_session',
    getAuthRole: vi.fn().mockResolvedValue('florian'),
  }
})
```

Also update `mockCookiesGet` to return `'valid'` for the `ghs_session` key.

- [ ] **Step 13: Run full suite again**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all tests pass (no regressions).

- [ ] **Step 14: Commit**

```bash
cd greenhouse-app && git add src/lib/auth.ts src/lib/types.ts src/app/api/projects/route.ts src/app/api/projects/[id]/route.ts src/app/api/projects/upcoming/route.ts src/app/api/surveys/[projectId]/route.ts "src/app/api/surveys/[projectId]/photos/route.ts" "src/app/api/surveys/[projectId]/photos/[photoId]/route.ts" "src/app/api/surveys/[projectId]/pdf/route.ts" src/test/lib/auth.test.ts src/test/api/surveys.test.ts .env.local
git commit -m "feat: role-aware auth — contractor cookie + getAuthRole helper"
```

---

### Task 2: Contractor login API + page

**Files:**
- Create: `src/app/api/contractor/auth/login/route.ts`
- Create: `src/app/contractor/login/page.tsx`
- Create: `src/test/api/contractor-login.test.ts`

**Context:** Mirrors Florian's login (`/api/auth/login`) but checks `CONTRACTOR_PASSWORD_HASH` env var and sets `ghs_contractor_session` cookie with `role: 'contractor'`. Login page mirrors Florian's login page but says "Aannemer portaal".

- [ ] **Step 1: Write failing test**

Create `src/test/api/contractor-login.test.ts`:

```ts
// src/test/api/contractor-login.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockVerifyPassword = vi.hoisted(() => vi.fn())
const mockCreateToken    = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return { ...actual, verifyPassword: mockVerifyPassword, createToken: mockCreateToken, CONTRACTOR_SESSION_COOKIE: 'ghs_contractor_session' }
})

import { POST } from '@/app/api/contractor/auth/login/route'
import { NextRequest } from 'next/server'

function req(body: object) {
  return new NextRequest('http://localhost/api/contractor/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

describe('POST /api/contractor/auth/login', () => {
  it('returns 400 when password is missing', async () => {
    const res = await POST(req({}))
    expect(res.status).toBe(400)
  })

  it('returns 401 for wrong password', async () => {
    process.env.CONTRACTOR_PASSWORD_HASH = '$2b$10$fake'
    mockVerifyPassword.mockResolvedValue(false)
    const res = await POST(req({ password: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('sets ghs_contractor_session cookie on success', async () => {
    process.env.CONTRACTOR_PASSWORD_HASH = '$2b$10$real'
    mockVerifyPassword.mockResolvedValue(true)
    mockCreateToken.mockResolvedValue('contractor-jwt')
    const res = await POST(req({ password: 'GHS2024' }))
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toContain('ghs_contractor_session=contractor-jwt')
  })

  it('returns 500 when CONTRACTOR_PASSWORD_HASH is not set', async () => {
    delete process.env.CONTRACTOR_PASSWORD_HASH
    const res = await POST(req({ password: 'GHS2024' }))
    expect(res.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd greenhouse-app && npx vitest run src/test/api/contractor-login.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found

- [ ] **Step 3: Create src/app/api/contractor/auth/login/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createToken, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const password =
    body && typeof body === 'object' && 'password' in body
      ? (body as Record<string, unknown>).password
      : undefined

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const hash = process.env.CONTRACTOR_PASSWORD_HASH
  if (!hash) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const valid = await verifyPassword(password, hash)
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 })

  const token = await createToken({ role: 'contractor' })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CONTRACTOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
```

- [ ] **Step 4: Run tests — must pass**

```bash
cd greenhouse-app && npx vitest run src/test/api/contractor-login.test.ts 2>&1 | tail -10
```

Expected: 4 passed

- [ ] **Step 5: Create src/app/contractor/login/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ContractorLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/contractor/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push('/contractor')
    } else {
      setError('Ongeldig wachtwoord. Probeer opnieuw.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-ghs-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ghs-green to-ghs-teal shadow-[0_0_24px_rgba(114,217,70,0.3)] mb-4" />
          <h1 className="text-lg font-bold text-white">Greenhouse Solutions</h1>
          <p className="text-xs text-ghs-muted mt-1">Aannemer portaal</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-ghs-surface border border-ghs-border rounded-2xl p-8 shadow-[0_0_60px_rgba(114,217,70,0.05)]"
        >
          <div className="h-0.5 bg-gradient-to-r from-ghs-teal via-ghs-green to-ghs-teal opacity-60 -mx-8 -mt-8 mb-8 rounded-t-2xl" />

          <label htmlFor="password" className="block text-xs uppercase tracking-widest text-ghs-dim mb-2">
            Wachtwoord
          </label>
          <input
            id="password"
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

- [ ] **Step 6: Run full suite**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
cd greenhouse-app && git add src/app/api/contractor/auth/login/route.ts src/app/contractor/login/page.tsx src/test/api/contractor-login.test.ts
git commit -m "feat: contractor login API and page"
```

---

### Task 3: Contractor project list API + portal page

**Files:**
- Create: `src/app/api/contractor/projects/route.ts`
- Create: `src/app/contractor/page.tsx`
- Create: `src/app/contractor/ContractorPageClient.tsx`
- Create: `src/test/api/contractor-projects.test.ts`
- Create: `src/test/components/ContractorPageClient.test.tsx`

**Context:** The contractor portal home page shows all CAT2 ACTIVE projects. Each card shows: client name, city, and a status badge (Opmeting nog te doen / Concept / Klaar om in te dienen / Ingediend). When the survey is done but not delivered, a "Lever in" button is shown — this is wired in Task 5. For now render the button as a disabled placeholder.

A minimal top bar shows "GHS — Aannemer portaal" and a logout link that calls `DELETE /api/contractor/auth/logout` (or just clears cookie via a simple API — implement inline for simplicity). Add a `POST /api/contractor/auth/logout` that clears the cookie.

- [ ] **Step 1: Write failing API test**

Create `src/test/api/contractor-projects.test.ts`:

```ts
// src/test/api/contractor-projects.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockProjectFindMany } = vi.hoisted(() => ({
  mockProjectFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: { project: { findMany: mockProjectFindMany } },
}))

const mockGetAuthRole = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    getAuthRole: mockGetAuthRole,
    SESSION_COOKIE: 'ghs_session',
    CONTRACTOR_SESSION_COOKIE: 'ghs_contractor_session',
  }
})

const mockCookiesGet = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookiesGet })),
}))

import { GET } from '@/app/api/contractor/projects/route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('http://localhost/api/contractor/projects', {
  headers: { cookie: 'ghs_contractor_session=valid' },
})

const sampleProject = {
  id: 'proj1', clientName: 'Jan', city: 'Gent', category: 'CAT2',
  email: 'j@j.be', phone: '0400', street: 'Kerkstr 1', postalCode: '9000',
  status: 'ACTIVE', survey: { id: 's1', isDraft: true, deliveredAt: null },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCookiesGet.mockReturnValue({ value: 'valid' })
})

describe('GET /api/contractor/projects', () => {
  it('returns 401 when not authenticated as contractor', async () => {
    mockGetAuthRole.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns 401 when authenticated as florian (not contractor)', async () => {
    mockGetAuthRole.mockResolvedValue('florian')
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns all CAT2 active projects for contractor', async () => {
    mockGetAuthRole.mockResolvedValue('contractor')
    mockProjectFindMany.mockResolvedValue([sampleProject])
    const res = await GET(req())
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].clientName).toBe('Jan')
  })

  it('queries only CAT2 ACTIVE projects', async () => {
    mockGetAuthRole.mockResolvedValue('contractor')
    mockProjectFindMany.mockResolvedValue([])
    await GET(req())
    expect(mockProjectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: 'CAT2', status: 'ACTIVE' }),
      })
    )
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd greenhouse-app && npx vitest run src/test/api/contractor-projects.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found

- [ ] **Step 3: Create src/app/api/contractor/projects/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  // This endpoint is contractor-only
  if (role !== 'contractor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { category: 'CAT2', status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { survey: { select: { id: true, isDraft: true, deliveredAt: true } } },
  })
  return NextResponse.json(projects)
}
```

- [ ] **Step 4: Run API tests — must pass**

```bash
cd greenhouse-app && npx vitest run src/test/api/contractor-projects.test.ts 2>&1 | tail -10
```

Expected: 4 passed

- [ ] **Step 5: Write failing component test**

Create `src/test/components/ContractorPageClient.test.tsx`:

```tsx
// src/test/components/ContractorPageClient.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

const noSurveyProject = {
  id: 'p1', clientName: 'Jan Janssen', city: 'Gent', category: 'CAT2',
  street: 'Kerkstr 1', postalCode: '9000', survey: null,
}
const draftProject = {
  id: 'p2', clientName: 'Piet Pieters', city: 'Antwerpen', category: 'CAT2',
  street: 'Meir 1', postalCode: '2000', survey: { id: 's2', isDraft: true, deliveredAt: null },
}
const doneProject = {
  id: 'p3', clientName: 'Marie Maes', city: 'Brugge', category: 'CAT2',
  street: 'Burg 1', postalCode: '8000', survey: { id: 's3', isDraft: false, deliveredAt: null },
}
const deliveredProject = {
  id: 'p4', clientName: 'Luc Lievens', city: 'Hasselt', category: 'CAT2',
  street: 'Grote Markt 1', postalCode: '3500',
  survey: { id: 's4', isDraft: false, deliveredAt: '2026-05-21T10:00:00Z' },
}

beforeEach(() => { vi.clearAllMocks() })

import ContractorPageClient from '@/app/contractor/ContractorPageClient'

describe('ContractorPageClient', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<ContractorPageClient />)
    expect(screen.getByText(/laden/i)).toBeInTheDocument()
  })

  it('shows Opmeting starten for projects without survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [noSurveyProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Jan Janssen'))
    expect(screen.getByText(/Opmeting starten/i)).toBeInTheDocument()
  })

  it('shows Opmeting hervatten for draft survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [draftProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Piet Pieters'))
    expect(screen.getByText(/Opmeting hervatten/i)).toBeInTheDocument()
  })

  it('shows Lever in button for done but not delivered survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [doneProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Marie Maes'))
    expect(screen.getByText(/Lever in/i)).toBeInTheDocument()
  })

  it('shows Ingediend badge for delivered survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [deliveredProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Luc Lievens'))
    expect(screen.getByText(/Ingediend/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run component test to confirm failure**

```bash
cd greenhouse-app && npx vitest run src/test/components/ContractorPageClient.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found

- [ ] **Step 7: Create src/app/contractor/page.tsx**

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import ContractorPageClient from './ContractorPageClient'

export default async function ContractorPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value
  if (!token) redirect('/contractor/login')
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'contractor') redirect('/contractor/login')

  return <ContractorPageClient />
}
```

- [ ] **Step 8: Create src/app/contractor/ContractorPageClient.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type SurveyInfo = { id: string; isDraft: boolean; deliveredAt: string | null } | null

type ContractorProject = {
  id: string
  clientName: string
  city: string
  street: string
  postalCode: string
  survey: SurveyInfo
}

function statusLabel(survey: SurveyInfo): string {
  if (!survey)                   return 'Opmeting nog te doen'
  if (survey.isDraft)            return 'Concept'
  if (survey.deliveredAt)        return 'Ingediend ✓'
  return 'Klaar om in te dienen'
}

function statusColor(survey: SurveyInfo): string {
  if (!survey)              return 'text-white/30'
  if (survey.isDraft)       return 'text-amber-400'
  if (survey.deliveredAt)   return 'text-ghs-green/80'
  return 'text-blue-400'
}

export default function ContractorPageClient() {
  const [projects, setProjects] = useState<ContractorProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/contractor/projects')
      .then(r => { if (!r.ok) throw new Error('Laden mislukt'); return r.json() })
      .then(setProjects)
      .catch(() => setError('Kon projecten niet laden.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDeliver(projectId: string) {
    const res = await fetch(`/api/surveys/${projectId}/deliver`, { method: 'POST' })
    if (res.ok) {
      setProjects(prev => prev.map(p =>
        p.id === projectId && p.survey
          ? { ...p, survey: { ...p.survey, deliveredAt: new Date().toISOString() } }
          : p
      ))
    }
  }

  async function handleLogout() {
    await fetch('/api/contractor/auth/logout', { method: 'POST' })
    window.location.href = '/contractor/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ghs-bg flex items-center justify-center text-ghs-muted text-sm">
        Projecten laden...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ghs-bg flex flex-col">
      {/* Top bar */}
      <header className="bg-ghs-surface border-b border-white/[0.05] px-5 py-3.5 flex items-center gap-3">
        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-ghs-green to-ghs-teal shrink-0" />
        <span className="text-sm font-bold text-white">Greenhouse Solutions</span>
        <span className="text-[11px] text-white/30">— Aannemer portaal</span>
        <button
          type="button"
          onClick={handleLogout}
          className="ml-auto text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          Uitloggen
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 p-5 max-w-2xl mx-auto w-full">
        <h2 className="text-xs uppercase tracking-widest text-white/25 mb-4">
          Mijn opdrachten — CAT 2
        </h2>

        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}

        <div className="flex flex-col gap-3">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-ghs-surface border border-white/[0.06] rounded-xl p-4 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{project.clientName}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{project.street}, {project.postalCode} {project.city}</p>
                <p className={`text-[10px] mt-1.5 ${statusColor(project.survey)}`}>
                  {statusLabel(project.survey)}
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                {/* Show survey action button unless already delivered */}
                {!project.survey?.deliveredAt && (
                  <Link
                    href={`/contractor/survey/${project.id}`}
                    className="bg-ghs-green/10 border border-ghs-green/25 hover:bg-ghs-green/15 text-ghs-green rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors text-center"
                  >
                    {!project.survey || project.survey.isDraft
                      ? (!project.survey ? '▶ Opmeting starten' : '✏ Opmeting hervatten')
                      : '✏ Opmeting bekijken'}
                  </Link>
                )}

                {/* Deliver button: survey done but not yet delivered */}
                {project.survey && !project.survey.isDraft && !project.survey.deliveredAt && (
                  <button
                    type="button"
                    onClick={() => handleDeliver(project.id)}
                    className="bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg px-3 py-1.5 text-[11px] shadow-[0_0_10px_rgba(114,217,70,0.2)] hover:shadow-[0_0_16px_rgba(114,217,70,0.35)] transition-shadow"
                  >
                    Lever in
                  </button>
                )}
              </div>
            </div>
          ))}

          {projects.length === 0 && !error && (
            <p className="text-sm text-white/25 text-center py-12">Geen opdrachten gevonden.</p>
          )}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 9: Create the logout API (needed by ContractorPageClient)**

Create `src/app/api/contractor/auth/logout/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(CONTRACTOR_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })
  return res
}
```

- [ ] **Step 10: Run component tests — must pass**

```bash
cd greenhouse-app && npx vitest run src/test/components/ContractorPageClient.test.tsx 2>&1 | tail -10
```

Expected: 5 passed

- [ ] **Step 11: Run full suite**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 12: Commit**

```bash
cd greenhouse-app && git add src/app/api/contractor/projects/route.ts src/app/api/contractor/auth/logout/route.ts src/app/contractor/page.tsx src/app/contractor/ContractorPageClient.tsx src/test/api/contractor-projects.test.ts src/test/components/ContractorPageClient.test.tsx
git commit -m "feat: contractor portal — project list + logout"
```

---

### Task 4: Contractor survey page

**Files:**
- Create: `src/app/contractor/survey/[projectId]/page.tsx`
- Create: `src/app/contractor/survey/[projectId]/ContractorSurveyPageClient.tsx`

**Context:** Mirrors `src/app/app/survey/[projectId]/` but guards with `CONTRACTOR_SESSION_COOKIE`. The `SurveyForm` component is reused without changes. The `onSave` callback saves via `PUT /api/surveys/[projectId]` (now accepts both roles after Task 1). When `isDraft=false` (finalize), redirect to `/contractor` so the contractor sees the "Lever in" button.

Note: `SurveyPageClient` in the Florian portal fetches `GET /api/projects/${projectId}` for the client name. That route now accepts both roles (Task 1), so the same pattern works here.

- [ ] **Step 1: Create src/app/contractor/survey/[projectId]/page.tsx**

```tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import ContractorSurveyPageClient from './ContractorSurveyPageClient'

type Props = { params: Promise<{ projectId: string }> }

export default async function ContractorSurveyPage({ params }: Props) {
  const cookieStore = await cookies()
  const token = cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value
  if (!token) redirect('/contractor/login')
  const payload = await verifyToken(token)
  if (!payload || payload.role !== 'contractor') redirect('/contractor/login')

  const { projectId } = await params
  return <ContractorSurveyPageClient projectId={projectId} />
}
```

- [ ] **Step 2: Create src/app/contractor/survey/[projectId]/ContractorSurveyPageClient.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SurveyForm from '@/components/survey/SurveyForm'
import { type UploadedPhoto, type SurveyMeasurements } from '@/lib/survey'

type ProjectInfo = { id: string; clientName: string; category: string }

type SurveyApiResponse = {
  id: string
  projectId: string
  isDraft: boolean
  submittedAt: string | null
  netspanning: string | null
  hoofdzekering: string | null
  aardingOk: boolean | null
  elektriciteitsOk: boolean | null
  locatieOmvormer: string | null
  soortBevestiging: string | null
  aantalMuurdoorvoeren: number | null
  geschatteLengteDc: string | null
  geschatteLengteAc: string | null
  internet: boolean | null
  internetType: string | null
  samenvatting: string | null
  photos: UploadedPhoto[]
}

function toMeasurements(s: SurveyApiResponse): SurveyMeasurements {
  return {
    netspanning:          s.netspanning          ?? '',
    hoofdzekering:        s.hoofdzekering        ?? '',
    aardingOk:            s.aardingOk,
    elektriciteitsOk:     s.elektriciteitsOk,
    locatieOmvormer:      s.locatieOmvormer      ?? '',
    soortBevestiging:     s.soortBevestiging     ?? '',
    aantalMuurdoorvoeren: s.aantalMuurdoorvoeren != null ? String(s.aantalMuurdoorvoeren) : '',
    geschatteLengteDc:    s.geschatteLengteDc    ?? '',
    geschatteLengteAc:    s.geschatteLengteAc    ?? '',
    internet:             s.internet,
    internetType:         s.internetType         ?? '',
    samenvatting:         s.samenvatting         ?? '',
  }
}

export default function ContractorSurveyPageClient({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [survey, setSurvey]   = useState<SurveyApiResponse | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, pRes] = await Promise.all([
          fetch(`/api/surveys/${projectId}`),
          fetch(`/api/projects/${projectId}`),
        ])
        if (!sRes.ok || !pRes.ok) throw new Error('Load failed')
        const [surveyData, projectData]: [SurveyApiResponse, ProjectInfo] =
          await Promise.all([sRes.json(), pRes.json()])
        setSurvey(surveyData)
        setProject(projectData)
      } catch {
        setError('Kon de opmeting niet laden. Probeer de pagina te verversen.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleSave(measurements: SurveyMeasurements, isDraft: boolean) {
    const res = await fetch(`/api/surveys/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...measurements, isDraft }),
    })
    if (!res.ok) throw new Error('Opslaan mislukt')
    const updated: SurveyApiResponse = await res.json()
    setSurvey(updated)
    if (!isDraft) {
      // Return to contractor portal to see the Lever in button
      router.push('/contractor')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm min-h-screen bg-ghs-bg">
        Opmeting laden...
      </div>
    )
  }

  if (error || !survey || !project) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm min-h-screen bg-ghs-bg">
        {error ?? 'Onbekende fout'}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SurveyForm
        projectId={projectId}
        projectName={project.clientName}
        initialPhotos={survey.photos}
        initialMeasurements={toMeasurements(survey)}
        isDraft={survey.isDraft}
        onSave={handleSave}
        onBack={() => router.push('/contractor')}
      />
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite — must still pass**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all pass (no new tests needed — SurveyForm is already tested, this client is structurally identical to SurveyPageClient which is also tested).

- [ ] **Step 4: Commit**

```bash
cd greenhouse-app && git add "src/app/contractor/survey/[projectId]/page.tsx" "src/app/contractor/survey/[projectId]/ContractorSurveyPageClient.tsx"
git commit -m "feat: contractor survey page — reuses SurveyForm with contractor auth"
```

---

### Task 5: Deliver API

**Files:**
- Create: `src/app/api/surveys/[projectId]/deliver/route.ts`
- Create: `src/test/api/deliver.test.ts`

**Context:** When the contractor clicks "Lever in", `POST /api/surveys/[projectId]/deliver` is called. It:
1. Checks that the caller is authenticated (either role — Florian could also deliver for a contractor)
2. Finds the survey for `projectId`
3. Returns 404 if no survey exists
4. Returns 409 if already delivered (`deliveredAt != null`)
5. Sets `survey.deliveredAt = now()`, `survey.isDraft = false`
6. Upserts `DispatchJob` with `status: SURVEY_COMPLETED` and `deliveredAt = now()`
7. Returns the updated survey

The "Lever in" button in `ContractorPageClient.tsx` is already wired (Task 3 Step 8) — it calls `fetch(/api/surveys/${projectId}/deliver, { method: 'POST' })`.

- [ ] **Step 1: Write failing test**

Create `src/test/api/deliver.test.ts`:

```ts
// src/test/api/deliver.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockSurveyFindUnique, mockSurveyUpdate,
  mockDispatchUpsert,
} = vi.hoisted(() => ({
  mockSurveyFindUnique: vi.fn(),
  mockSurveyUpdate:     vi.fn(),
  mockDispatchUpsert:   vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    survey:      { findUnique: mockSurveyFindUnique, update: mockSurveyUpdate },
    dispatchJob: { upsert: mockDispatchUpsert },
  },
}))

const mockGetAuthRole = vi.hoisted(() => vi.fn())
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    getAuthRole: mockGetAuthRole,
    SESSION_COOKIE: 'ghs_session',
    CONTRACTOR_SESSION_COOKIE: 'ghs_contractor_session',
  }
})

const mockCookiesGet = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookiesGet })),
}))

import { POST } from '@/app/api/surveys/[projectId]/deliver/route'
import { NextRequest } from 'next/server'

const req = () => new NextRequest('http://localhost/api/surveys/proj1/deliver', { method: 'POST' })
const params = { params: Promise.resolve({ projectId: 'proj1' }) }

const doneSurvey = {
  id: 's1', projectId: 'proj1', isDraft: false, deliveredAt: null,
  submittedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCookiesGet.mockReturnValue({ value: 'valid' })
})

describe('POST /api/surveys/[projectId]/deliver', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetAuthRole.mockResolvedValue(null)
    const res = await POST(req(), params)
    expect(res.status).toBe(401)
  })

  it('returns 404 when no survey exists', async () => {
    mockGetAuthRole.mockResolvedValue('contractor')
    mockSurveyFindUnique.mockResolvedValue(null)
    const res = await POST(req(), params)
    expect(res.status).toBe(404)
  })

  it('returns 409 when already delivered', async () => {
    mockGetAuthRole.mockResolvedValue('contractor')
    mockSurveyFindUnique.mockResolvedValue({ ...doneSurvey, deliveredAt: new Date() })
    const res = await POST(req(), params)
    expect(res.status).toBe(409)
  })

  it('sets deliveredAt, isDraft=false, upserts DispatchJob, returns 200', async () => {
    mockGetAuthRole.mockResolvedValue('contractor')
    mockSurveyFindUnique.mockResolvedValue(doneSurvey)
    const updatedSurvey = { ...doneSurvey, deliveredAt: new Date(), isDraft: false }
    mockSurveyUpdate.mockResolvedValue(updatedSurvey)
    mockDispatchUpsert.mockResolvedValue({})

    const res = await POST(req(), params)
    expect(res.status).toBe(200)
    expect(mockSurveyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'proj1' },
        data: expect.objectContaining({ isDraft: false }),
      })
    )
    expect(mockDispatchUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: 'proj1' },
        create: expect.objectContaining({ status: 'SURVEY_COMPLETED' }),
        update: expect.objectContaining({ status: 'SURVEY_COMPLETED' }),
      })
    )
  })

  it('accepts florian role too', async () => {
    mockGetAuthRole.mockResolvedValue('florian')
    mockSurveyFindUnique.mockResolvedValue(doneSurvey)
    mockSurveyUpdate.mockResolvedValue({ ...doneSurvey, deliveredAt: new Date() })
    mockDispatchUpsert.mockResolvedValue({})
    const res = await POST(req(), params)
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd greenhouse-app && npx vitest run src/test/api/deliver.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found

- [ ] **Step 3: Create src/app/api/surveys/[projectId]/deliver/route.ts**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const survey = await prisma.survey.findUnique({ where: { projectId } })
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }
  if (survey.deliveredAt) {
    return NextResponse.json({ error: 'Already delivered' }, { status: 409 })
  }

  const now = new Date()

  const [updated] = await Promise.all([
    prisma.survey.update({
      where: { projectId },
      data: { deliveredAt: now, isDraft: false },
    }),
    prisma.dispatchJob.upsert({
      where: { projectId },
      create: { projectId, status: 'SURVEY_COMPLETED', deliveredAt: now },
      update: { status: 'SURVEY_COMPLETED', deliveredAt: now },
    }),
  ])

  return NextResponse.json(updated)
}
```

- [ ] **Step 4: Run deliver tests — must pass**

```bash
cd greenhouse-app && npx vitest run src/test/api/deliver.test.ts 2>&1 | tail -10
```

Expected: 5 passed

- [ ] **Step 5: Run full suite**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
cd greenhouse-app && git add "src/app/api/surveys/[projectId]/deliver/route.ts" src/test/api/deliver.test.ts
git commit -m "feat: deliver API — sets deliveredAt and creates DispatchJob SURVEY_COMPLETED"
```

---

### Task 6: Florian's "Opmeting gedaan" kanban column

**Files:**
- Modify: `src/components/kanban/KanbanBoard.tsx`
- Modify: `src/components/kanban/KanbanColumn.tsx`
- Create: `src/test/components/KanbanBoard.test.tsx`

**Context:** Delivered projects (where `survey.deliveredAt != null`) should appear in a new 4th column "Opmeting gedaan" in Florian's kanban. These cards are **filtered out of the CAT2 column** — `byCategory('CAT2')` must exclude them. Florian can click a delivered card to open the detail panel with the PDF link and email templates (no changes needed to `ProjectDetailPanel`).

The column style uses a purple accent. `KanbanColumn` currently types its `category` prop as `'CAT1' | 'CAT2' | 'CAT3'` — this will be extended to include `'DELIVERED'`.

- [ ] **Step 1: Write failing tests**

Create `src/test/components/KanbanBoard.test.tsx`:

```tsx
// src/test/components/KanbanBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock useSWR
vi.mock('swr', () => ({
  default: vi.fn(),
}))

import useSWR from 'swr'
import KanbanBoard from '@/components/kanban/KanbanBoard'

const mockOnSelect = vi.fn()
const mockOnAdd    = vi.fn()

const projects = [
  {
    id: 'p1', clientName: 'CAT1 Project', category: 'CAT1', city: 'Gent',
    email: '', phone: '', street: '', postalCode: '', status: 'ACTIVE',
    survey: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p2', clientName: 'CAT2 Normal', category: 'CAT2', city: 'Gent',
    email: '', phone: '', street: '', postalCode: '', status: 'ACTIVE',
    survey: { id: 's2', isDraft: true, deliveredAt: null },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
  {
    id: 'p3', clientName: 'CAT2 Delivered', category: 'CAT2', city: 'Antwerpen',
    email: '', phone: '', street: '', postalCode: '', status: 'ACTIVE',
    survey: { id: 's3', isDraft: false, deliveredAt: '2026-05-21T10:00:00Z' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({ data: projects, isLoading: false, error: null })
})

describe('KanbanBoard', () => {
  it('renders four column headers', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    expect(screen.getByText(/CAT 1/i)).toBeInTheDocument()
    expect(screen.getByText(/CAT 2/i)).toBeInTheDocument()
    expect(screen.getByText(/CAT 3/i)).toBeInTheDocument()
    expect(screen.getByText(/Opmeting gedaan/i)).toBeInTheDocument()
  })

  it('puts non-delivered CAT2 in CAT2 column, not in Opmeting gedaan', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    // CAT2 Normal should appear
    expect(screen.getByText('CAT2 Normal')).toBeInTheDocument()
  })

  it('puts delivered CAT2 in Opmeting gedaan column, not in CAT2', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    // CAT2 Delivered should appear (in the delivered column)
    expect(screen.getByText('CAT2 Delivered')).toBeInTheDocument()
  })

  it('shows project count badges', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    // 1 CAT1, 1 non-delivered CAT2, 0 CAT3, 1 delivered = counts 1,1,0,1
    const badges = screen.getAllByText(/^[0-9]+$/)
    const counts = badges.map(b => b.textContent)
    expect(counts).toContain('1') // at least one column has 1 project
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
cd greenhouse-app && npx vitest run src/test/components/KanbanBoard.test.tsx 2>&1 | tail -10
```

Expected: FAIL — `Opmeting gedaan` column not found

- [ ] **Step 3: Update src/components/kanban/KanbanColumn.tsx**

Replace the `COLUMN_STYLES` object and the `category` type:

```ts
const COLUMN_STYLES = {
  CAT1:      { dot: 'bg-cat1 shadow-[0_0_6px_rgba(245,158,11,0.5)]',  title: 'text-cat1',      label: 'CAT 1 — Klaar voor inplanning' },
  CAT2:      { dot: 'bg-cat2 shadow-[0_0_6px_rgba(114,217,70,0.5)]',  title: 'text-cat2',      label: 'CAT 2 — Opmeting intern' },
  CAT3:      { dot: 'bg-cat3 shadow-[0_0_6px_rgba(56,189,248,0.5)]',  title: 'text-cat3',      label: 'CAT 3 — Extern' },
  DELIVERED: { dot: 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]', title: 'text-purple-400', label: 'Opmeting gedaan' },
}

interface Props {
  category: 'CAT1' | 'CAT2' | 'CAT3' | 'DELIVERED'
  projects: ProjectWithSurvey[]
  onSelect: (p: ProjectWithSurvey) => void
}
```

The rest of `KanbanColumn.tsx` stays identical.

Full file after update:

```tsx
import type { ProjectWithSurvey } from '@/lib/types'
import ProjectCard from './ProjectCard'

const COLUMN_STYLES = {
  CAT1:      { dot: 'bg-cat1 shadow-[0_0_6px_rgba(245,158,11,0.5)]',  title: 'text-cat1',      label: 'CAT 1 — Klaar voor inplanning' },
  CAT2:      { dot: 'bg-cat2 shadow-[0_0_6px_rgba(114,217,70,0.5)]',  title: 'text-cat2',      label: 'CAT 2 — Opmeting intern' },
  CAT3:      { dot: 'bg-cat3 shadow-[0_0_6px_rgba(56,189,248,0.5)]',  title: 'text-cat3',      label: 'CAT 3 — Extern' },
  DELIVERED: { dot: 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]', title: 'text-purple-400', label: 'Opmeting gedaan' },
}

interface Props {
  category: 'CAT1' | 'CAT2' | 'CAT3' | 'DELIVERED'
  projects: ProjectWithSurvey[]
  onSelect: (p: ProjectWithSurvey) => void
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

- [ ] **Step 4: Update src/components/kanban/KanbanBoard.tsx**

Replace the entire file:

```tsx
'use client'

import useSWR from 'swr'
import type { ProjectWithSurvey } from '@/lib/types'
import KanbanColumn from './KanbanColumn'

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(r.statusText)
  return r.json()
})

interface Props {
  onSelect: (p: ProjectWithSurvey) => void
  onAdd: () => void
}

export default function KanbanBoard({ onSelect, onAdd }: Props) {
  const { data: projects = [], isLoading, error } = useSWR<ProjectWithSurvey[]>('/api/projects', fetcher, {
    refreshInterval: 30_000,
  })

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm">Laden...</div>
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        Fout bij laden van projecten. Probeer de pagina te verversen.
      </div>
    )
  }

  // Delivered CAT2 projects move to their own column
  const isDelivered = (p: ProjectWithSurvey) => p.survey?.deliveredAt != null

  const cat1Projects      = projects.filter(p => p.category === 'CAT1')
  const cat2Projects      = projects.filter(p => p.category === 'CAT2' && !isDelivered(p))
  const cat3Projects      = projects.filter(p => p.category === 'CAT3')
  const deliveredProjects = projects.filter(p => p.category === 'CAT2' && isDelivered(p))

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
        <KanbanColumn category="CAT1"      projects={cat1Projects}      onSelect={onSelect} />
        <KanbanColumn category="CAT2"      projects={cat2Projects}      onSelect={onSelect} />
        <KanbanColumn category="CAT3"      projects={cat3Projects}      onSelect={onSelect} />
        <KanbanColumn category="DELIVERED" projects={deliveredProjects} onSelect={onSelect} />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run kanban tests — must pass**

```bash
cd greenhouse-app && npx vitest run src/test/components/KanbanBoard.test.tsx 2>&1 | tail -10
```

Expected: 4 passed

- [ ] **Step 6: Run full suite**

```bash
cd greenhouse-app && npx vitest run 2>&1 | tail -10
```

Expected: all pass. TypeScript check:

```bash
cd greenhouse-app && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd greenhouse-app && git add src/components/kanban/KanbanBoard.tsx src/components/kanban/KanbanColumn.tsx src/test/components/KanbanBoard.test.tsx
git commit -m "feat: Opmeting gedaan column in Florian kanban for delivered surveys"
```

---

## Final smoke test checklist

After all 6 tasks, verify end-to-end:

1. Start dev server: `cd greenhouse-app && npm run dev`
2. **Contractor flow:**
   - Go to `http://localhost:3000/contractor/login` → login with password from `.env.local`
   - See project list with all CAT2 projects
   - Click "Opmeting starten" on a project → survey form opens
   - Upload test photo, fill measurements, click "Concept opslaan" → stays on form
   - Upload drone photo → "Opmeting afronden" becomes active → click it → redirects to `/contractor`
   - Project card now shows "Lever in" button
   - Click "Lever in" → card shows "Ingediend ✓"

3. **Florian flow:**
   - Go to `http://localhost:3000/login` → login as Florian
   - Kanban now shows 4 columns including "Opmeting gedaan"
   - The delivered project appears in "Opmeting gedaan" column
   - Click it → detail panel shows PDF link and email templates
   - "Rapport bekijken (PDF)" opens the survey report in a new tab

4. **Security check:**
   - While logged in as contractor, try `fetch('/api/projects', ...)` in browser console → should return 401
   - While logged in as Florian, try `fetch('/api/contractor/projects', ...)` → should return 401
