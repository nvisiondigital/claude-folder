// src/test/components/SurveyForm.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SurveyForm from '@/components/survey/SurveyForm'
import { EMPTY_MEASUREMENTS } from '@/lib/survey'
import type { UploadedPhoto } from '@/lib/survey'

const base = {
  projectId: 'proj1',
  projectName: 'Test Klant',
  initialPhotos: [] as UploadedPhoto[],
  initialMeasurements: EMPTY_MEASUREMENTS,
  isDraft: true,
  onSave: vi.fn(),
  onBack: vi.fn(),
}

describe('SurveyForm', () => {
  it('renders all 4 section headings in section nav', () => {
    render(<SurveyForm {...base} />)
    expect(screen.getAllByText('Elektrisch').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Indien van toepassing').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Te plaatsen installatie').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Daksituatie (drone)').length).toBeGreaterThan(0)
  })

  it('shows Concept badge when isDraft is true', () => {
    render(<SurveyForm {...base} isDraft={true} />)
    expect(screen.getByText('Concept')).toBeInTheDocument()
  })

  it('hides Concept badge when isDraft is false', () => {
    render(<SurveyForm {...base} isDraft={false} />)
    expect(screen.queryByText('Concept')).not.toBeInTheDocument()
  })

  it('disables finalize button when no drone photos present', () => {
    render(<SurveyForm {...base} />)
    expect(screen.getByText('Opmeting afronden')).toBeDisabled()
  })

  it('enables finalize button when a drone photo (slot 19-23) exists', () => {
    const dronePhoto: UploadedPhoto = {
      id: 'p1', slotIndex: 19, slotName: "Foto's dakvlakken", fileUrl: '/x.jpg', order: 0,
    }
    render(<SurveyForm {...base} initialPhotos={[dronePhoto]} />)
    expect(screen.getByText('Opmeting afronden')).not.toBeDisabled()
  })

  it('renders project name in the header', () => {
    render(<SurveyForm {...base} projectName="Vermeersch" />)
    expect(screen.getByText('Vermeersch')).toBeInTheDocument()
  })
})
