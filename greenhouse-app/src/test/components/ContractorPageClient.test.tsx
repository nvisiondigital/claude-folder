// src/test/components/ContractorPageClient.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

const mockFetch = vi.fn()
global.fetch = mockFetch

const noSurveyProject = {
  id: 'p1', clientName: 'Jan Janssen', city: 'Gent', category: 'CAT2',
  street: 'Kerkstr 1', postalCode: '9000', survey: null,
}
const draftProject = {
  id: 'p2', clientName: 'Piet Pieters', city: 'Antwerpen', category: 'CAT2',
  street: 'Meir 1', postalCode: '2000', survey: { id: 's2', isDraft: true, deliveredAt: null },
}
const doneProject = {
  id: 'p3', clientName: 'Marie Maes', city: 'Brugge', category: 'CAT2',
  street: 'Burg 1', postalCode: '8000', survey: { id: 's3', isDraft: false, deliveredAt: null },
}
const deliveredProject = {
  id: 'p4', clientName: 'Luc Lievens', city: 'Hasselt', category: 'CAT2',
  street: 'Grote Markt 1', postalCode: '3500',
  survey: { id: 's4', isDraft: false, deliveredAt: '2026-05-21T10:00:00Z' },
}

beforeEach(() => { vi.clearAllMocks() })

import ContractorPageClient from '@/app/contractor/ContractorPageClient'

describe('ContractorPageClient', () => {
  it('shows loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<ContractorPageClient />)
    expect(screen.getByText(/laden/i)).toBeInTheDocument()
  })

  it('shows Opmeting starten for projects without survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [noSurveyProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Jan Janssen'))
    expect(screen.getByText(/Opmeting starten/i)).toBeInTheDocument()
  })

  it('shows Opmeting hervatten for draft survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [draftProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Piet Pieters'))
    expect(screen.getByText(/Opmeting hervatten/i)).toBeInTheDocument()
  })

  it('shows Lever in button for done but not delivered survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [doneProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Marie Maes'))
    expect(screen.getByText(/Lever in/i)).toBeInTheDocument()
  })

  it('shows Ingediend badge for delivered survey', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: async () => [deliveredProject] })
    render(<ContractorPageClient />)
    await waitFor(() => screen.getByText('Luc Lievens'))
    expect(screen.getByText(/Ingediend/i)).toBeInTheDocument()
  })
})
