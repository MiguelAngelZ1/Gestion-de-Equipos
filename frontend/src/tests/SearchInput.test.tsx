import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SearchInput from '../components/common/SearchInput'

describe('SearchInput', () => {
  it('renders with placeholder text', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Buscar equipos..." />)
    expect(screen.getByPlaceholderText('Buscar equipos...')).toBeInTheDocument()
  })

  it('calls onChange when user types', () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new text' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('shows search icon', () => {
    const { container } = render(<SearchInput value="" onChange={() => {}} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('displays current value', () => {
    render(<SearchInput value="current value" onChange={() => {}} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    expect(input.value).toBe('current value')
  })
})
