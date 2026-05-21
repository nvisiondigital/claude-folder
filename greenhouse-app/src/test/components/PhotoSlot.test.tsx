// src/test/components/PhotoSlot.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PhotoSlot from '@/components/survey/PhotoSlot'
import type { UploadedPhoto } from '@/lib/survey'

const base = {
  slotIndex: 1,
  slotName: 'Parkeergelegenheid',
  photos: [] as UploadedPhoto[],
  uploading: false,
  onUpload: vi.fn(),
  onDelete: vi.fn(),
}

describe('PhotoSlot', () => {
  it('renders padded slot number and name', () => {
    render(<PhotoSlot {...base} />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('Parkeergelegenheid')).toBeInTheDocument()
  })

  it('shows camera button', () => {
    render(<PhotoSlot {...base} />)
    expect(screen.getByLabelText('Foto toevoegen voor Parkeergelegenheid')).toBeInTheDocument()
  })

  it('shows add-more button only when photos already exist', () => {
    const withPhoto: UploadedPhoto[] = [
      { id: 'p1', slotIndex: 1, slotName: 'Parkeergelegenheid', fileUrl: '/test.jpg', order: 0 },
    ]
    const { rerender } = render(<PhotoSlot {...base} />)
    expect(screen.queryByLabelText('Nog een foto toevoegen voor Parkeergelegenheid')).not.toBeInTheDocument()

    rerender(<PhotoSlot {...base} photos={withPhoto} />)
    expect(screen.getByLabelText('Nog een foto toevoegen voor Parkeergelegenheid')).toBeInTheDocument()
  })

  it('renders one delete button per photo', () => {
    const photos: UploadedPhoto[] = [
      { id: 'p1', slotIndex: 1, slotName: 'Parkeergelegenheid', fileUrl: '/a.jpg', order: 0 },
      { id: 'p2', slotIndex: 1, slotName: 'Parkeergelegenheid', fileUrl: '/b.jpg', order: 1 },
    ]
    render(<PhotoSlot {...base} photos={photos} />)
    expect(screen.getAllByLabelText('Foto verwijderen')).toHaveLength(2)
  })

  it('disables buttons while uploading', () => {
    render(<PhotoSlot {...base} uploading={true} />)
    expect(screen.getByLabelText('Foto toevoegen voor Parkeergelegenheid')).toBeDisabled()
  })
})
