import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Toast from '../components/common/Toast'

describe('Toast', () => {
  it('renders title and message', () => {
    render(
      <Toast
        title="Test Title"
        message="Test Message"
        type="success"
        onClose={() => {}}
      />
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Message')).toBeInTheDocument()
  })

  it('renders close button and calls onClose when clicked', () => {
    const onClose = vi.fn()
    render(
      <Toast title="Test" message="Message" type="info" onClose={onClose} />
    )

    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses after timeout', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(
      <Toast title="Test" message="Message" type="info" onClose={onClose} />
    )

    act(() => {
      vi.advanceTimersByTime(4500)
    })

    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('renders an SVG icon for each type', () => {
    const types = ['success', 'error', 'warning', 'info']
    types.forEach((type) => {
      const { container } = render(
        <Toast
          title="Test"
          message="Message"
          type={type}
          onClose={() => {}}
        />
      )
      expect(container.querySelector('svg')).toBeTruthy()
    })
  })
})
