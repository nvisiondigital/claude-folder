import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { UpdateProjectInput } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await prisma.project.findUnique({ where: { id } })
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: UpdateProjectInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(body.clientName      && { clientName: body.clientName }),
      ...(body.email           && { email: body.email }),
      ...(body.phone           && { phone: body.phone }),
      ...(body.street          && { street: body.street }),
      ...(body.postalCode      && { postalCode: body.postalCode }),
      ...(body.city            && { city: body.city }),
      ...(body.category        && { category: body.category }),
      ...(body.panelCount  !== undefined && { panelCount: body.panelCount }),
      ...(body.roofType    !== undefined && { roofType: body.roofType }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.sellerNotes !== undefined && { sellerNotes: body.sellerNotes }),
      ...(body.status      !== undefined && { status: body.status }),
      ...(body.appointmentDate !== undefined && {
        appointmentDate: body.appointmentDate ? new Date(body.appointmentDate) : null,
      }),
    },
  })

  return NextResponse.json(project)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.project.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
