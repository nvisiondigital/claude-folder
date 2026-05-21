// src/app/api/surveys/[projectId]/photos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import { savePhoto } from '@/lib/photos'
import { getSlotDef } from '@/lib/survey'

type Params = { params: Promise<{ projectId: string }> }

export async function POST(req: NextRequest, { params }: Params) {
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
  if (!survey) return NextResponse.json({ error: 'Survey not found' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const slotIndexStr = formData.get('slotIndex') as string | null

  if (!file || !slotIndexStr) {
    return NextResponse.json({ error: 'Missing file or slotIndex' }, { status: 400 })
  }

  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Bestandstype niet toegestaan' }, { status: 400 })
  }

  const MAX_SIZE = 15 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Bestand te groot (max 15 MB)' }, { status: 400 })
  }

  const slotIndex = parseInt(slotIndexStr, 10)
  const slotDef = getSlotDef(slotIndex)
  if (!slotDef) {
    return NextResponse.json({ error: 'Invalid slotIndex' }, { status: 400 })
  }

  const existingCount = await prisma.photo.count({
    where: { surveyId: survey.id, slotIndex },
  })

  const fileUrl = await savePhoto(survey.id, file)

  const photo = await prisma.photo.create({
    data: {
      surveyId:  survey.id,
      slotIndex,
      slotName:  slotDef.name,
      fileUrl,
      order:     existingCount,
    },
  })

  return NextResponse.json(photo, { status: 201 })
}
