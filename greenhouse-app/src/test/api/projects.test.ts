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
