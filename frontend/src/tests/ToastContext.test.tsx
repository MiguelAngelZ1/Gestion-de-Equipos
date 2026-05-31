import React from 'react'
import { render, screen, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from '../context/ToastContext'

function TestConsumer() {
  const { showToast } = useToast()
  return (
    <div>
      <button data-testid="show-success" onClick={() => showToast('Success', 'Operation completed', 'success')}>
        Show Success
      </button>
      <button data-testid="show-error" onClick={() => showToast('Error', 'Something failed', 'error')}>
        Show Error
      </button>
      <button data-testid="show-warning" onClick={() => showToast('Warning', 'Be careful', 'warning')}>
        Show Warning
      </button>
      <button data-testid="show-info" onClick={() => showToast('Info', 'Just so you know', 'info')}>
        Show Info
      </button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>
  )
}

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders children without crashing', () => {
    renderWithProvider()
    expect(screen.getByTestId('show-success')).toBeInTheDocument()
  })

  it('shows success toast and auto-dismisses', async () => {
    renderWithProvider()

    await act(async () => {
      fireEvent.click(screen.getByTestId('show-success'))
    })

    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Operation completed')).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(4500)
    })

    expect(screen.queryByText('Success')).not.toBeInTheDocument()
  })

  it('shows error toast', async () => {
    renderWithProvider()

    await act(async () => {
      fireEvent.click(screen.getByTestId('show-error'))
    })

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something failed')).toBeInTheDocument()
  })

  it('shows warning toast', async () => {
    renderWithProvider()

    await act(async () => {
      fireEvent.click(screen.getByTestId('show-warning'))
    })

    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(screen.getByText('Be careful')).toBeInTheDocument()
  })

  it('shows info toast', async () => {
    renderWithProvider()

    await act(async () => {
      fireEvent.click(screen.getByTestId('show-info'))
    })

    expect(screen.getByText('Info')).toBeInTheDocument()
    expect(screen.getByText('Just so you know')).toBeInTheDocument()
  })
})
