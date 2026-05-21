import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createToken, SESSION_COOKIE } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const hash = process.env.FLORIAN_PASSWORD_HASH
  if (!hash) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

  const valid = await verifyPassword(password, hash)
  if (!valid) return NextResponse.json({ error: 'Invalid password' }, { status: 401 })

  const token = await createToken({ role: 'florian' })

  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })
  return res
}
