import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Login from '../pages/Login'

const { mockLogin, mockShowToast } = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockShowToast: vi.fn(),
}))

vi.mock('framer-motion', async () => {
  const React = await import('react')
  return {
    motion: new Proxy(
      {},
      {
        get: (_, tag) => {
          return function Motion(props: any) {
            const {
              initial, animate, exit, transition,
              whileHover, whileTap, whileFocus, whileInView,
              layout, layoutId, onAnimationStart, onAnimationComplete,
              variants, children, ...rest
            } = props
            return React.createElement(tag as string, rest, children)
          }
        },
      }
    ),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  }
})

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isAuthenticated: false,
    user: null,
    loading: false,
  }),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

vi.mock('../assets/LogoIMPERIO.webp', () => ({ default: 'test-file-stub' }))

describe('Login', () => {
  beforeEach(() => {
    mockLogin.mockReset()
    mockShowToast.mockReset()
  })

  const renderLogin = () => {
    return render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )
  }

  it('renders login form', () => {
    renderLogin()
    expect(screen.getByText('Bienvenido')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Usuario')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Contraseña')).toBeInTheDocument()
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument()
  })

  it('does not call login when fields are empty', () => {
    renderLogin()
    fireEvent.click(screen.getByText('Iniciar Sesión'))
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('calls login with credentials on submit', async () => {
    mockLogin.mockResolvedValue({ success: true })
    renderLogin()

    fireEvent.change(screen.getByPlaceholderText('Usuario'), {
      target: { value: 'admin' },
    })
    fireEvent.change(screen.getByPlaceholderText('Contraseña'), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByText('Iniciar Sesión'))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        usuario: 'admin',
        password: 'password',
      })
    })
  })
})
