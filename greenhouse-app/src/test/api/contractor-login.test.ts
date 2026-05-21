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
