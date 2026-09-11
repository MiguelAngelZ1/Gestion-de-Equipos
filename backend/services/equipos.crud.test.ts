import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn().mockResolvedValue({ changes: 1, lastID: 1 }),
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../db/database', () => ({ default: mockDb, ...mockDb }));
vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn() }, info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn() }));
const mockBcrypt = vi.hoisted(() => ({ hash: vi.fn().mockResolvedValue('hashed') }));
vi.mock('bcryptjs', () => ({ default: mockBcrypt, ...mockBcrypt }));

// @ts-ignore
import equiposService from './equipos.service';

describe('EquiposService CRUD restante - cobertura 80%', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getEquipoById retorna equipo con especificaciones deduplicadas case-insensitive', async () => {
    mockDb.get.mockResolvedValue({ id: 'eq1', ine: 'INE1', categoria_id: 1, estado_id: 1, ubicacion_id: 1, responsable_id: 1, is_deleted: 0, tipo: 'PC', estado: 'OPERATIVO', ubicacion_nombre: 'LAB', ubicacion_desc: null, responsable_nombre: 'A', responsable_apellido: 'B', responsable_grado: null });
    mockDb.all.mockResolvedValue([
      { id: 1, clave: 'IP', valor: '10.0.0.1' },
      { id: 2, clave: 'ip', valor: '10.0.0.1-dup' },
      { id: 3, clave: 'MAC', valor: 'AA:BB' },
    ]);
    const e = await equiposService.getEquipoById('eq1');
    expect(e.id).toBe('eq1');
    expect(e.especificaciones).toHaveLength(2);
    expect(e.especificaciones.map((s: any) => s.clave)).toEqual(['IP', 'MAC']);
  });

  it('getEquipoById retorna null si no existe', async () => {
    mockDb.get.mockResolvedValue(null);
    expect(await equiposService.getEquipoById('nope')).toBeNull();
  });

  it('deleteEquipo soft delete + historial', async () => {
    mockDb.run.mockResolvedValue({ changes: 1 });
    const ok = await equiposService.deleteEquipo('eq1');
    expect(ok).toBe(true);
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE equipos SET is_deleted'), expect.any(Array));
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO historial_personal'), expect.any(Array));
  });

  it('deleteBulkEquipos con array vacio retorna 0 sin query', async () => {
    const r = await equiposService.deleteBulkEquipos([]);
    expect(r.count).toBe(0);
    expect(mockDb.run).not.toHaveBeenCalled();
  });

  it('deleteBulkEquipos actualiza multiples', async () => {
    mockDb.run.mockResolvedValue({ changes: 2 });
    const r = await equiposService.deleteBulkEquipos(['a', 'b']);
    expect(r.count).toBe(2);
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('WHERE id IN'), expect.arrayContaining([1, 'a', 'b']));
  });

  it('createOrUpdate valida ine/categoria/estado/ubicacion obligatorios', async () => {
    await expect(equiposService.createOrUpdateEquipo({ ine: '', categoria_id: '1', estado_id: '1', ubicacion_id: '1', nne: 'N', serie: 'S' } as any, null)).rejects.toThrow('obligatorios');
  });

  it('createOrUpdate dedup especificaciones por clave+valor case-insensitive', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });
    const id = await equiposService.createOrUpdateEquipo({
      ine: 'INE1', categoria_id: '1', estado_id: '1', ubicacion_id: '1', nne: 'N', serie: 'S-NEW',
      especificaciones: [
        { clave: 'IP', valor: '10.0.0.1' },
        { clave: 'ip', valor: '10.0.0.1' },
        { clave: 'IP', valor: '10.0.0.1 ' },
        { clave: 'RAM', valor: '16GB' },
      ]
    }, null);
    expect(typeof id).toBe('string');
    const insertCalls = mockDb.run.mock.calls.filter((c: any) => String(c[0]).includes('INSERT INTO especificaciones'));
    expect(insertCalls).toHaveLength(2);
  });
});
