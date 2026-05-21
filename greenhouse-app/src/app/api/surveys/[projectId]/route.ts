// src/app/api/surveys/[projectId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'

type Params = { params: Promise<{ projectId: string }> }

async function getAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await getAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  let survey = await prisma.survey.findUnique({
    where: { projectId },
    include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
  })

  if (!survey) {
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    survey = await prisma.survey.create({
      data: { projectId, isDraft: true },
      include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
    })
  }

  return NextResponse.json(survey)
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await getAuth())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const existing = await prisma.survey.findUnique({ where: { projectId } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}

  if (body.netspanning !== undefined)          data.netspanning          = body.netspanning ?? null
  if (body.hoofdzekering !== undefined)        data.hoofdzekering        = body.hoofdzekering ?? null
  if (body.aardingOk !== undefined)            data.aardingOk            = body.aardingOk ?? null
  if (body.elektriciteitsOk !== undefined)     data.elektriciteitsOk     = body.elektriciteitsOk ?? null
  if (body.locatieOmvormer !== undefined)      data.locatieOmvormer      = body.locatieOmvormer ?? null
  if (body.soortBevestiging !== undefined)     data.soortBevestiging     = body.soortBevestiging ?? null
  if (body.aantalMuurdoorvoeren !== undefined) {
    const n = body.aantalMuurdoorvoeren
    data.aantalMuurdoorvoeren = (typeof n === 'string' && n !== '')
      ? parseInt(n, 10)
      : (typeof n === 'number' ? n : null)
  }
  if (body.geschatteLengteDc !== undefined)    data.geschatteLengteDc    = body.geschatteLengteDc ?? null
  if (body.geschatteLengteAc !== undefined)    data.geschatteLengteAc    = body.geschatteLengteAc ?? null
  if (body.internet !== undefined)             data.internet             = body.internet ?? null
  if (body.internetType !== undefined)         data.internetType         = body.internetType ?? null
  if (body.samenvatting !== undefined)         data.samenvatting         = body.samenvatting ?? null
  if (body.isDraft !== undefined)              data.isDraft              = body.isDraft

  if (body.isDraft === false && existing.isDraft === true) {
    data.submittedAt = new Date()
  }

  const survey = await prisma.survey.update({
    where: { projectId },
    data,
    include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
  })

  return NextResponse.json(survey)
}
