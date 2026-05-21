import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: [
      {
        id: '1', clientName: 'Piet Peeters', city: 'Brugge',
        category: 'CAT2',
        appointmentDate: new Date('2026-05-23T09:00:00').toISOString(),
      },
    ],
    isLoading: false,
  })),
}))

import UpcomingList from '@/components/agenda/UpcomingList'

describe('UpcomingList', () => {
  it('renders upcoming appointment', () => {
    render(<UpcomingList />)
    expect(screen.getByText('Piet Peeters')).toBeInTheDocument()
    expect(screen.getByText(/Brugge/)).toBeInTheDocument()
  })
})
