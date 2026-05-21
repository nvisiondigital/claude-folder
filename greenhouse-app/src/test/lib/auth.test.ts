// src/test/lib/auth.test.ts
// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { createToken, getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

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
    const role = await getAuthRole(token, undefined)
    expect(role).toBeNull()
  })

  it('exports correct cookie names', () => {
    expect(SESSION_COOKIE).toBe('ghs_session')
    expect(CONTRACTOR_SESSION_COOKIE).toBe('ghs_contractor_session')
  })
})
