import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import type { UpdateProjectInput } from '@/lib/types'

async function getRole() {
  const cookieStore = await cookies()
  return getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRole()
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // Contractors may only read CAT2 projects (they should only survey those)
  if (role === 'contractor' && project.category !== 'CAT2') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if ((await getRole()) !== 'florian') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  let body: UpdateProjectInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  try {
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.clientName     !== undefined && { clientName: body.clientName }),
        ...(body.email          !== undefined && { email: body.email }),
        ...(body.phone          !== undefined && { phone: body.phone }),
        ...(body.street         !== undefined && { street: body.street }),
        ...(body.postalCode     !== undefined && { postalCode: body.postalCode }),
        ...(body.city           !== undefined && { city: body.city }),
        ...(body.category       !== undefined && { category: body.category }),
        ...(body.panelCount     !== undefined && { panelCount: body.panelCount }),
        ...(body.roofType       !== undefined && { roofType: body.roofType }),
        ...(body.description    !== undefined && { description: body.description }),
        ...(body.sellerNotes    !== undefined && { sellerNotes: body.sellerNotes }),
        ...(body.status         !== undefined && { status: body.status }),
        ...(body.appointmentDate !== undefined && {
          appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
        }),
      },
    })
    return NextResponse.json(project)
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if ((await getRole()) !== 'florian') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    await prisma.project.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}
