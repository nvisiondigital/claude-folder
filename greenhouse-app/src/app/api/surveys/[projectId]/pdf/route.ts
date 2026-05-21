// src/app/api/surveys/[projectId]/pdf/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import { getPhotoBuffer } from '@/lib/photos'
import { PHOTO_SECTIONS } from '@/lib/survey'
import type { PdfSection, PdfPhoto } from '@/components/pdf/SurveyPDF'

type Params = { params: Promise<{ projectId: string }> }

function photoDataUri(url: string): string | null {
  try {
    const buf = getPhotoBuffer(url)
    const base64 = buf.toString('base64')
    const ext = url.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg'
    return `data:${mime};base64,${base64}`
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  if (!role) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const [survey, project] = await Promise.all([
    prisma.survey.findUnique({
      where: { projectId },
      include: { photos: { orderBy: [{ slotIndex: 'asc' }, { order: 'asc' }] } },
    }),
    prisma.project.findUnique({ where: { id: projectId } }),
  ])

  if (!survey || !project) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Build photo sections for the PDF
  const photosBySlot: Record<number, typeof survey.photos> = {}
  for (const ph of survey.photos) {
    if (!photosBySlot[ph.slotIndex]) photosBySlot[ph.slotIndex] = []
    photosBySlot[ph.slotIndex].push(ph)
  }

  const sections: PdfSection[] = PHOTO_SECTIONS.map(sec => {
    const photos: PdfPhoto[] = []
    for (const slot of sec.slots) {
      const slotPhotos = photosBySlot[slot.index] ?? []
      slotPhotos.forEach((ph, i) => {
        const uri = photoDataUri(ph.fileUrl)
        if (!uri) return
        const suffix = slotPhotos.length > 1 ? String.fromCharCode(97 + i) : ''
        const padded = String(slot.index).padStart(2, '0')
        photos.push({ label: `${padded}${suffix} ${slot.name}`, dataUri: uri, order: i })
      })
    }
    return { key: sec.key, label: sec.label, photos, isDrone: sec.key === 'drone' }
  })

  const address = `${project.street}, ${project.postalCode} ${project.city}`
  const date = new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })

  // Dynamic import to avoid Next.js bundling issues with @react-pdf/renderer
  const { renderToBuffer } = await import('@react-pdf/renderer')
  const { default: SurveyPDF } = await import('@/components/pdf/SurveyPDF')
  const React = await import('react')

  // Explicitly pick measurement fields to satisfy TypeScript
  const measurements = {
    netspanning:          survey.netspanning,
    hoofdzekering:        survey.hoofdzekering,
    aardingOk:            survey.aardingOk,
    elektriciteitsOk:     survey.elektriciteitsOk,
    locatieOmvormer:      survey.locatieOmvormer,
    soortBevestiging:     survey.soortBevestiging,
    aantalMuurdoorvoeren: survey.aantalMuurdoorvoeren,
    geschatteLengteDc:    survey.geschatteLengteDc,
    geschatteLengteAc:    survey.geschatteLengteAc,
    internet:             survey.internet,
    internetType:         survey.internetType,
    samenvatting:         survey.samenvatting,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(SurveyPDF as any, {
    clientName: project.clientName,
    address,
    date,
    isDraft: survey.isDraft,
    measurements,
    sections,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(element as any)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="opmeting-${project.clientName.replace(/\s+/g, '-')}.pdf"`,
    },
  })
}
