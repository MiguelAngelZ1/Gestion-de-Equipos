import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Select from '../components/common/Select'

const options = [
  { value: '1', label: 'Option 1' },
  { value: '2', label: 'Option 2' },
  { value: '3', label: 'Option 3' },
]

describe('Select', () => {
  it('renders all options', () => {
    render(<Select value="" onChange={() => {}} options={options} />)
    expect(screen.getByText('Option 1')).toBeInTheDocument()
    expect(screen.getByText('Option 2')).toBeInTheDocument()
    expect(screen.getByText('Option 3')).toBeInTheDocument()
  })

  it('shows default option (placeholder)', () => {
    render(<Select value="" onChange={() => {}} options={options} placeholder="Seleccione..." />)
    expect(screen.getByText('Seleccione...')).toBeInTheDocument()
  })

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn()
    render(<Select value="" onChange={onChange} options={options} />)
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '2' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('displays current value', () => {
    render(<Select value="2" onChange={() => {}} options={options} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('2')
  })

  it('renders label when provided', () => {
    render(<Select value="" onChange={() => {}} options={options} label="Category" />)
    expect(screen.getByText('Category')).toBeInTheDocument()
  })

  it('renders error message when provided', () => {
    render(<Select value="" onChange={() => {}} options={options} error="Campo requerido" />)
    expect(screen.getByText('Campo requerido')).toBeInTheDocument()
  })
})
