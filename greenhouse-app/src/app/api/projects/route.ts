import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import type { CreateProjectInput } from '@/lib/types'

const REQUIRED_FIELDS: (keyof CreateProjectInput)[] = [
  'clientName', 'email', 'phone', 'street', 'postalCode', 'city', 'category',
]

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: { survey: { select: { id: true, isDraft: true } } },
  })
  return NextResponse.json(projects)
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: CreateProjectInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  for (const field of REQUIRED_FIELDS) {
    if (body[field] == null || body[field] === '') {
      return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 })
    }
  }

  const project = await prisma.project.create({
    data: {
      clientName:      body.clientName,
      email:           body.email,
      phone:           body.phone,
      street:          body.street,
      postalCode:      body.postalCode,
      city:            body.city,
      category:        body.category,
      panelCount:      body.panelCount ?? null,
      roofType:        body.roofType ?? null,
      description:     body.description ?? null,
      sellerNotes:     body.sellerNotes ?? null,
      appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
    },
  })

  return NextResponse.json(project, { status: 201 })
}
