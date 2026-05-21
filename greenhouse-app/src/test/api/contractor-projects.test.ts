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
  it('returns 401 when not authenticated', async () => {
    mockGetAuthRole.mockResolvedValue(null)
    const res = await GET(req())
    expect(res.status).toBe(401)
  })

  it('returns 401 when authenticated as florian (contractor-only route)', async () => {
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
