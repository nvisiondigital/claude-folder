import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/app/kanban',
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}))

import Sidebar from '@/components/ui/Sidebar'

describe('Sidebar', () => {
  it('renders all navigation items', () => {
    render(<Sidebar />)
    expect(screen.getByText('Mijn kanban')).toBeInTheDocument()
    expect(screen.getByText('Dispatch')).toBeInTheDocument()
    expect(screen.getByText('Agenda')).toBeInTheDocument()
  })

  it('marks the active route with green text class', () => {
    render(<Sidebar />)
    const activeLink = screen.getByText('Mijn kanban').closest('a')
    expect(activeLink).toHaveClass('text-ghs-green')
  })
})
