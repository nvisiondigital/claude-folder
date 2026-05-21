import { describe, it, expect } from 'vitest'
import { buildMailtoUrl, EMAIL_TEMPLATES } from '@/lib/email'
import type { Project } from '@prisma/client'

const project: Project = {
  id: '1', clientName: 'Jan Janssen', email: 'jan@test.be',
  phone: '0499', street: 'Kerkstraat 1', postalCode: '9000',
  city: 'Gent', category: 'CAT2', panelCount: null,
  roofType: null, description: null, sellerNotes: null,
  appointmentDate: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
}

describe('buildMailtoUrl', () => {
  it('produces a mailto: URL with correct recipient', () => {
    const url = buildMailtoUrl('afspraak', project)
    expect(url).toMatch(/^mailto:jan@test\.be/)
  })

  it('includes a subject in the mailto URL', () => {
    const url = buildMailtoUrl('afspraak', project)
    expect(url).toContain('subject=')
    expect(url).toContain('Jan%20Janssen')
  })

  it('includes a body in the mailto URL', () => {
    const url = buildMailtoUrl('afspraak', project)
    expect(url).toContain('body=')
  })

  it('builds mailto URLs for all 3 templates', () => {
    const templates = ['afspraak', 'verslag', 'wijzigingen'] as const
    for (const tpl of templates) {
      expect(() => buildMailtoUrl(tpl, project)).not.toThrow()
    }
  })
})
