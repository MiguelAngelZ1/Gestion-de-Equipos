import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from '../context/AuthContext'

const { mockApiRequest } = vi.hoisted(() => ({
  mockApiRequest: vi.fn(),
}))

vi.mock('../services/api', () => ({
  apiRequest: mockApiRequest,
}))

function TestConsumer() {
  const { user, isAuthenticated, loading, login, logout } = useAuth()
  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'loaded'}</div>
      <div data-testid="auth">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button data-testid="login-btn" onClick={() => login({ username: 'test', password: 'test' })}>Login</button>
      <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('starts with loading state and checks auth on mount', async () => {
    mockApiRequest.mockResolvedValue({ success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } })

    renderWithProvider()

    expect(screen.getByTestId('loading').textContent).toBe('loading')

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('authenticated')
    })
    expect(screen.getByTestId('loading').textContent).toBe('loaded')
  })

  it('handles unauthenticated state when API returns no user', async () => {
    mockApiRequest.mockResolvedValue({ success: true })

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('not-authenticated')
    })
  })

  it('handles API error gracefully', async () => {
    mockApiRequest.mockRejectedValue(new Error('Network error'))

    renderWithProvider()

    await waitFor(() => {
      expect(screen.getByTestId('auth').textContent).toBe('not-authenticated')
    })
    expect(screen.getByTestId('loading').textContent).toBe('loaded')
  })

  it('login sets user and isAuthenticated', async () => {
    mockApiRequest.mockResolvedValue({ success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } })

    renderWithProvider()

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('loaded'))

    mockApiRequest.mockResolvedValue({ success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } })

    await act(async () => {
      fireEvent.click(screen.getByTestId('login-btn'))
    })

    expect(screen.getByTestId('auth').textContent).toBe('authenticated')
    expect(mockApiRequest).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      method: 'POST',
      body: { username: 'test', password: 'test' },
    }))
  })

  it('logout clears user and isAuthenticated', async () => {
    mockApiRequest.mockResolvedValue({ success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } })

    renderWithProvider()

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('loaded'))

    mockApiRequest.mockResolvedValue({})

    await act(async () => {
      fireEvent.click(screen.getByTestId('logout-btn'))
    })

    expect(screen.getByTestId('auth').textContent).toBe('not-authenticated')
  })

  it('throws error when useAuth is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestConsumer />)).toThrow('useAuth debe usarse dentro de AuthProvider')

    spy.mockRestore()
  })
})
