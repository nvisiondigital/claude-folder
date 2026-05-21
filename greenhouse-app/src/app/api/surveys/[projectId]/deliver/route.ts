import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const survey = await prisma.survey.findUnique({ where: { projectId } })
  if (!survey) {
    return NextResponse.json({ error: 'Survey not found' }, { status: 404 })
  }
  if (survey.deliveredAt) {
    return NextResponse.json({ error: 'Already delivered' }, { status: 409 })
  }

  const now = new Date()

  const [updated] = await Promise.all([
    prisma.survey.update({
      where: { projectId },
      data: { deliveredAt: now, isDraft: false },
    }),
    prisma.dispatchJob.upsert({
      where: { projectId },
      create: { projectId, status: 'SURVEY_COMPLETED', deliveredAt: now },
      update: { status: 'SURVEY_COMPLETED', deliveredAt: now },
    }),
  ])

  return NextResponse.json(updated)
}
