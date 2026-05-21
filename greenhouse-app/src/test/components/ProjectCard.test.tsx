import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ProjectCard from '@/components/kanban/ProjectCard'
import type { ProjectWithSurvey } from '@/lib/types'

const baseProject: ProjectWithSurvey = {
  id: '1',
  clientName: 'Jan Janssen',
  email: 'jan@test.be',
  phone: '0499000000',
  street: 'Teststraat 1',
  postalCode: '9000',
  city: 'Gent',
  category: 'CAT2',
  panelCount: 12,
  roofType: 'Hellend dak',
  description: null,
  sellerNotes: null,
  appointmentDate: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
  survey: null,
}

describe('ProjectCard', () => {
  it('renders client name and city', () => {
    render(<ProjectCard project={baseProject} onSelect={vi.fn()} />)
    expect(screen.getByText('Jan Janssen')).toBeInTheDocument()
    expect(screen.getByText(/Gent/)).toBeInTheDocument()
  })

  it('shows "Opmeting starten" button for CAT2', () => {
    render(<ProjectCard project={baseProject} onSelect={vi.fn()} />)
    expect(screen.getByText(/Opmeting starten/i)).toBeInTheDocument()
  })

  it('shows "Stuur naar dispatch" button for CAT3', () => {
    render(<ProjectCard project={{ ...baseProject, category: 'CAT3' }} onSelect={vi.fn()} />)
    expect(screen.getByText(/Stuur naar dispatch/i)).toBeInTheDocument()
  })

  it('shows no action button for CAT1', () => {
    render(<ProjectCard project={{ ...baseProject, category: 'CAT1' }} onSelect={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onSelect when card is clicked', async () => {
    const onSelect = vi.fn()
    render(<ProjectCard project={baseProject} onSelect={onSelect} />)
    screen.getByText('Jan Janssen').click()
    expect(onSelect).toHaveBeenCalledWith(baseProject)
  })
})
