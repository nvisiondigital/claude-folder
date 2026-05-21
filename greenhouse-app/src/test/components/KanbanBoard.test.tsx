// src/test/components/KanbanBoard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('swr', () => ({
  default: vi.fn(),
}))

import useSWR from 'swr'
import KanbanBoard from '@/components/kanban/KanbanBoard'

const mockOnSelect = vi.fn()
const mockOnAdd    = vi.fn()

const projects = [
  {
    id: 'p1', clientName: 'CAT1 Project', category: 'CAT1', city: 'Gent',
    email: '', phone: '', street: '', postalCode: '', status: 'ACTIVE',
    survey: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    roofType: null, panelCount: null, description: null, sellerNotes: null, appointmentDate: null,
  },
  {
    id: 'p2', clientName: 'CAT2 Normal', category: 'CAT2', city: 'Gent',
    email: '', phone: '', street: '', postalCode: '', status: 'ACTIVE',
    survey: { id: 's2', isDraft: true, deliveredAt: null },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    roofType: null, panelCount: null, description: null, sellerNotes: null, appointmentDate: null,
  },
  {
    id: 'p3', clientName: 'CAT2 Delivered', category: 'CAT2', city: 'Antwerpen',
    email: '', phone: '', street: '', postalCode: '', status: 'ACTIVE',
    survey: { id: 's3', isDraft: false, deliveredAt: '2026-05-21T10:00:00Z' },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    roofType: null, panelCount: null, description: null, sellerNotes: null, appointmentDate: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  ;(useSWR as ReturnType<typeof vi.fn>).mockReturnValue({ data: projects, isLoading: false, error: null })
})

describe('KanbanBoard', () => {
  it('renders four column headers', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    expect(screen.getByText(/CAT 1 — Klaar voor inplanning/i)).toBeInTheDocument()
    expect(screen.getByText(/CAT 2 — Opmeting intern/i)).toBeInTheDocument()
    expect(screen.getByText(/CAT 3 — Extern/i)).toBeInTheDocument()
    expect(screen.getByText(/Opmeting gedaan/i)).toBeInTheDocument()
  })

  it('shows non-delivered CAT2 project in list', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    expect(screen.getByText('CAT2 Normal')).toBeInTheDocument()
  })

  it('shows delivered CAT2 project in list', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    expect(screen.getByText('CAT2 Delivered')).toBeInTheDocument()
  })

  it('shows project count badges', () => {
    render(<KanbanBoard onSelect={mockOnSelect} onAdd={mockOnAdd} />)
    const badges = screen.getAllByText(/^[0-9]+$/)
    const counts = badges.map(b => b.textContent)
    expect(counts).toContain('1')
  })
})
