// src/app/api/surveys/[projectId]/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import { deletePhoto } from '@/lib/photos'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'

type Params = { params: Promise<{ projectId: string; photoId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  // Both florian and contractor may delete photos — see Plan 3 contractor portal
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { photoId } = await params

  try {
    const photo = await prisma.photo.delete({ where: { id: photoId } })
    await deletePhoto(photo.fileUrl)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}
