import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createToken, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const password =
    body && typeof body === 'object' && 'password' in body
      ? (body as Record<string, unknown>).password
      : undefined

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const hash = process.env.CONTRACTOR_PASSWORD_HASH
  if (!hash) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const valid = await verifyPassword(password, hash)
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 })

  const token = await createToken({ role: 'contractor' })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(CONTRACTOR_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
