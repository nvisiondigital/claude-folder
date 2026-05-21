# Survey Form + PDF Generation — Plan 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared survey form (23 photo slots + measurement fields), photo upload API, PDF generation, and wire it into Florian's CAT2 kanban flow.

**Architecture:** A shared `SurveyForm` client component is used by both Florian (Plan 2) and contractors (Plan 3). Photos are stored on the local filesystem under `public/uploads/photos/[surveyId]/` in dev. The PDF is generated server-side using `@react-pdf/renderer` in a Node.js API route and served as a binary stream. Florian's CAT2 detail panel gains an "Opmeting starten" link and a "Rapport bekijken" PDF download after the survey is finalised.

**Tech Stack:** Next.js 16.2.6 App Router, Prisma 7 + SQLite, `@react-pdf/renderer` v4, Vitest + React Testing Library, Tailwind v4

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/survey.ts` | Create | Photo section/slot constants, `SurveyMeasurements` type, helpers |
| `src/lib/photos.ts` | Create | Local filesystem photo storage: save, delete, read |
| `src/lib/types.ts` | Modify | Add `ProjectWithSurvey`, `SurveyStub` types |
| `src/app/api/projects/route.ts` | Modify | Include survey state in `GET /api/projects` response |
| `src/app/api/surveys/[projectId]/route.ts` | Create | `GET` (fetch or auto-create draft) · `PUT` (save fields + finalise) |
| `src/app/api/surveys/[projectId]/photos/route.ts` | Create | `POST` upload photo file |
| `src/app/api/surveys/[projectId]/photos/[photoId]/route.ts` | Create | `DELETE` photo |
| `src/app/api/surveys/[projectId]/pdf/route.ts` | Create | `GET` generate + stream PDF |
| `src/app/app/survey/[projectId]/page.tsx` | Create | Server component — auth guard + render client |
| `src/app/app/survey/[projectId]/SurveyPageClient.tsx` | Create | Client component — fetch survey, render `SurveyForm` |
| `src/components/survey/PhotoSlot.tsx` | Create | Single photo slot: thumbnail grid + camera/add-more/delete |
| `src/components/survey/PhotoSection.tsx` | Create | Section wrapper with heading + list of `PhotoSlot` |
| `src/components/survey/MeasurementFields.tsx` | Create | All measurement inputs + bool toggles |
| `src/components/survey/SurveyForm.tsx` | Create | Full form: section nav, all slots, measurements, save bar |
| `src/components/pdf/SurveyPDF.tsx` | Create | `@react-pdf/renderer` document — GHS branded A4 |
| `src/components/kanban/KanbanBoard.tsx` | Modify | Use `ProjectWithSurvey[]` from SWR |
| `src/components/kanban/KanbanColumn.tsx` | Modify | Use `ProjectWithSurvey` prop type |
| `src/components/kanban/ProjectCard.tsx` | Modify | Use `ProjectWithSurvey` prop type |
| `src/components/kanban/ProjectDetailPanel.tsx` | Modify | Add survey action section for CAT2 |
| `src/app/app/kanban/page.tsx` | Modify | Use `ProjectWithSurvey` for `selected` state |
| `next.config.ts` | Modify | Add `transpilePackages: ['@react-pdf/renderer']` |
| `public/uploads/photos/.gitkeep` | Create | Ensure upload dir is tracked |
| `src/test/lib/survey.test.ts` | Create | Constants + helpers unit tests |
| `src/test/lib/photos.test.ts` | Create | Storage helper unit tests |
| `src/test/api/surveys.test.ts` | Create | Survey + photo API tests |
| `src/test/components/PhotoSlot.test.tsx` | Create | PhotoSlot rendering tests |
| `src/test/components/SurveyForm.test.tsx` | Create | SurveyForm rendering tests |
| `src/test/components/MeasurementFields.test.tsx` | Create | MeasurementFields tests |

---

## Task 1: Install packages + survey types + constants

**Files:**
- Create: `src/lib/survey.ts`
- Create: `src/test/lib/survey.test.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/lib/survey.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { PHOTO_SECTIONS, getSlotDef } from '@/lib/survey'

describe('PHOTO_SECTIONS', () => {
  it('has 4 sections', () => {
    expect(PHOTO_SECTIONS).toHaveLength(4)
  })

  it('has exactly 23 photo slots in total', () => {
    const total = PHOTO_SECTIONS.flatMap(s => s.slots).length
    expect(total).toBe(23)
  })

  it('has contiguous slot indices 1–23', () => {
    const indices = PHOTO_SECTIONS.flatMap(s => s.slots).map(s => s.index)
    expect(indices).toEqual([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23])
  })
})

