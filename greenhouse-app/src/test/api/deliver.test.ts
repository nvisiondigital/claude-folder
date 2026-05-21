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
