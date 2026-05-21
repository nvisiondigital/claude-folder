// src/test/components/MeasurementFields.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MeasurementFields from '@/components/survey/MeasurementFields'
import { EMPTY_MEASUREMENTS } from '@/lib/survey'

describe('MeasurementFields', () => {
  it('renders all section labels', () => {
    render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={vi.fn()} />)
    expect(screen.getByText('Netspanning')).toBeInTheDocument()
    expect(screen.getByText('Hoofdzekering')).toBeInTheDocument()
    expect(screen.getByText('Aarding ok?')).toBeInTheDocument()
    expect(screen.getByText('Elektriciteit ok?')).toBeInTheDocument()
    expect(screen.getByText('Samenvatting opmeting')).toBeInTheDocument()
  })

  it('calls onChange with updated netspanning', () => {
    const onChange = vi.fn()
    render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={onChange} />)
    // First textbox is Netspanning
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[0], { target: { value: '230V' } })
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0][0].netspanning).toBe('230V')
  })

  it('shows internet type field only when internet is true', () => {
    const { rerender } = render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={vi.fn()} />)
    expect(screen.queryByText('Type internet')).not.toBeInTheDocument()

    rerender(<MeasurementFields values={{ ...EMPTY_MEASUREMENTS, internet: true }} onChange={vi.fn()} />)
    expect(screen.getByText('Type internet')).toBeInTheDocument()
  })

  it('calls onChange with correct bool when Ja is clicked for aardingOk', () => {
    const onChange = vi.fn()
    render(<MeasurementFields values={EMPTY_MEASUREMENTS} onChange={onChange} />)
    // First "Ja" button is for aardingOk
    const jaBtns = screen.getAllByText('Ja')
    fireEvent.click(jaBtns[0])
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls[0][0].aardingOk).toBe(true)
  })
})