describe('getSlotDef', () => {
  it('returns correct slot for index 1', () => {
    const slot = getSlotDef(1)
    expect(slot?.name).toBe('Parkeergelegenheid')
  })

  it('returns null for out-of-range indices', () => {
    expect(getSlotDef(0)).toBeNull()
    expect(getSlotDef(24)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd greenhouse-app && npm test -- src/test/lib/survey.test.ts`
Expected: FAIL — `Cannot find module '@/lib/survey'`

- [ ] **Step 3: Install packages**

```bash
cd greenhouse-app && npm install @react-pdf/renderer
```

- [ ] **Step 4: Update next.config.ts**

```ts
// greenhouse-app/next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@react-pdf/renderer'],
}

export default nextConfig
```

- [ ] **Step 5: Create src/lib/survey.ts**

```ts
// src/lib/survey.ts

export type PhotoSlotDef = {
  index: number
  name: string
}

export type PhotoSectionDef = {
  key: string
  label: string
  slots: PhotoSlotDef[]
}

export const PHOTO_SECTIONS: PhotoSectionDef[] = [
  {
    key: 'elektro',
    label: 'Elektrisch',
    slots: [
      { index: 1,  name: 'Parkeergelegenheid' },
      { index: 2,  name: 'Digitale meter / teller' },
      { index: 3,  name: 'Stroomsterkte / hoofdschakelaar' },
      { index: 4,  name: "Omgevingsfoto's elektrische installatie" },
      { index: 5,  name: 'Zekeringskast gesloten' },
      { index: 6,  name: 'Zekeringskast geopend' },
      { index: 7,  name: 'Hoofd en gevoelige differentieel' },
      { index: 8,  name: 'Aardingsonderbreker' },
      { index: 9,  name: 'Aardingsmeting' },
      { index: 10, name: 'Aardingsmeting opstelling (in & out)' },
      { index: 11, name: 'Keuringsverslag (indien aanwezig)' },
    ],
  },
  {
    key: 'bestaand',
    label: 'Indien van toepassing',
    slots: [
      { index: 12, name: 'Bestaande omvormer' },
      { index: 13, name: 'Aantal strings omvormer (onderkant)' },
      { index: 14, name: 'Technische data omvormer (zijkant)' },
      { index: 15, name: 'Extra relevante zekeringskasten' },
    ],
  },
  {
    key: 'installatie',
    label: 'Te plaatsen installatie',
    slots: [
      { index: 16, name: 'Modem / router (UTP-poorten zichtbaar)' },
      { index: 17, name: 'Locatie omvormer / batterij' },
      { index: 18, name: 'Locaties kabeltraject (meerdere mogelijk)' },
    ],
  },
  {
    key: 'drone',
    label: 'Daksituatie (drone)',
    slots: [
      { index: 19, name: "Foto's dakvlakken" },
      { index: 20, name: "Omgevingsfoto's" },
      { index: 21, name: 'Nok en dakgoot' },
      { index: 22, name: 'Dakpan close-up' },
      { index: 23, name: "Extra foto's" },
    ],
  },
]

export function getSlotDef(index: number): PhotoSlotDef | null {
  for (const section of PHOTO_SECTIONS) {
    const slot = section.slots.find(s => s.index === index)
    if (slot) return slot
  }
  return null
}

export type SurveyMeasurements = {
  netspanning: string
  hoofdzekering: string
  aardingOk: boolean | null
  elektriciteitsOk: boolean | null
  locatieOmvormer: string
  soortBevestiging: string
  aantalMuurdoorvoeren: string
  geschatteLengteDc: string
  geschatteLengteAc: string
  internet: boolean | null
  internetType: string
  samenvatting: string
}

export const EMPTY_MEASUREMENTS: SurveyMeasurements = {
  netspanning: '',
  hoofdzekering: '',
  aardingOk: null,
  elektriciteitsOk: null,
  locatieOmvormer: '',
  soortBevestiging: '',
  aantalMuurdoorvoeren: '',
  geschatteLengteDc: '',
  geschatteLengteAc: '',
  internet: null,
  internetType: '',
  samenvatting: '',
}

export type UploadedPhoto = {
  id: string
  slotIndex: number
  slotName: string
  fileUrl: string
  order: number
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd greenhouse-app && npm test -- src/test/lib/survey.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
cd greenhouse-app && git add src/lib/survey.ts src/test/lib/survey.test.ts next.config.ts
git commit -m "feat: survey slot constants, types, next.config transpile"
```

---

## Task 2: Local photo storage helper

**Files:**
- Create: `src/lib/photos.ts`
- Create: `src/test/lib/photos.test.ts`
- Create: `public/uploads/photos/.gitkeep`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/lib/photos.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMkdirSync  = vi.fn()
const mockWriteFileSync = vi.fn()
const mockExistsSync = vi.fn()
const mockUnlinkSync = vi.fn()
const mockReadFileSync = vi.fn()

vi.mock('fs', () => ({
  default: {
    mkdirSync:     mockMkdirSync,
    writeFileSync: mockWriteFileSync,
    existsSync:    mockExistsSync,
    unlinkSync:    mockUnlinkSync,
    readFileSync:  mockReadFileSync,
  },
  mkdirSync:     mockMkdirSync,
  writeFileSync: mockWriteFileSync,
  existsSync:    mockExistsSync,
  unlinkSync:    mockUnlinkSync,
  readFileSync:  mockReadFileSync,
}))

import { savePhoto, deletePhoto, getPhotoBuffer } from '@/lib/photos'

beforeEach(() => {
  vi.clearAllMocks()
  mockExistsSync.mockReturnValue(true)
  mockReadFileSync.mockReturnValue(Buffer.from('img-data'))
})

describe('savePhoto', () => {
  it('saves file and returns URL under /uploads/photos/[surveyId]/', async () => {
    const file = new File(['img'], 'test.jpg', { type: 'image/jpeg' })
    const url = await savePhoto('survey-abc', file)
    expect(url).toMatch(/^\/uploads\/photos\/survey-abc\//)
    expect(url).toMatch(/\.jpg$/)
    expect(mockWriteFileSync).toHaveBeenCalledOnce()
  })

  it('creates the survey subdirectory', async () => {
    const file = new File(['img'], 'test.png', { type: 'image/png' })
    await savePhoto('survey-abc', file)
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('survey-abc'),
      { recursive: true }
    )
  })
})

describe('deletePhoto', () => {
  it('unlinks file when it exists', () => {
    mockExistsSync.mockReturnValue(true)
    deletePhoto('/uploads/photos/survey-abc/x.jpg')
    expect(mockUnlinkSync).toHaveBeenCalledOnce()
  })

  it('does not throw when file does not exist', () => {
    mockExistsSync.mockReturnValue(false)
    expect(() => deletePhoto('/uploads/photos/survey-abc/x.jpg')).not.toThrow()
    expect(mockUnlinkSync).not.toHaveBeenCalled()
  })
})

describe('getPhotoBuffer', () => {
  it('returns buffer from public path', () => {
    const buf = getPhotoBuffer('/uploads/photos/survey-abc/x.jpg')
    expect(Buffer.isBuffer(buf)).toBe(true)
    expect(mockReadFileSync).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd greenhouse-app && npm test -- src/test/lib/photos.test.ts`
Expected: FAIL — `Cannot find module '@/lib/photos'`

- [ ] **Step 3: Create src/lib/photos.ts**

```ts
// src/lib/photos.ts
import fs from 'fs'
import path from 'path'

const UPLOAD_ROOT = path.join(process.cwd(), 'public', 'uploads', 'photos')

export async function savePhoto(surveyId: string, file: File): Promise<string> {
  const dir = path.join(UPLOAD_ROOT, surveyId)
  fs.mkdirSync(dir, { recursive: true })

  const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const filepath = path.join(dir, filename)

  const buffer = Buffer.from(await file.arrayBuffer())
  fs.writeFileSync(filepath, buffer)

  return `/uploads/photos/${surveyId}/${filename}`
}

export function deletePhoto(url: string): void {
  const rel = url.startsWith('/') ? url.slice(1) : url
  const filepath = path.join(process.cwd(), 'public', rel)
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath)
  }
}

export function getPhotoBuffer(url: string): Buffer {
  const rel = url.startsWith('/') ? url.slice(1) : url
  const filepath = path.join(process.cwd(), 'public', rel)
  return fs.readFileSync(filepath)
}
```

- [ ] **Step 4: Create public/uploads/photos/.gitkeep**

```bash
mkdir -p greenhouse-app/public/uploads/photos && touch greenhouse-app/public/uploads/photos/.gitkeep
```

Add to `.gitignore` (open `greenhouse-app/.gitignore` and append):
```
# Photo uploads (dev only)
/public/uploads/photos/*
!/public/uploads/photos/.gitkeep
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd greenhouse-app && npm test -- src/test/lib/photos.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
cd greenhouse-app && git add src/lib/photos.ts src/test/lib/photos.test.ts public/uploads/photos/.gitkeep .gitignore
git commit -m "feat: local photo storage helper + upload directory"
```

---

## Task 3: Survey CRUD API (GET + PUT)

**Files:**
- Create: `src/app/api/surveys/[projectId]/route.ts`
- Create: `src/test/api/surveys.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/test/api/surveys.test.ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockSurveyFindUnique, mockSurveyCreate, mockSurveyUpdate,
  mockProjectFindUnique, mockPhotoCount, mockPhotoCreate, mockPhotoDelete,
} = vi.hoisted(() => ({
  mockSurveyFindUnique: vi.fn(),
  mockSurveyCreate:     vi.fn(),
  mockSurveyUpdate:     vi.fn(),
  mockProjectFindUnique: vi.fn(),
  mockPhotoCount:       vi.fn(),
  mockPhotoCreate:      vi.fn(),
  mockPhotoDelete:      vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    survey:  { findUnique: mockSurveyFindUnique, create: mockSurveyCreate, update: mockSurveyUpdate },
    project: { findUnique: mockProjectFindUnique },
    photo:   { count: mockPhotoCount, create: mockPhotoCreate, delete: mockPhotoDelete },
  },
}))

const mockVerifyToken = vi.hoisted(() => vi.fn().mockResolvedValue({ role: 'florian' }))
vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return { ...actual, verifyToken: mockVerifyToken, SESSION_COOKIE: 'ghs_session' }
})

const mockCookiesGet = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookiesGet })),
}))

vi.mock('@/lib/photos', () => ({
  savePhoto:  vi.fn().mockResolvedValue('/uploads/photos/s1/photo.jpg'),
  deletePhoto: vi.fn(),
}))

import { GET, PUT } from '@/app/api/surveys/[projectId]/route'
import { NextRequest } from 'next/server'

function req(method: string, body?: object) {
  return new NextRequest('http://localhost/api/surveys/proj1', {
    method,
    headers: { 'Content-Type': 'application/json', cookie: 'ghs_session=valid' },
    body: body ? JSON.stringify(body) : undefined,
  })
}
const params = { params: Promise.resolve({ projectId: 'proj1' }) }

const sampleSurvey = {
  id: 'survey1', projectId: 'proj1', isDraft: true,
  submittedAt: null, deliveredAt: null, createdAt: new Date(), updatedAt: new Date(),
  netspanning: null, hoofdzekering: null, aardingOk: null, elektriciteitsOk: null,
  locatieOmvormer: null, soortBevestiging: null, aantalMuurdoorvoeren: null,
  geschatteLengteDc: null, geschatteLengteAc: null, internet: null, internetType: null,
  samenvatting: null, photos: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCookiesGet.mockImplementation((name: string) =>
    name === 'ghs_session' ? { value: 'valid' } : undefined
  )
})

describe('GET /api/surveys/[projectId]', () => {
  it('returns existing survey with photos', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)
    const res = await GET(req('GET'), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('survey1')
    expect(data.isDraft).toBe(true)
  })

  it('creates draft survey when none exists', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(null)
    mockProjectFindUnique.mockResolvedValueOnce({ id: 'proj1' })
    mockSurveyCreate.mockResolvedValueOnce({ ...sampleSurvey, id: 'new-s' })
    const res = await GET(req('GET'), params)
    expect(res.status).toBe(200)
    expect(mockSurveyCreate).toHaveBeenCalled()
    const data = await res.json()
    expect(data.id).toBe('new-s')
  })

  it('returns 404 when project does not exist', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(null)
    mockProjectFindUnique.mockResolvedValueOnce(null)
    const res = await GET(req('GET'), params)
    expect(res.status).toBe(404)
  })

  it('returns 401 when unauthenticated', async () => {
    mockCookiesGet.mockImplementation(() => undefined)
    const res = await GET(req('GET'), params)
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/surveys/[projectId]', () => {
  it('updates measurement fields', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)
    mockSurveyUpdate.mockResolvedValueOnce({ ...sampleSurvey, netspanning: '230V' })
    const res = await PUT(req('PUT', { netspanning: '230V' }), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.netspanning).toBe('230V')
  })

  it('sets submittedAt when isDraft transitions to false', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)
    mockSurveyUpdate.mockResolvedValueOnce({ ...sampleSurvey, isDraft: false, submittedAt: new Date() })
    const res = await PUT(req('PUT', { isDraft: false }), params)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.isDraft).toBe(false)
  })

  it('returns 404 when survey not found', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(null)
    const res = await PUT(req('PUT', { netspanning: '230V' }), params)
    expect(res.status).toBe(404)
  })

  it('returns 401 when unauthenticated', async () => {
    mockCookiesGet.mockImplementation(() => undefined)
    const res = await PUT(req('PUT', {}), params)
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd greenhouse-app && npm test -- src/test/api/surveys.test.ts`
Expected: FAIL — `Cannot find module '@/app/api/surveys/[projectId]/route'`

- [ ] **Step 3: Create src/app/api/surveys/[projectId]/route.ts**

```ts
// src/app/api/surveys/[projectId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

type Params = { params: Promise<{ projectId: string }> }

async function getAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await getAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  let survey = await prisma.survey.findUnique({
    where: { projectId },
    include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
  })

  if (!survey) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    survey = await prisma.survey.create({
      data: { projectId, isDraft: true },
      include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
    })
  }

  return NextResponse.json(survey)
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await getAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const existing = await prisma.survey.findUnique({ where: { projectId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (body.netspanning !== undefined)          data.netspanning          = body.netspanning ?? null
  if (body.hoofdzekering !== undefined)        data.hoofdzekering        = body.hoofdzekering ?? null
  if (body.aardingOk !== undefined)            data.aardingOk            = body.aardingOk ?? null
  if (body.elektriciteitsOk !== undefined)     data.elektriciteitsOk     = body.elektriciteitsOk ?? null
  if (body.locatieOmvormer !== undefined)      data.locatieOmvormer      = body.locatieOmvormer ?? null
  if (body.soortBevestiging !== undefined)     data.soortBevestiging     = body.soortBevestiging ?? null
  if (body.aantalMuurdoorvoeren !== undefined) {
    const n = body.aantalMuurdoorvoeren
    data.aantalMuurdoorvoeren = (typeof n === 'string' && n !== '')
      ? parseInt(n, 10)
      : (typeof n === 'number' ? n : null)
  }
  if (body.geschatteLengteDc !== undefined)    data.geschatteLengteDc    = body.geschatteLengteDc ?? null
  if (body.geschatteLengteAc !== undefined)    data.geschatteLengteAc    = body.geschatteLengteAc ?? null
  if (body.internet !== undefined)             data.internet             = body.internet ?? null
  if (body.internetType !== undefined)         data.internetType         = body.internetType ?? null
  if (body.samenvatting !== undefined)         data.samenvatting         = body.samenvatting ?? null
  if (body.isDraft !== undefined)              data.isDraft              = body.isDraft

  if (body.isDraft === false && existing.isDraft === true) {
    data.submittedAt = new Date()
  }

  const survey = await prisma.survey.update({
    where: { projectId },
    data,
    include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
  })

  return NextResponse.json(survey)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd greenhouse-app && npm test -- src/test/api/surveys.test.ts`
Expected: PASS (8 tests passing for GET/PUT suite — photo tests not added yet)

- [ ] **Step 5: Commit**

```bash
cd greenhouse-app && git add src/app/api/surveys src/test/api/surveys.test.ts
git commit -m "feat: survey CRUD API (GET auto-creates draft, PUT saves fields)"
```

---

## Task 4: Photo upload + delete API

**Files:**
- Create: `src/app/api/surveys/[projectId]/photos/route.ts`
- Create: `src/app/api/surveys/[projectId]/photos/[photoId]/route.ts`
- Modify: `src/test/api/surveys.test.ts` (add photo tests)

- [ ] **Step 1: Add photo tests to surveys.test.ts**

Append these describes after the existing PUT tests in `src/test/api/surveys.test.ts`:

```ts
import { POST as POST_PHOTO } from '@/app/api/surveys/[projectId]/photos/route'
import { DELETE as DELETE_PHOTO } from '@/app/api/surveys/[projectId]/photos/[photoId]/route'
import { Prisma } from '@prisma/client'

const photoParams = { params: Promise.resolve({ projectId: 'proj1' }) }
const photoIdParams = { params: Promise.resolve({ projectId: 'proj1', photoId: 'photo1' }) }

const samplePhoto = {
  id: 'photo1', surveyId: 'survey1', slotIndex: 1,
  slotName: 'Parkeergelegenheid', fileUrl: '/uploads/photos/s1/photo.jpg', order: 0,
}

describe('POST /api/surveys/[projectId]/photos', () => {
  it('uploads photo and returns 201', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)
    mockPhotoCount.mockResolvedValueOnce(0)
    mockPhotoCreate.mockResolvedValueOnce(samplePhoto)

    const formData = new FormData()
    formData.append('file', new File(['img'], 'photo.jpg', { type: 'image/jpeg' }))
    formData.append('slotIndex', '1')

    const postReq = new NextRequest('http://localhost/api/surveys/proj1/photos', {
      method: 'POST',
      headers: { cookie: 'ghs_session=valid' },
      body: formData,
    })
    const res = await POST_PHOTO(postReq, photoParams)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.slotIndex).toBe(1)
    expect(data.slotName).toBe('Parkeergelegenheid')
  })

  it('returns 400 for invalid slotIndex', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)

    const formData = new FormData()
    formData.append('file', new File(['img'], 'photo.jpg', { type: 'image/jpeg' }))
    formData.append('slotIndex', '99')

    const postReq = new NextRequest('http://localhost/api/surveys/proj1/photos', {
      method: 'POST',
      headers: { cookie: 'ghs_session=valid' },
      body: formData,
    })
    const res = await POST_PHOTO(postReq, photoParams)
    expect(res.status).toBe(400)
  })

  it('returns 404 when survey not found', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(null)

    const formData = new FormData()
    formData.append('file', new File(['img'], 'photo.jpg', { type: 'image/jpeg' }))
    formData.append('slotIndex', '1')

    const postReq = new NextRequest('http://localhost/api/surveys/proj1/photos', {
      method: 'POST',
      headers: { cookie: 'ghs_session=valid' },
      body: formData,
    })
    const res = await POST_PHOTO(postReq, photoParams)
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/surveys/[projectId]/photos/[photoId]', () => {
  it('deletes photo and returns ok', async () => {
    mockPhotoDelete.mockResolvedValueOnce(samplePhoto)

    const delReq = new NextRequest('http://localhost/api/surveys/proj1/photos/photo1', {
      method: 'DELETE',
      headers: { cookie: 'ghs_session=valid' },
    })
    const res = await DELETE_PHOTO(delReq, photoIdParams)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('returns 404 when photo not found', async () => {
    mockPhotoDelete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '0' })
    )

    const delReq = new NextRequest('http://localhost/api/surveys/proj1/photos/nonexistent', {
      method: 'DELETE',
      headers: { cookie: 'ghs_session=valid' },
    })
    const res = await DELETE_PHOTO(delReq, { params: Promise.resolve({ projectId: 'proj1', photoId: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify new tests fail**

Run: `cd greenhouse-app && npm test -- src/test/api/surveys.test.ts`
Expected: Photo tests FAIL — missing modules

- [ ] **Step 3: Create src/app/api/surveys/[projectId]/photos/route.ts**

```ts
// src/app/api/surveys/[projectId]/photos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { savePhoto } from '@/lib/photos'
import { getSlotDef } from '@/lib/survey'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const survey = await prisma.survey.findUnique({ where: { projectId } })
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const slotIndexStr = formData.get('slotIndex') as string | null

  if (!file || !slotIndexStr) {
    return NextResponse.json({ error: 'Missing file or slotIndex' }, { status: 400 })
  }

  const slotIndex = parseInt(slotIndexStr, 10)
  const slotDef = getSlotDef(slotIndex)
  if (!slotDef) {
    return NextResponse.json({ error: 'Invalid slotIndex' }, { status: 400 })
  }

  const existingCount = await prisma.photo.count({
    where: { surveyId: survey.id, slotIndex },
  })

  const fileUrl = await savePhoto(survey.id, file)

  const photo = await prisma.photo.create({
    data: {
      surveyId:  survey.id,
      slotIndex,
      slotName:  slotDef.name,
      fileUrl,
      order:     existingCount,
    },
  })

  return NextResponse.json(photo, { status: 201 })
}
```

- [ ] **Step 4: Create src/app/api/surveys/[projectId]/photos/[photoId]/route.ts**

```ts
// src/app/api/surveys/[projectId]/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { deletePhoto } from '@/lib/photos'
import { Prisma } from '@prisma/client'

type Params = { params: Promise<{ projectId: string; photoId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { photoId } = await params

  try {
    const photo = await prisma.photo.delete({ where: { id: photoId } })
    deletePhoto(photo.fileUrl)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}
```

- [ ] **Step 5: Run all survey tests to verify they pass**

Run: `cd greenhouse-app && npm test -- src/test/api/surveys.test.ts`
Expected: PASS (all tests including the new photo tests)

- [ ] **Step 6: Commit**

```bash
cd greenhouse-app && git add src/app/api/surveys
git commit -m "feat: photo upload (POST) and delete (DELETE) API endpoints"
```

---

## Task 5: PhotoSlot component

**Files:**
- Create: `src/components/survey/PhotoSlot.tsx`
- Create: `src/test/components/PhotoSlot.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/components/PhotoSlot.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PhotoSlot from '@/components/survey/PhotoSlot'
import type { UploadedPhoto } from '@/lib/survey'

const base = {
  slotIndex: 1,
  slotName: 'Parkeergelegenheid',
  photos: [] as UploadedPhoto[],
  uploading: false,
  onUpload: vi.fn(),
  onDelete: vi.fn(),
}

describe('PhotoSlot', () => {
  it('renders padded slot number and name', () => {
    render(<PhotoSlot {...base} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('Parkeergelegenheid')).toBeInTheDocument()
  })

  it('shows camera button', () => {
    render(<PhotoSlot {...base} />)
    expect(screen.getByLabelText('Foto toevoegen voor Parkeergelegenheid')).toBeInTheDocument()
  })

  it('shows add-more button only when photos already exist', () => {
    const withPhoto: UploadedPhoto[] = [
      { id: 'p1', slotIndex: 1, slotName: 'Parkeergelegenheid', fileUrl: '/test.jpg', order: 0 },
    ]
    const { rerender } = render(<PhotoSlot {...base} />)
    expect(screen.queryByLabelText('Nog een foto toevoegen voor Parkeergelegenheid')).not.toBeInTheDocument()

    rerender(<PhotoSlot {...base} photos={withPhoto} />)
    expect(screen.getByLabelText('Nog een foto toevoegen voor Parkeergelegenheid')).toBeInTheDocument()
  })

  it('renders one delete button per photo', () => {
    const photos: UploadedPhoto[] = [
      { id: 'p1', slotIndex: 1, slotName: 'Parkeergelegenheid', fileUrl: '/a.jpg', order: 0 },
      { id: 'p2', slotIndex: 1, slotName: 'Parkeergelegenheid', fileUrl: '/b.jpg', order: 1 },
    ]
    render(<PhotoSlot {...base} photos={photos} />)
    expect(screen.getAllByLabelText('Foto verwijderen')).toHaveLength(2)
  })

  it('disables buttons while uploading', () => {
    render(<PhotoSlot {...base} uploading={true} />)
    expect(screen.getByLabelText('Foto toevoegen voor Parkeergelegenheid')).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd greenhouse-app && npm test -- src/test/components/PhotoSlot.test.tsx`
Expected: FAIL — `Cannot find module '@/components/survey/PhotoSlot'`

- [ ] **Step 3: Create src/components/survey/PhotoSlot.tsx**

```tsx
// src/components/survey/PhotoSlot.tsx
'use client'

import { useRef } from 'react'
import type { UploadedPhoto } from '@/lib/survey'

interface Props {
  slotIndex: number
  slotName: string
  photos: UploadedPhoto[]
  uploading: boolean
  onUpload: (slotIndex: number, file: File) => Promise<void>
  onDelete: (photoId: string) => Promise<void>
}

export default function PhotoSlot({ slotIndex, slotName, photos, uploading, onUpload, onDelete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const padded = String(slotIndex).padStart(2, '0')

  function triggerUpload() {
    inputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    await onUpload(slotIndex, file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-ghs-green/60 shrink-0">{padded}</span>
        <span className="text-[12px] text-ghs-text leading-tight">{slotName}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {photos.length > 0 && (
            <button
              type="button"
              onClick={triggerUpload}
              disabled={uploading}
              aria-label={`Nog een foto toevoegen voor ${slotName}`}
              className="w-7 h-7 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/40 text-xs transition-colors disabled:opacity-40"
            >
              +
            </button>
          )}
          <button
            type="button"
            onClick={triggerUpload}
            disabled={uploading}
            aria-label={`Foto toevoegen voor ${slotName}`}
            className="w-7 h-7 flex items-center justify-center bg-white/[0.05] hover:bg-white/10 rounded-lg text-white/40 text-xs transition-colors disabled:opacity-40"
          >
            {uploading ? '…' : '📷'}
          </button>
        </div>
      </div>

      {/* Thumbnails */}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.fileUrl}
                alt={`${slotName} ${padded}${photos.length > 1 ? String.fromCharCode(97 + i) : ''}`}
                className="w-20 h-16 object-cover rounded-lg border border-white/[0.08]"
              />
              <button
                type="button"
                onClick={() => onDelete(photo.id)}
                aria-label="Foto verwijderen"
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 hover:bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-label={`Bestandsinvoer voor ${slotName}`}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd greenhouse-app && npm test -- src/test/components/PhotoSlot.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd greenhouse-app && git add src/components/survey/PhotoSlot.tsx src/test/components/PhotoSlot.test.tsx
git commit -m "feat: PhotoSlot component with upload, add-more, delete, thumbnail"
```

---

## Task 6: PhotoSection + MeasurementFields

**Files:**
- Create: `src/components/survey/PhotoSection.tsx`
- Create: `src/components/survey/MeasurementFields.tsx`
- Create: `src/test/components/MeasurementFields.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/components/MeasurementFields.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MeasurementFields from '@/components/survey/MeasurementFields'
import { EMPTY_MEASUREMENTS } from '@/lib/survey'

describe('MeasurementFields', () => {
  it('renders all section labels', () => {
    render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={vi.fn()} />)
    expect(screen.getByText('Netspanning')).toBeInTheDocument()
    expect(screen.getByText('Hoofdzekering')).toBeInTheDocument()
    expect(screen.getByText('Aarding ok?')).toBeInTheDocument()
    expect(screen.getByText('Elektriciteit ok?')).toBeInTheDocument()
    expect(screen.getByText('Samenvatting opmeting')).toBeInTheDocument()
  })

  it('calls onChange with updated netspanning', () => {
    const onChange = vi.fn()
    render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={onChange} />)
    // First textbox is Netspanning
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '230V' } })
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0][0].netspanning).toBe('230V')
  })

  it('shows internet type field only when internet is true', () => {
    const { rerender } = render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={vi.fn()} />)
    expect(screen.queryByText('Type internet')).not.toBeInTheDocument()

    rerender(<MeasurementFields values={{ ...EMPTY_MEASUREMENTS, internet: true }} onChange={vi.fn()} />)
    expect(screen.getByText('Type internet')).toBeInTheDocument()
  })

  it('calls onChange with correct bool when Ja is clicked for aardingOk', () => {
    const onChange = vi.fn()
    render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={onChange} />)
    // First "Ja" button is for aardingOk
    const jaBtns = screen.getAllByText('Ja')
    fireEvent.click(jaBtns[0])
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0][0].aardingOk).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd greenhouse-app && npm test -- src/test/components/MeasurementFields.test.tsx`
Expected: FAIL — `Cannot find module '@/components/survey/MeasurementFields'`

- [ ] **Step 3: Create src/components/survey/PhotoSection.tsx**

```tsx
// src/components/survey/PhotoSection.tsx
'use client'

import type { PhotoSectionDef, UploadedPhoto } from '@/lib/survey'
import PhotoSlot from './PhotoSlot'

interface Props {
  section: PhotoSectionDef
  photosBySlot: Record<number, UploadedPhoto[]>
  uploadingSlot: number | null
  onUpload: (slotIndex: number, file: File) => Promise<void>
  onDelete: (photoId: string) => Promise<void>
}

export default function PhotoSection({ section, photosBySlot, uploadingSlot, onUpload, onDelete }: Props) {
  return (
    <div id={`section-${section.key}`} className="scroll-mt-4">
      <h3 className="text-[10px] uppercase tracking-widest text-white/25 mb-3 pt-2">{section.label}</h3>
      <div className="flex flex-col gap-2.5">
        {section.slots.map(slot => (
          <PhotoSlot
            key={slot.index}
            slotIndex={slot.index}
            slotName={slot.name}
            photos={photosBySlot[slot.index] ?? []}
            uploading={uploadingSlot === slot.index}
            onUpload={onUpload}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create src/components/survey/MeasurementFields.tsx**

```tsx
// src/components/survey/MeasurementFields.tsx
'use client'

import type { SurveyMeasurements } from '@/lib/survey'

interface Props {
  values: SurveyMeasurements
  onChange: (next: SurveyMeasurements) => void
}

function TextInput({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-ghs-text outline-none focus:border-ghs-green/40 transition-colors"
      />
    </div>
  )
}

function BoolToggle({
  label, value, onChange,
}: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-white/40 mb-1">{label}</label>
      <div className="flex gap-1.5">
        {([true, false, null] as const).map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${
              value === v
                ? v === true
                  ? 'bg-ghs-green/10 border-ghs-green/40 text-ghs-green'
                  : v === false
                    ? 'bg-red-500/10 border-red-500/40 text-red-400'
                    : 'bg-white/[0.07] border-white/20 text-white/50'
                : 'bg-white/[0.03] border-white/[0.07] text-white/30 hover:border-white/15'
            }`}
          >
            {v === true ? 'Ja' : v === false ? 'Nee' : '—'}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function MeasurementFields({ values, onChange }: Props) {
  function set<K extends keyof SurveyMeasurements>(key: K, value: SurveyMeasurements[K]) {
    onChange({ ...values, [key]: value })
  }

  return (
    <div id="section-measurements">
      <h3 className="text-[10px] uppercase tracking-widest text-white/25 mb-3 pt-2">
        Metingen &amp; notities
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <TextInput label="Netspanning"          value={values.netspanning}          onChange={v => set('netspanning', v)} />
        <TextInput label="Hoofdzekering"        value={values.hoofdzekering}        onChange={v => set('hoofdzekering', v)} />
        <TextInput label="Geschatte lengte DC"  value={values.geschatteLengteDc}   onChange={v => set('geschatteLengteDc', v)} />
        <TextInput label="Geschatte lengte AC"  value={values.geschatteLengteAc}   onChange={v => set('geschatteLengteAc', v)} />
        <TextInput label="Locatie omvormer"     value={values.locatieOmvormer}      onChange={v => set('locatieOmvormer', v)} />
        <TextInput label="Soort bevestiging"    value={values.soortBevestiging}     onChange={v => set('soortBevestiging', v)} />
        <TextInput label="Aantal muurdoorvoeren" value={values.aantalMuurdoorvoeren} onChange={v => set('aantalMuurdoorvoeren', v)} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <BoolToggle label="Aarding ok?"         value={values.aardingOk}        onChange={v => set('aardingOk', v)} />
        <BoolToggle label="Elektriciteit ok?"   value={values.elektriciteitsOk} onChange={v => set('elektriciteitsOk', v)} />
      </div>
      <div className="mt-3">
        <BoolToggle label="Internet beschikbaar?" value={values.internet} onChange={v => set('internet', v)} />
        {values.internet === true && (
          <div className="mt-2">
            <TextInput label="Type internet" value={values.internetType} onChange={v => set('internetType', v)} />
          </div>
        )}
      </div>
      <div className="mt-3">
        <label className="block text-[10px] text-white/40 mb-1">Samenvatting opmeting</label>
        <textarea
          value={values.samenvatting}
          onChange={e => set('samenvatting', e.target.value)}
          rows={4}
          className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-[12px] text-ghs-text outline-none focus:border-ghs-green/40 transition-colors resize-none"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd greenhouse-app && npm test -- src/test/components/MeasurementFields.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
cd greenhouse-app && git add src/components/survey/PhotoSection.tsx src/components/survey/MeasurementFields.tsx src/test/components/MeasurementFields.test.tsx
git commit -m "feat: PhotoSection wrapper and MeasurementFields form"
```

---

## Task 7: SurveyForm (main assembly)

**Files:**
- Create: `src/components/survey/SurveyForm.tsx`
- Create: `src/test/components/SurveyForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/test/components/SurveyForm.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SurveyForm from '@/components/survey/SurveyForm'
import { EMPTY_MEASUREMENTS } from '@/lib/survey'
import type { UploadedPhoto } from '@/lib/survey'

const base = {
  projectId: 'proj1',
  projectName: 'Test Klant',
  initialPhotos: [] as UploadedPhoto[],
  initialMeasurements: EMPTY_MEASUREMENTS,
  isDraft: true,
  onSave: vi.fn(),
  onBack: vi.fn(),
}

describe('SurveyForm', () => {
  it('renders all 4 section headings in section nav', () => {
    render(<SurveyForm {...base} />)
    expect(screen.getAllByText('Elektrisch').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Indien van toepassing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Te plaatsen installatie').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Daksituatie (drone)').length).toBeGreaterThan(0)
  })

  it('shows Concept badge when isDraft is true', () => {
    render(<SurveyForm {...base} isDraft={true} />)
    expect(screen.getByText('Concept')).toBeInTheDocument()
  })

  it('hides Concept badge when isDraft is false', () => {
    render(<SurveyForm {...base} isDraft={false} />)
    expect(screen.queryByText('Concept')).not.toBeInTheDocument()
  })

  it('disables finalize button when no drone photos present', () => {
    render(<SurveyForm {...base} />)
    expect(screen.getByText('Opmeting afronden')).toBeDisabled()
  })

  it('enables finalize button when a drone photo (slot 19-23) exists', () => {
    const dronePhoto: UploadedPhoto = {
      id: 'p1', slotIndex: 19, slotName: "Foto's dakvlakken", fileUrl: '/x.jpg', order: 0,
    }
    render(<SurveyForm {...base} initialPhotos={[dronePhoto]} />)
    expect(screen.getByText('Opmeting afronden')).not.toBeDisabled()
  })

  it('renders project name in the header', () => {
    render(<SurveyForm {...base} projectName="Vermeersch" />)
    expect(screen.getByText('Vermeersch')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd greenhouse-app && npm test -- src/test/components/SurveyForm.test.tsx`
Expected: FAIL — `Cannot find module '@/components/survey/SurveyForm'`

- [ ] **Step 3: Create src/components/survey/SurveyForm.tsx**

```tsx
// src/components/survey/SurveyForm.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  PHOTO_SECTIONS,
  EMPTY_MEASUREMENTS,
  type UploadedPhoto,
  type SurveyMeasurements,
} from '@/lib/survey'
import PhotoSection from './PhotoSection'
import MeasurementFields from './MeasurementFields'

interface Props {
  projectId: string
  projectName: string
  initialPhotos: UploadedPhoto[]
  initialMeasurements: SurveyMeasurements
  isDraft: boolean
  onSave: (measurements: SurveyMeasurements, isDraft: boolean) => Promise<void>
  onBack: () => void
}

export default function SurveyForm({
  projectId, projectName, initialPhotos, initialMeasurements, isDraft, onSave, onBack,
}: Props) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPhotos)
  const [measurements, setMeasurements] = useState<SurveyMeasurements>(
    initialMeasurements ?? EMPTY_MEASUREMENTS
  )
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [pageUrl, setPageUrl] = useState('')

  useEffect(() => { setPageUrl(window.location.href) }, [])

  function copyUrl() {
    navigator.clipboard.writeText(pageUrl).catch(() => {})
  }

  const photosBySlot: Record<number, UploadedPhoto[]> = {}
  for (const p of photos) {
    if (!photosBySlot[p.slotIndex]) photosBySlot[p.slotIndex] = []
    photosBySlot[p.slotIndex].push(p)
  }

  const handleUpload = useCallback(async (slotIndex: number, file: File) => {
    setUploadingSlot(slotIndex)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('slotIndex', String(slotIndex))
      const res = await fetch(`/api/surveys/${projectId}/photos`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload mislukt')
      const photo: UploadedPhoto = await res.json()
      setPhotos(prev => [...prev, photo])
    } finally {
      setUploadingSlot(null)
    }
  }, [projectId])

  const handleDelete = useCallback(async (photoId: string) => {
    const res = await fetch(`/api/surveys/${projectId}/photos/${photoId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Verwijderen mislukt')
    setPhotos(prev => prev.filter(p => p.id !== photoId))
  }, [projectId])

  async function handleSave(finalize: boolean) {
    setSaving(true)
    try {
      await onSave(measurements, !finalize)
    } finally {
      setSaving(false)
    }
  }

  const hasDronePhotos = photos.some(p => p.slotIndex >= 19 && p.slotIndex <= 23)

  return (
    <div className="flex flex-col h-full bg-ghs-bg">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-3 bg-ghs-surface shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] text-white/40 hover:text-white/70 transition-colors"
        >
          ← Terug
        </button>
        <h1 className="text-sm font-bold text-white truncate">{projectName}</h1>
        <span className="text-[10px] text-white/30">Opmeting</span>
        {isDraft && (
          <span className="ml-auto shrink-0 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] px-2 py-0.5 rounded-full">
            Concept
          </span>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Section nav */}
        <nav className="hidden lg:flex w-44 shrink-0 flex-col gap-0.5 p-3 border-r border-white/[0.05] overflow-y-auto">
          {PHOTO_SECTIONS.map(section => (
            <a
              key={section.key}
              href={`#section-${section.key}`}
              className="text-[11px] text-white/35 hover:text-white/70 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              {section.label}
            </a>
          ))}
          <a
            href="#section-measurements"
            className="text-[11px] text-white/35 hover:text-white/70 px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            Metingen
          </a>
        </nav>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 pb-28">
          {PHOTO_SECTIONS.map(section => (
            <PhotoSection
              key={section.key}
              section={section}
              photosBySlot={photosBySlot}
              uploadingSlot={uploadingSlot}
              onUpload={handleUpload}
              onDelete={handleDelete}
            />
          ))}
          <MeasurementFields values={measurements} onChange={setMeasurements} />
        </div>
      </div>

      {/* Save bar */}
      <div className="shrink-0 border-t border-white/[0.05] bg-ghs-surface px-5 py-3.5 flex items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] text-white/25">
          <span>📱</span>
          <span className="hidden sm:inline">Open op telefoon:</span>
          <button
            type="button"
            onClick={copyUrl}
            className="bg-white/[0.05] hover:bg-white/10 px-2 py-0.5 rounded text-[10px] text-white/40 transition-colors"
          >
            Kopieer link
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="bg-white/[0.05] border border-white/[0.08] hover:bg-white/10 rounded-lg px-4 py-2 text-[11px] text-white/60 transition-colors disabled:opacity-40"
          >
            {saving ? 'Opslaan...' : 'Concept opslaan'}
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving || !hasDronePhotos}
            title={!hasDronePhotos ? "Voeg eerst drone foto's toe (slots 19–23)" : undefined}
            className="bg-gradient-to-br from-ghs-green to-[#4aaa28] text-[#0a1a08] font-bold rounded-lg px-4 py-2 text-[11px] shadow-[0_0_14px_rgba(114,217,70,0.2)] hover:shadow-[0_0_20px_rgba(114,217,70,0.35)] transition-shadow disabled:opacity-40 disabled:shadow-none"
          >
            Opmeting afronden
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd greenhouse-app && npm test -- src/test/components/SurveyForm.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
cd greenhouse-app && git add src/components/survey/SurveyForm.tsx src/test/components/SurveyForm.test.tsx
git commit -m "feat: SurveyForm main assembly with section nav, all slots, measurements, save bar"
```

---

## Task 8: Survey page

**Files:**
- Create: `src/app/app/survey/[projectId]/page.tsx`
- Create: `src/app/app/survey/[projectId]/SurveyPageClient.tsx`

No unit tests for page-level server components (tested end-to-end in practice). The existing survey API tests cover the data layer.

- [ ] **Step 1: Create src/app/app/survey/[projectId]/page.tsx**

```tsx
// src/app/app/survey/[projectId]/page.tsx
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import SurveyPageClient from './SurveyPageClient'

type Props = { params: Promise<{ projectId: string }> }

export default async function SurveyPage({ params }: Props) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    redirect('/login')
  }

  const { projectId } = await params
  return <SurveyPageClient projectId={projectId} />
}
```

- [ ] **Step 2: Create src/app/app/survey/[projectId]/SurveyPageClient.tsx**

```tsx
// src/app/app/survey/[projectId]/SurveyPageClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SurveyForm from '@/components/survey/SurveyForm'
import { EMPTY_MEASUREMENTS, type UploadedPhoto, type SurveyMeasurements } from '@/lib/survey'

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

export default function SurveyPageClient({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [survey, setSurvey] = useState<SurveyApiResponse | null>(null)
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      router.push('/app/kanban')
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-ghs-muted text-sm">
        Opmeting laden...
      </div>
    )
  }

  if (error || !survey || !project) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        {error ?? 'Onbekende fout'}
      </div>
    )
  }

  return (
    <SurveyForm
      projectId={projectId}
      projectName={project.clientName}
      initialPhotos={survey.photos}
      initialMeasurements={toMeasurements(survey)}
      isDraft={survey.isDraft}
      onSave={handleSave}
      onBack={() => router.push('/app/kanban')}
    />
  )
}
```

- [ ] **Step 3: Verify TypeScript build passes**

Run: `cd greenhouse-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
cd greenhouse-app && git add src/app/app/survey
git commit -m "feat: survey page — server auth guard + client data loader"
```

---

## Task 9: Update projects API + kanban components for survey state

Wire survey state into the kanban so Florian sees "Opmeting starten" (active draft) or "Rapport bekijken" (completed) in the project detail panel.

**Files:**
- Modify: `src/app/api/projects/route.ts` — include `survey: { select: { id, isDraft } }` in GET
- Modify: `src/lib/types.ts` — add `SurveyStub`, `ProjectWithSurvey`
- Modify: `src/components/kanban/KanbanBoard.tsx` — use `ProjectWithSurvey[]`
- Modify: `src/components/kanban/KanbanColumn.tsx` — use `ProjectWithSurvey`
- Modify: `src/components/kanban/ProjectCard.tsx` — use `ProjectWithSurvey`
- Modify: `src/components/kanban/ProjectDetailPanel.tsx` — add survey action section
- Modify: `src/app/app/kanban/page.tsx` — use `ProjectWithSurvey` for `selected`
- Modify: `src/test/components/ProjectDetailPanel.test.tsx` — update test fixture

- [ ] **Step 1: Update src/lib/types.ts**

```ts
// src/lib/types.ts
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
  appointmentDate?: string
}

export type UpdateProjectInput = Partial<CreateProjectInput> & {
  status?: ProjectStatus
}

export type SurveyStub = {
  id: string
  isDraft: boolean
}

export type ProjectWithSurvey = Project & {
  survey: SurveyStub | null
}
```

- [ ] **Step 2: Update src/app/api/projects/route.ts — GET includes survey**

Change the `findMany` call to:
```ts
const projects = await prisma.project.findMany({
  where: { status: 'ACTIVE' },
  orderBy: { createdAt: 'desc' },
  include: { survey: { select: { id: true, isDraft: true } } },
})
```

The existing GET handler at top of the file becomes:
```ts
export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { survey: { select: { id: true, isDraft: true } } },
  })
  return NextResponse.json(projects)
}
```

- [ ] **Step 3: Update src/components/kanban/KanbanBoard.tsx**

Change `Project[]` to `ProjectWithSurvey[]`:
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

  const byCategory = (cat: 'CAT1' | 'CAT2' | 'CAT3') =>
    projects.filter(p => p.category === cat)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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
      <div className="flex-1 p-4 flex gap-4 overflow-hidden">
        <KanbanColumn category="CAT1" projects={byCategory('CAT1')} onSelect={onSelect} />
        <KanbanColumn category="CAT2" projects={byCategory('CAT2')} onSelect={onSelect} />
        <KanbanColumn category="CAT3" projects={byCategory('CAT3')} onSelect={onSelect} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update src/components/kanban/KanbanColumn.tsx**

Replace `Project` import and prop type with `ProjectWithSurvey`:
```tsx
import type { ProjectWithSurvey } from '@/lib/types'
import ProjectCard from './ProjectCard'

// ... (COLUMN_STYLES unchanged)

interface Props {
  category: 'CAT1' | 'CAT2' | 'CAT3'
  projects: ProjectWithSurvey[]
  onSelect: (p: ProjectWithSurvey) => void
}

export default function KanbanColumn({ category, projects, onSelect }: Props) {
  // ... (body unchanged)
}
```

- [ ] **Step 5: Update src/components/kanban/ProjectCard.tsx**

Replace `Project` import and prop type. The card itself doesn't need to read survey state — it just passes the project object through.

```tsx
import type { ProjectWithSurvey } from '@/lib/types'

// CAT_COLOURS and CAT_LABELS unchanged

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
  project: ProjectWithSurvey
  onSelect: (p: ProjectWithSurvey) => void
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
        {project.category === 'CAT2' && project.survey && !project.survey.isDraft && (
          <span className="ml-auto text-[9px] text-ghs-green/70">✓ Opmeting klaar</span>
        )}
        {project.category === 'CAT2' && project.survey?.isDraft && (
          <span className="ml-auto text-[9px] text-amber-400/70">📝 Concept</span>
        )}
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

- [ ] **Step 6: Update src/components/kanban/ProjectDetailPanel.tsx**

Add a survey action section for CAT2 cards. The panel already has 'use client'. Add a link to the survey page and a link to download the PDF once the survey is finalised.

Replace the entire file:
```tsx
// src/components/kanban/ProjectDetailPanel.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ProjectWithSurvey } from '@/lib/types'
import EmailComposer, { type EmailTemplate } from '@/components/email/EmailComposer'

const EXTERNAL_TOOLS = [
  { label: 'ESDEC ↗',     href: (_p: ProjectWithSurvey) => 'https://my.esdec.com' },
  { label: 'Solaredge ↗', href: (_p: ProjectWithSurvey) => 'https://solaredge.com/solaredge-portal/solution/login' },
  { label: 'Geopunt ↗',   href: (p: ProjectWithSurvey) => `https://www.geopunt.be/catalogus#q=${encodeURIComponent(p.street + ' ' + p.city)}` },
  { label: 'WebODM ↗',    href: (_p: ProjectWithSurvey) => 'https://webodm.net' },
]

interface Props {
  project: ProjectWithSurvey
  onClose: () => void
}

export default function ProjectDetailPanel({ project, onClose }: Props) {
  const [activeTemplate, setActiveTemplate] = useState<EmailTemplate | null>(null)
  const surveyDone = project.survey != null && !project.survey.isDraft

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
            {project.panelCount != null && (
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

        {/* Survey action — CAT2 only */}
        {project.category === 'CAT2' && (
          <section className="px-5 py-4 border-b border-white/[0.05]">
            <p className="text-[9px] uppercase tracking-widest text-white/25 mb-3">Opmeting</p>
            {surveyDone ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[11px] text-ghs-green/80 mb-1">
                  <span>✓</span>
                  <span>Opmeting afgerond</span>
                </div>
                <a
                  href={`/api/surveys/${project.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center bg-white/[0.05] border border-white/[0.08] hover:bg-white/10 rounded-lg px-3 py-2 text-[11px] text-white/60 transition-colors"
                >
                  📄 Rapport bekijken (PDF)
                </a>
                <Link
                  href={`/app/survey/${project.id}`}
                  className="text-center bg-white/[0.03] border border-white/[0.07] hover:border-white/15 rounded-lg px-3 py-2 text-[11px] text-white/35 hover:text-white/60 transition-colors"
                >
                  ✏ Opmeting bewerken
                </Link>
              </div>
            ) : (
              <Link
                href={`/app/survey/${project.id}`}
                className="block text-center bg-ghs-green/10 border border-ghs-green/25 hover:bg-ghs-green/15 text-ghs-green rounded-lg px-3 py-2.5 text-[11px] font-semibold transition-colors"
              >
                {project.survey?.isDraft ? '✏ Opmeting hervatten' : '▶ Opmeting starten'}
              </Link>
            )}
          </section>
        )}

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
                {tpl === 'afspraak'    && 'Afspraak inplannen'}
                {tpl === 'verslag'     && 'Verslag doorsturen'}
                {tpl === 'wijzigingen' && 'Wijzigingen bespreken'}
              </button>
            ))}
          </div>
        </section>

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

- [ ] **Step 7: Update src/app/app/kanban/page.tsx**

```tsx
// src/app/app/kanban/page.tsx
'use client'

import { useState } from 'react'
import type { ProjectWithSurvey } from '@/lib/types'
import KanbanBoard from '@/components/kanban/KanbanBoard'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import AddProjectModal from '@/components/kanban/AddProjectModal'

export default function KanbanPage() {
  const [selected, setSelected] = useState<ProjectWithSurvey | null>(null)
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

- [ ] **Step 8: Update src/test/components/ProjectDetailPanel.test.tsx**

Update the `project` fixture to match `ProjectWithSurvey` and add survey action tests:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import type { ProjectWithSurvey } from '@/lib/types'

// next/link needs a mock in jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const project: ProjectWithSurvey = {
  id: '1', clientName: 'An Claeys', email: 'an@test.be',
  phone: '0477 00 00 00', street: 'Dorpstraat 5', postalCode: '2000',
  city: 'Antwerpen', category: 'CAT2', panelCount: 16,
  roofType: 'Hellend', description: null, sellerNotes: 'Let op dakvenster',
  appointmentDate: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
  survey: null,
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

  it('shows "Opmeting starten" link for CAT2 with no survey', () => {
    render(<ProjectDetailPanel project={{ ...project, survey: null }} onClose={vi.fn()} />)
    expect(screen.getByText('▶ Opmeting starten')).toBeInTheDocument()
  })

  it('shows "Opmeting hervatten" for CAT2 with draft survey', () => {
    render(<ProjectDetailPanel project={{ ...project, survey: { id: 's1', isDraft: true } }} onClose={vi.fn()} />)
    expect(screen.getByText('✏ Opmeting hervatten')).toBeInTheDocument()
  })

  it('shows "Rapport bekijken" for CAT2 with completed survey', () => {
    render(<ProjectDetailPanel project={{ ...project, survey: { id: 's1', isDraft: false } }} onClose={vi.fn()} />)
    expect(screen.getByText(/Rapport bekijken/i)).toBeInTheDocument()
  })

  it('does not show survey section for CAT1', () => {
    render(<ProjectDetailPanel project={{ ...project, category: 'CAT1', survey: null }} onClose={vi.fn()} />)
    expect(screen.queryByText('▶ Opmeting starten')).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 9: Run all tests and verify everything passes**

Run: `cd greenhouse-app && npm test`
Expected: All tests pass (existing + new)

- [ ] **Step 10: Commit**

```bash
cd greenhouse-app && git add src/lib/types.ts src/app/api/projects/route.ts src/components/kanban/ src/app/app/kanban/page.tsx src/test/components/ProjectDetailPanel.test.tsx
git commit -m "feat: wire survey state into kanban — Opmeting starten/hervatten/rapport buttons"
```

---

## Task 10: PDF generation

**Files:**
- Create: `src/components/pdf/SurveyPDF.tsx`
- Create: `src/app/api/surveys/[projectId]/pdf/route.ts`

No unit tests for the PDF route (integration test only — verifiable by opening `/api/surveys/[projectId]/pdf` in the browser after the app is running). The PDF output is verified visually.

- [ ] **Step 1: Create src/components/pdf/SurveyPDF.tsx**

This component is server-side only. Import from `@react-pdf/renderer`.

```tsx
// src/components/pdf/SurveyPDF.tsx
// Server-side only — do NOT add 'use client'
import {
  Document, Page, View, Text, Image, StyleSheet, Font,
} from '@react-pdf/renderer'

Font.register({
  family: 'Helvetica',
  src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPN4iEgvnHyvveLxVvaooCP.woff2',
  fontStyle: 'normal',
})

const GHS_TEAL  = '#1B4D47'
const GHS_GREEN = '#72D946'
const GHS_BG    = '#070d0b'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 32,
    paddingVertical: 28,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  draftBanner: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftBannerText: { color: '#92400e', fontSize: 9, fontWeight: 'bold' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  brandBlock: { flexDirection: 'column', gap: 2 },
  brandName: { fontSize: 14, fontWeight: 'bold', color: GHS_TEAL },
  brandSub:  { fontSize: 8, color: '#6b7280' },
  docTitle:  { fontSize: 11, fontWeight: 'bold', color: '#111827', textAlign: 'right' },
  docMeta:   { fontSize: 8, color: '#6b7280', textAlign: 'right', marginTop: 2 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: GHS_TEAL,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  measureTable: { flexDirection: 'column', gap: 3, marginBottom: 4 },
  measureRow:   { flexDirection: 'row', gap: 8 },
  measureCell:  { flex: 1, flexDirection: 'row', gap: 4 },
  measureLabel: { color: '#6b7280', width: 90 },
  measureValue: { color: '#111827', flex: 1 },
  samenvatting: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
    marginTop: 4,
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.5,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  photoCell:  { width: '48%', flexDirection: 'column', gap: 3 },
  photoFull:  { width: '100%', flexDirection: 'column', gap: 3 },
  photoImg:   { width: '100%', borderRadius: 4, objectFit: 'cover' },
  photoImgFull: { width: '100%', height: 160, borderRadius: 4, objectFit: 'cover' },
  photoLabel: { fontSize: 7, color: '#6b7280' },
})

export type PdfPhoto = {
  label: string
  dataUri: string
  order: number
}

export type PdfSection = {
  key: string
  label: string
  photos: PdfPhoto[]
  isDrone: boolean
}

export type SurveyPDFProps = {
  clientName: string
  address: string
  date: string
  isDraft: boolean
  measurements: {
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
  }
  sections: PdfSection[]
}

function boolLabel(v: boolean | null): string {
  if (v === true)  return 'Ja'
  if (v === false) return 'Nee'
  return '—'
}

function val(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  return String(v)
}

export default function SurveyPDF({
  clientName, address, date, isDraft, measurements, sections,
}: SurveyPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Draft warning */}
        {isDraft && (
          <View style={styles.draftBanner}>
            <Text style={styles.draftBannerText}>⚠ CONCEPT — Opmeting niet afgerond</Text>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>Greenhouse Solutions</Text>
            <Text style={styles.brandSub}>Opmetingsverslag</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{clientName}</Text>
            <Text style={styles.docMeta}>{address}</Text>
            <Text style={styles.docMeta}>{date}</Text>
          </View>
        </View>

        {/* Measurements */}
        <Text style={styles.sectionTitle}>Metingen</Text>
        <View style={styles.measureTable}>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Netspanning</Text>
              <Text style={styles.measureValue}>{val(measurements.netspanning)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Hoofdzekering</Text>
              <Text style={styles.measureValue}>{val(measurements.hoofdzekering)}</Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Aarding ok</Text>
              <Text style={styles.measureValue}>{boolLabel(measurements.aardingOk)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Elektriciteit ok</Text>
              <Text style={styles.measureValue}>{boolLabel(measurements.elektriciteitsOk)}</Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Locatie omvormer</Text>
              <Text style={styles.measureValue}>{val(measurements.locatieOmvormer)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Soort bevestiging</Text>
              <Text style={styles.measureValue}>{val(measurements.soortBevestiging)}</Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Muurdoorvoeren</Text>
              <Text style={styles.measureValue}>{val(measurements.aantalMuurdoorvoeren)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Internet</Text>
              <Text style={styles.measureValue}>
                {boolLabel(measurements.internet)}{measurements.internetType ? ` (${measurements.internetType})` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.measureRow}>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Lengte DC</Text>
              <Text style={styles.measureValue}>{val(measurements.geschatteLengteDc)}</Text>
            </View>
            <View style={styles.measureCell}>
              <Text style={styles.measureLabel}>Lengte AC</Text>
              <Text style={styles.measureValue}>{val(measurements.geschatteLengteAc)}</Text>
            </View>
          </View>
        </View>

        {measurements.samenvatting && (
          <Text style={styles.samenvatting}>{measurements.samenvatting}</Text>
        )}

        {/* Photo sections */}
        {sections.map(section => section.photos.length > 0 && (
          <View key={section.key} wrap={false}>
            <Text style={styles.sectionTitle}>{section.label}</Text>
            <View style={section.isDrone ? { flexDirection: 'column', gap: 6 } : styles.photoGrid}>
              {section.photos.map(photo => (
                <View key={`${photo.label}-${photo.order}`} style={section.isDrone ? styles.photoFull : styles.photoCell}>
                  <Image
                    src={photo.dataUri}
                    style={section.isDrone ? styles.photoImgFull : styles.photoImg}
                  />
                  <Text style={styles.photoLabel}>{photo.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Create src/app/api/surveys/[projectId]/pdf/route.ts**

```ts
// src/app/api/surveys/[projectId]/pdf/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { getPhotoBuffer } from '@/lib/photos'
import { PHOTO_SECTIONS } from '@/lib/survey'
import type { PdfSection, PdfPhoto } from '@/components/pdf/SurveyPDF'

type Params = { params: Promise<{ projectId: string }> }

function photoDataUri(url: string): string | null {
  try {
    const buf = getPhotoBuffer(url)
    const base64 = buf.toString('base64')
    const ext = url.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const [survey, project] = await Promise.all([
    prisma.survey.findUnique({
      where: { projectId },
      include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
    }),
    prisma.project.findUnique({ where: { id: projectId } }),
  ])

  if (!survey || !project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Build photo sections for the PDF
  const photosBySlot: Record<number, typeof survey.photos> = {}
  for (const ph of survey.photos) {
    if (!photosBySlot[ph.slotIndex]) photosBySlot[ph.slotIndex] = []
    photosBySlot[ph.slotIndex].push(ph)
  }

  const sections: PdfSection[] = PHOTO_SECTIONS.map(sec => {
    const photos: PdfPhoto[] = []
    for (const slot of sec.slots) {
      const slotPhotos = photosBySlot[slot.index] ?? []
      slotPhotos.forEach((ph, i) => {
        const uri = photoDataUri(ph.fileUrl)
        if (!uri) return
        const suffix = slotPhotos.length > 1 ? String.fromCharCode(97 + i) : ''
        const padded = String(slot.index).padStart(2, '0')
        photos.push({ label: `${padded}${suffix} ${slot.name}`, dataUri: uri, order: i })
      })
    }
    return { key: sec.key, label: sec.label, photos, isDrone: sec.key === 'drone' }
  })

  const address = `${project.street}, ${project.postalCode} ${project.city}`
  const date = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })

  // Dynamic import to avoid Next.js bundling issues with @react-pdf/renderer
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { default: SurveyPDF } = await import('@/components/pdf/SurveyPDF')
  const { createElement } = await import('react')

  const pdfBuffer = await renderToBuffer(
    createElement(SurveyPDF, {
      clientName: project.clientName,
      address,
      date,
      isDraft: survey.isDraft,
      measurements: survey,
      sections,
    })
  )

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="opmeting-${project.clientName.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Run full test suite**

Run: `cd greenhouse-app && npm test`
Expected: All tests pass (no regressions)

- [ ] **Step 4: Run TypeScript check**

Run: `cd greenhouse-app && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Verify development build works**

Run: `cd greenhouse-app && npm run build`
Expected: Build completes with no errors

- [ ] **Step 6: Commit**

```bash
cd greenhouse-app && git add src/components/pdf/ src/app/api/surveys/
git commit -m "feat: PDF generation — GHS branded A4 with photos, measurements, draft banner"
```

---

## Final check

After all 10 tasks are complete:

- [ ] Run `cd greenhouse-app && npm test` — all tests pass
- [ ] Run `cd greenhouse-app && npx tsc --noEmit` — no TypeScript errors
- [ ] Run `cd greenhouse-app && npm run build` — clean production build
- [ ] Manual smoke test:
  1. `npm run dev` — open `http://localhost:3000`
  2. Log in → navigate to kanban
  3. Click a CAT2 card → verify "Opmeting starten" link appears in detail panel
  4. Click "Opmeting starten" → verify survey page loads with all 23 slots
  5. Upload a test photo to slot 1 → verify thumbnail appears
  6. Fill in measurement fields → click "Concept opslaan"
  7. Navigate back → click card again → verify "Opmeting hervatten" shows
  8. Upload a drone photo (slot 19-23) → verify "Opmeting afronden" becomes enabled
  9. Click "Opmeting afronden" → verify redirect to kanban
  10. Click card again → verify "Rapport bekijken" + "Opmeting bewerken" show
  11. Click "Rapport bekijken" → verify PDF opens in new tab with GHS branding

---

*Spec:* `docs/superpowers/specs/2026-05-20-greenhouse-florian-app-design.md`  
*Plan 1:* `docs/superpowers/plans/2026-05-21-plan-1-foundation-kanban.md`  
*Plan 1 complete:* `docs/superpowers/2026-05-21-plan-1-complete.md`
