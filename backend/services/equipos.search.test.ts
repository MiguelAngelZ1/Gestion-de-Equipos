import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
  beginTransaction: vi.fn(),
  commit: vi.fn(),
  rollback: vi.fn(),
}));
vi.mock('../db/database', () => ({ default: mockDb, ...mockDb }));
vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }, info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

// @ts-ignore
import equiposService from './equipos.service';

const mockedDb = mockDb as unknown as { get: ReturnType<typeof vi.fn>; all: ReturnType<typeof vi.fn> };

describe('EquiposService.getAllEquipos - búsqueda paginada server-side', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna paginación con total y totalPages', async () => {
    mockedDb.get = vi.fn().mockResolvedValue({ total: 53 });
    mockedDb.all = vi.fn()
      .mockResolvedValueOnce([{ id: 'eq1', ine: 'INE1', categoria_id: 1, estado_id: 1, ubicacion_id: 1, responsable_id: 1, is_deleted: 0, tipo: 'PC', estado: 'OPERATIVO', color_hex: '#00FF00', ubicacion_nombre: 'LAB', ubicacion_desc: 'Lab', responsable_nombre: 'Juan', responsable_apellido: 'Perez', responsable_grado: 'Sgto', responsable_grado_id: 1 }])
      .mockResolvedValueOnce([]);

    const res = await equiposService.getAllEquipos({ page: 1, limit: 50, offset: 0 });
    expect(res.pagination).toEqual({ page: 1, limit: 50, total: 53, totalPages: 2 });
    expect(res.data).toHaveLength(1);
  });

  it('busca por q en especificaciones clave/valor via EXISTS (REGLA 15)', async () => {
    mockedDb.get = vi.fn().mockResolvedValue({ total: 1 });
    mockedDb.all = vi.fn()
      .mockResolvedValueOnce([{ id: 'eq1', ine: 'INE1', serie: 'S1', tipo: 'PC', estado: 'OPERATIVO', ubicacion_nombre: 'LAB', ubicacion_desc: null, responsable_nombre: 'A', responsable_apellido: 'B', responsable_grado: null, responsable_grado_id: null }])
      .mockResolvedValueOnce([{ id: 1, clave: 'IP', valor: '192.168.1.10', equipo_id: 'eq1' }]);

    const res = await equiposService.getAllEquipos({ q: '192.168.1.10', page: 1, limit: 50, offset: 0 });
    const whereCall = (mockedDb.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(whereCall).toContain('EXISTS');
    expect(whereCall).toContain('especificaciones esp');
    expect(res.data[0].especificaciones[0].valor).toBe('192.168.1.10');
    const params = (mockedDb.get as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(params.filter(p => p === '%192.168.1.10%')).toHaveLength(12);
  });

  it('q vacío no agrega filtro y no rompe count', async () => {
    mockedDb.get = vi.fn().mockResolvedValue({ total: 10 });
    mockedDb.all = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const res = await equiposService.getAllEquipos({ q: '   ', page: 1, limit: 50, offset: 0 });
    const whereCall = (mockedDb.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(whereCall).not.toContain('LOWER(e.ine) LIKE');
    expect(res.pagination.total).toBe(10);
  });

  it('filtra por estado/ubicacion/categoria con AND', async () => {
    mockedDb.get = vi.fn().mockResolvedValue({ total: 2 });
    mockedDb.all = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await equiposService.getAllEquipos({ estado: 'OPERATIVO', ubicacion: 'LAB', categoria: 'PC', page: 1, limit: 50, offset: 0 });
    const whereCall = (mockedDb.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(whereCall).toContain('es.nombre = ?');
    expect(whereCall).toContain('u.nombre = ?');
    expect(whereCall).toContain('gc.nombre = ?');
  });

  it('offset/limit se pasan al final de params', async () => {
    mockedDb.get = vi.fn().mockResolvedValue({ total: 100 });
    mockedDb.all = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await equiposService.getAllEquipos({ q: 'test', page: 2, limit: 10, offset: 10 });
    const allParams = (mockedDb.all as ReturnType<typeof vi.fn>).mock.calls[0][1] as unknown[];
    expect(allParams.slice(-2)).toEqual([10, 10]);
  });

  it('busca case-insensitive en ine/nne/serie y grado', async () => {
    mockedDb.get = vi.fn().mockResolvedValue({ total: 1 });
    mockedDb.all = vi.fn().mockResolvedValueOnce([{ id: 'eq1', ine: 'ABC', tipo: 'X', estado: 'Y', ubicacion_nombre: 'Z', ubicacion_desc: null, responsable_nombre: 'A', responsable_apellido: 'B', responsable_grado: 'Sgto', responsable_grado_id: 1 }]).mockResolvedValueOnce([]);
    await equiposService.getAllEquipos({ q: 'abc', page: 1, limit: 50, offset: 0 });
    const whereCall = (mockedDb.get as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(whereCall).toContain('LOWER(e.ine) LIKE LOWER(?)');
    expect(whereCall).toContain('LOWER(r.grado) LIKE LOWER(?)');
  });
});
