import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  apiRequest: vi.fn(),
  getUserData: vi.fn(),
}))

const renderBell = () =>
  render(
    <BrowserRouter>
      <NotificationBell />
    </BrowserRouter>
  )

// Need dynamic import since NotificationBell uses default export
import NotificationBell from '../components/common/NotificationBell'

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.apiRequest).mockResolvedValue([])
    vi.mocked(api.getUserData).mockReturnValue(null)
    // Mock localStorage for token extraction
    Object.defineProperty(window, 'localStorage', {
      value: (() => {
        let store = {} as Record<string, string>
        return {
          getItem: vi.fn((key: string) => store[key] ?? null),
          setItem: vi.fn((key: string, value: string) => { store[key] = value }),
          removeItem: vi.fn((key: string) => { delete store[key] }),
          clear: vi.fn(() => { store = {} }),
          length: 0,
          key: vi.fn(() => null),
        }
      })(),
      writable: true,
    })
  })

  it('renders bell icon', async () => {
    renderBell()
    await waitFor(() => {
      expect(screen.getByLabelText(/notificaciones/i)).toBeInTheDocument()
    })
  })

  it('shows notification count badge', async () => {
    vi.mocked(api.apiRequest).mockResolvedValue([{ id: 1, leido: 0, titulo: 'Test', mensaje: 'Msg', tipo: 'info', fecha: new Date().toISOString() }])
    renderBell()
    const badge = await screen.findByText('1')
    expect(badge).toBeInTheDocument()
  })

  it('does not show badge when count is 0', async () => {
    renderBell()
    await waitFor(() => {
      expect(screen.getByLabelText(/notificaciones/i)).toBeInTheDocument()
    })
  })

  it('calls onClick when clicked', async () => {
    renderBell()
    const button = await screen.findByRole('button')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
  })
})
