import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock SWR mutate
vi.mock('swr', () => ({ mutate: vi.fn() }))

import AddProjectModal from '@/components/kanban/AddProjectModal'

describe('AddProjectModal', () => {
  it('renders all required fields', () => {
    render(<AddProjectModal onClose={vi.fn()} />)
    expect(screen.getByLabelText(/naam klant/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/telefoon/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/straat/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/categorie/i)).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', () => {
    const onClose = vi.fn()
    render(<AddProjectModal onClose={onClose} />)
    fireEvent.click(screen.getByText(/annuleren/i))
    expect(onClose).toHaveBeenCalled()
  })
})
