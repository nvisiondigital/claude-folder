// @vitest-environment node
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
