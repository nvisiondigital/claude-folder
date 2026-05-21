import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import type { ProjectWithSurvey } from '@/lib/types'

// next/link needs a mock in jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const project: ProjectWithSurvey = {
  id: '1', clientName: 'An Claeys', email: 'an@test.be',
  phone: '0477 00 00 00', street: 'Dorpstraat 5', postalCode: '2000',
  city: 'Antwerpen', category: 'CAT2', panelCount: 16,
  roofType: 'Hellend', description: null, sellerNotes: 'Let op dakvenster',
  appointmentDate: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
  survey: null,
}

describe('ProjectDetailPanel', () => {
  it('shows client name and contact info', () => {
    render(<ProjectDetailPanel project={project} onClose={vi.fn()} />)
    expect(screen.getByText('An Claeys')).toBeInTheDocument()
    expect(screen.getByText('an@test.be')).toBeInTheDocument()
    expect(screen.getByText('0477 00 00 00')).toBeInTheDocument()
  })

  it('shows seller notes', () => {
    render(<ProjectDetailPanel project={project} onClose={vi.fn()} />)
    expect(screen.getByText('Let op dakvenster')).toBeInTheDocument()
  })

  it('shows 3 email template buttons', () => {
    render(<ProjectDetailPanel project={project} onClose={vi.fn()} />)
    expect(screen.getByText(/Afspraak inplannen/i)).toBeInTheDocument()
    expect(screen.getByText(/Verslag doorsturen/i)).toBeInTheDocument()
    expect(screen.getByText(/Wijzigingen bespreken/i)).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<ProjectDetailPanel project={project} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /sluiten/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows "Opmeting starten" link for CAT2 with no survey', () => {
    render(<ProjectDetailPanel project={{ ...project, survey: null }} onClose={vi.fn()} />)
    expect(screen.getByText('▶ Opmeting starten')).toBeInTheDocument()
  })

  it('shows "Opmeting hervatten" for CAT2 with draft survey', () => {
    render(<ProjectDetailPanel project={{ ...project, survey: { id: 's1', isDraft: true } }} onClose={vi.fn()} />)
    expect(screen.getByText('✏ Opmeting hervatten')).toBeInTheDocument()
  })

  it('shows "Rapport bekijken" for CAT2 with completed survey', () => {
    render(<ProjectDetailPanel project={{ ...project, survey: { id: 's1', isDraft: false } }} onClose={vi.fn()} />)
    expect(screen.getByText(/Rapport bekijken/i)).toBeInTheDocument()
  })

  it('does not show survey section for CAT1', () => {
    render(<ProjectDetailPanel project={{ ...project, category: 'CAT1', survey: null }} onClose={vi.fn()} />)
    expect(screen.queryByText('▶ Opmeting starten')).not.toBeInTheDocument()
  })
})
