// src/app/api/surveys/[projectId]/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { verifyToken, SESSION_COOKIE } from '@/lib/auth'
import { deletePhoto } from '@/lib/photos'
import { Prisma } from '@prisma/client'

type Params = { params: Promise<{ projectId: string; photoId: string }> }

export async function DELETE(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { photoId } = await params

  try {
    const photo = await prisma.photo.delete({ where: { id: photoId } })
    deletePhoto(photo.fileUrl)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw e
  }
}
