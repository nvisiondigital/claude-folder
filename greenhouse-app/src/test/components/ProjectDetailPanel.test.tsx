import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjectDetailPanel from '@/components/kanban/ProjectDetailPanel'
import type { Project } from '@prisma/client'

const project: Project = {
  id: '1', clientName: 'An Claeys', email: 'an@test.be',
  phone: '0477 00 00 00', street: 'Dorpstraat 5', postalCode: '2000',
  city: 'Antwerpen', category: 'CAT2', panelCount: 16,
  roofType: 'Hellend', description: null, sellerNotes: 'Let op dakvenster',
  appointmentDate: null, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
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
})
