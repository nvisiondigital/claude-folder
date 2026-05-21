// src/app/api/surveys/[projectId]/pdf/route.ts
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { getAuthRole, SESSION_COOKIE, CONTRACTOR_SESSION_COOKIE } from '@/lib/auth'
import { getPhotoDataUri } from '@/lib/photos'
import { PHOTO_SECTIONS } from '@/lib/survey'
import type { PdfSection, PdfPhoto } from '@/components/pdf/SurveyPDF'

type Params = { params: Promise<{ projectId: string }> }


export async function GET(_req: NextRequest, { params }: Params) {
  const cookieStore = await cookies()
  const role = await getAuthRole(
    cookieStore.get(SESSION_COOKIE)?.value,
    cookieStore.get(CONTRACTOR_SESSION_COOKIE)?.value,
  )
  // Both florian and contractor may download PDFs — see Plan 3 contractor portal
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

  const sections: PdfSection[] = await Promise.all(
    PHOTO_SECTIONS.map(async sec => {
      const photos: PdfPhoto[] = []
      for (const slot of sec.slots) {
        const slotPhotos = photosBySlot[slot.index] ?? []
        for (let i = 0; i < slotPhotos.length; i++) {
          const ph = slotPhotos[i]
          const uri = await getPhotoDataUri(ph.fileUrl)
          if (!uri) continue
          const suffix = slotPhotos.length > 1 ? String.fromCharCode(97 + i) : ''
          const padded = String(slot.index).padStart(2, '0')
          photos.push({ label: `${padded}${suffix} ${slot.name}`, dataUri: uri, order: i })
        }
      }
      return { key: sec.key, label: sec.label, photos, isDrone: sec.key === 'drone' }
    })
  )

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
