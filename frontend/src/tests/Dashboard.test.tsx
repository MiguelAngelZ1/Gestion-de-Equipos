import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../context/ToastContext'
import { AuthProvider } from '../context/AuthContext'

vi.mock('../services/api', () => ({
  apiRequest: vi.fn(),
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

vi.mock('../components/componentes/LocationChart', () => ({
  default: ({ chartData, loading, total }) => (
    <div data-testid="location-chart">
      {loading ? 'Loading chart...' : `Chart: ${total} equipos`}
    </div>
  ),
}))

import { apiRequest } from '../services/api'
import Dashboard from '../pages/Dashboard'

const mockDashboardData = {
  total: 150,
  stats: [
    { name: 'En Servicio', value: 80 },
    { name: 'Fuera de Servicio', value: 20 },
    { name: 'Mantenimiento', value: 30 },
    { name: 'Préstamo', value: 20 },
  ],
  criticalEquipos: [],
  alerts: { lowStock: [] },
  locations: [{ name: 'Oficina Central', value: 50 }],
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    localStorage.setItem(
      'equipos_user_data',
      JSON.stringify({ id: 1, rol: 'admin', usuario: 'testadmin' })
    )
  })

  it('renders loading state initially', () => {
    (apiRequest as any).mockImplementation(() => new Promise(() => {}))

    renderDashboard()

    expect(screen.getByText(/Sincronizando/i)).toBeInTheDocument()
  })

  it('renders stat cards after data loads', async () => {
    (apiRequest as any).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/auth/me') {
        return { success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } }
      }
      return mockDashboardData
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
    })

    expect(screen.getByText('Total de Equipos')).toBeInTheDocument()
    expect(screen.getByText('En Servicio')).toBeInTheDocument()
    expect(screen.getByText('Fuera de Servicio')).toBeInTheDocument()
    expect(screen.getByText('En Mantenimiento')).toBeInTheDocument()
    expect(screen.getByText('En Préstamo')).toBeInTheDocument()
  })

  it('shows healthy system message when no critical equipos', async () => {
    (apiRequest as any).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/auth/me') {
        return { success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } }
      }
      return mockDashboardData
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Sistema Saludable')).toBeInTheDocument()
    })
  })

  it('shows critical equipos list when present', async () => {
    const dataWithCritical = {
      ...mockDashboardData,
      criticalEquipos: [
        { id: 1, ine: 'EQ-001', categoria: 'PC', estado: 'Falla Crítica', ubicacion: 'Oficina A', responsable_actual: 'Juan', falla: 'No enciende', color_hex: '#ef4444' },
        { id: 2, ine: 'EQ-002', categoria: 'LAPTOP', estado: 'Dañado', ubicacion: 'Oficina B', responsable_actual: 'Maria', falla: 'Pantalla rota', color_hex: '#ef4444' },
      ],
    }
    ;(apiRequest as any).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/auth/me') {
        return { success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } }
      }
      return dataWithCritical
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('EQ-001')).toBeInTheDocument()
    })
    expect(screen.getByText('EQ-002')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText((c) => c.includes('No enciende'))).toBeInTheDocument()
    })
    expect(screen.getByText((c) => c.includes('Pantalla rota'))).toBeInTheDocument()
  })

  it('shows low stock components', async () => {
    const dataWithLowStock = {
      ...mockDashboardData,
      criticalEquipos: [],
      alerts: {
        lowStock: [
          { id: 1, nombre: 'Mouse USB', cantidad: 2 },
          { id: 2, nombre: 'Teclado', cantidad: 0 },
        ],
      },
    }
    ;(apiRequest as any).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/auth/me') {
        return { success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } }
      }
      return dataWithLowStock
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('Mouse USB')).toBeInTheDocument()
    })
    expect(screen.getByText('Teclado')).toBeInTheDocument()
    expect(screen.getAllByText('Stock Crítico')).toHaveLength(2)
  })

  it('shows error toast when API fails', async () => {
    (apiRequest as any).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/auth/me') {
        return { success: true, user: { id: 1, rol: 'admin', usuario: 'testadmin' } }
      }
      throw new Error('Network error')
    })

    renderDashboard()

    await waitFor(() => {
      expect(screen.getByText('No se pudo cargar el resumen del sistema.')).toBeInTheDocument()
    })
  })

  it('skips fetch for non-admin users', async () => {
    localStorage.setItem(
      'equipos_user_data',
      JSON.stringify({ id: 2, rol: 'user', usuario: 'testuser' })
    )
    ;(apiRequest as any).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/auth/me') {
        return { success: true, user: { id: 2, rol: 'user', usuario: 'testuser' } }
      }
      return mockDashboardData
    })

    renderDashboard()

    await waitFor(() => {
      const summaryCalls = (apiRequest as any).mock.calls.filter(
        (call: string[]) => call[0] === '/dashboard/summary'
      )
      expect(summaryCalls).toHaveLength(0)
    })
  })
})
