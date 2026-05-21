// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

// Mock Prisma — use vi.hoisted so variables are available before vi.mock hoisting
const { mockCreate, mockFindMany, mockFindUnique, mockUpdate, mockDelete } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockFindMany: vi.fn(),
  mockFindUnique: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
}))

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

const mockVerifyToken = vi.hoisted(() => vi.fn().mockResolvedValue({ role: 'florian' }))

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    verifyToken: mockVerifyToken,
    SESSION_COOKIE: 'ghs_session',
    CONTRACTOR_SESSION_COOKIE: 'ghs_contractor_session',
    getAuthRole: vi.fn().mockImplementation(
      (florianToken: string | undefined) =>
        Promise.resolve(florianToken ? 'florian' : null)
    ),
  }
})

// Mock next/headers cookies()
const mockCookiesGet = vi.hoisted(() => vi.fn())
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({ get: mockCookiesGet })),
}))

import { beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/projects/route'
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/projects/[id]/route'
import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'

function makeRequest(method: string, body?: object, includeAuth = true) {
  return new NextRequest('http://localhost/api/projects', {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(includeAuth ? { cookie: 'ghs_session=valid' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function makeIdRequest(method: string, id: string, body?: object, includeAuth = true) {
  return new NextRequest(`http://localhost/api/projects/${id}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(includeAuth ? { cookie: 'ghs_session=valid' } : {}),
    },
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

// Helper: set up cookies mock to return a token (authenticated)
function setupAuthCookie() {
  mockCookiesGet.mockImplementation((name: string) =>
    name === 'ghs_session' ? { value: 'valid' } : undefined
  )
}

// Helper: set up cookies mock to return no token (unauthenticated)
function setupNoAuthCookie() {
  mockCookiesGet.mockImplementation(() => undefined)
}

// Reset to authenticated state before each test by default
beforeEach(() => {
  setupAuthCookie()
})

describe('GET /api/projects', () => {
  it('returns list of projects', async () => {
    setupAuthCookie()
    mockFindMany.mockResolvedValueOnce([sampleProject])
    const res = await GET(makeRequest('GET'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(data[0].clientName).toBe('Test User')
  })

  it('returns 401 when unauthenticated', async () => {
    setupNoAuthCookie()
    const res = await GET(makeRequest('GET', undefined, false))
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })
})

describe('POST /api/projects', () => {
  it('creates a project and returns 201', async () => {
    setupAuthCookie()
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
    setupAuthCookie()
    const res = await POST(makeRequest('POST', { clientName: 'Only Name' }))
    expect(res.status).toBe(400)
  })
})

describe('GET /api/projects/[id]', () => {
  it('returns 200 with project', async () => {
    setupAuthCookie()
    mockFindUnique.mockResolvedValueOnce(sampleProject)
    const req = makeIdRequest('GET', 'cuid1')
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: 'cuid1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('cuid1')
    expect(data.clientName).toBe('Test User')
  })

  it('returns 404 for missing project', async () => {
    setupAuthCookie()
    mockFindUnique.mockResolvedValueOnce(null)
    const req = makeIdRequest('GET', 'nonexistent')
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Not found')
  })

  it('returns 401 when unauthenticated', async () => {
    setupNoAuthCookie()
    const req = makeIdRequest('GET', 'cuid1', undefined, false)
    const res = await GET_BY_ID(req, { params: Promise.resolve({ id: 'cuid1' }) })
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
  })
})

describe('DELETE /api/projects/[id]', () => {
  it('returns { ok: true }', async () => {
    setupAuthCookie()
    mockDelete.mockResolvedValueOnce(sampleProject)
    const req = makeIdRequest('DELETE', 'cuid1')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'cuid1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.ok).toBe(true)
  })

  it('returns 404 when project not found', async () => {
    setupAuthCookie()
    mockDelete.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '0',
      })
    )
    const req = makeIdRequest('DELETE', 'nonexistent')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Not found')
  })
})

describe('PATCH /api/projects/[id]', () => {
  it('updates and returns project', async () => {
    setupAuthCookie()
    const updated = { ...sampleProject, clientName: 'Updated Name' }
    mockUpdate.mockResolvedValueOnce(updated)
    const req = makeIdRequest('PATCH', 'cuid1', { clientName: 'Updated Name' })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'cuid1' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.clientName).toBe('Updated Name')
  })

  it('returns 404 when project not found', async () => {
    setupAuthCookie()
    mockUpdate.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Not found', {
        code: 'P2025',
        clientVersion: '0',
      })
    )
    const req = makeIdRequest('PATCH', 'nonexistent', { clientName: 'X' })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) })
    expect(res.status).toBe(404)
    const data = await res.json()
    expect(data.error).toBe('Not found')
  })
})
