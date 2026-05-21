import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  // This endpoint is contractor-only
  if (role !== 'contractor') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { category: 'CAT2', status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { survey: { select: { id: true, isDraft: true, deliveredAt: true } } },
  })
  return NextResponse.json(projects)
}
