import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const projects = await prisma.project.findMany({
    where: {
      status: 'ACTIVE',
      appointmentDate: { gte: now, lte: twoWeeksLater },
    },
    orderBy: { appointmentDate: 'asc' },
  })

  return NextResponse.json(projects)
}
