import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';

const mockApiRequest = vi.hoisted(() => vi.fn(async (url: string) => {
  if (url.startsWith('/config/')) return [];
  if (url.startsWith('/equipos?')) {
    const u = new URL('http://x' + url);
    const q = u.searchParams.get('q') || '';
    if (q === '281') return { data: [{ id: 'eq1', ine: 'INE-281', serie: '281', tipo: 'PC', estado: 'OPERATIVO', ubicacion: 'LAB', responsable: 'Test' }], pagination: { total: 1, totalPages: 1, page: 1 } };
    return { data: [], pagination: { total: 0, totalPages: 0, page: 1 } };
  }
  return [];
}));
vi.mock('../services/api', () => ({ apiRequest: (...args: any[]) => (mockApiRequest as any)(...args) }));
vi.mock('framer-motion', () => ({ motion: { div: (props: any) => props.children }, AnimatePresence: (props: any) => props.children }));

import Equipos from './Equipos';

describe('Equipos - integración búsqueda server-side (REGLA 14/15)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('equipos_user_data', JSON.stringify({ rol: 'USER' }));
  });

  it('muestra estado inicial vacio sin fetch', async () => {
    render(<MemoryRouter><ToastProvider><Equipos /></ToastProvider></MemoryRouter>);
    expect(await screen.findByText('Busca un equipo')).toBeInTheDocument();
    expect(mockApiRequest).toHaveBeenCalledWith('/config/grados');
    expect(mockApiRequest).not.toHaveBeenCalledWith(expect.stringContaining('/equipos?'));
  });

  it('escribe búsqueda y hace fetch debounce con ?q=', async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><ToastProvider><Equipos /></ToastProvider></MemoryRouter>);
    const input = await screen.findByPlaceholderText('Busca un equipo por cualquier característica...');
    await user.type(input, '281');
    await new Promise(r => setTimeout(r, 800));
    expect(mockApiRequest).toHaveBeenCalledWith(expect.stringContaining('q=281'));
    expect(await screen.findByText('INE-281', {}, { timeout: 3000 })).toBeInTheDocument();
  });

  it('filtros no disparan fetch inicial sin búsqueda', async () => {
    render(<MemoryRouter><ToastProvider><Equipos /></ToastProvider></MemoryRouter>);
    await screen.findByText('Busca un equipo');
    expect(mockApiRequest).not.toHaveBeenCalledWith(expect.stringContaining('/equipos?'));
  });
});
