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

  it('returns 400 for disallowed MIME type', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)

    const formData = new FormData()
    formData.append('file', new File(['data'], 'malware.exe', { type: 'application/octet-stream' }))
    formData.append('slotIndex', '1')

    const postReq = new NextRequest('http://localhost/api/surveys/proj1/photos', {
      method: 'POST',
      headers: { cookie: 'ghs_session=valid' },
      body: formData,
    })
    const res = await POST_PHOTO(postReq, photoParams)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Bestandstype niet toegestaan')
  })

  it('returns 400 when file exceeds 15 MB', async () => {
    mockSurveyFindUnique.mockResolvedValueOnce(sampleSurvey)

    // Create a File whose .size property exceeds 15 MB
    const oversizedContent = new Uint8Array(16 * 1024 * 1024) // 16 MB
    const formData = new FormData()
    formData.append('file', new File([oversizedContent], 'big.jpg', { type: 'image/jpeg' }))
    formData.append('slotIndex', '1')

    const postReq = new NextRequest('http://localhost/api/surveys/proj1/photos', {
      method: 'POST',
      headers: { cookie: 'ghs_session=valid' },
      body: formData,
    })
    const res = await POST_PHOTO(postReq, photoParams)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Bestand te groot (max 15 MB)')
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
