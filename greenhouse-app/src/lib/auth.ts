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
