import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn(),
  beginTransaction: vi.fn().mockResolvedValue(undefined),
  commit: vi.fn().mockResolvedValue(undefined),
  rollback: vi.fn().mockResolvedValue(undefined),
  begin: vi.fn(),
}));
vi.mock('../db/database', () => ({ default: mockDb, ...mockDb }));
vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }, info: vi.fn(), error: vi.fn(), warn: vi.fn() }));

// @ts-ignore
import equiposService from './equipos.service';

describe('EquiposService.createOrUpdateEquipo - validación serie única / NNE libre', () => {
  beforeEach(() => vi.clearAllMocks());

  const baseData = {
    ine: 'INE-001',
    nne: 'NNE-001',
    serie: 'SERIE-001',
    categoria_id: '1',
    estado_id: '1',
    ubicacion_id: '1',
  };

  it('rechaza serie duplicada en create (targetId null)', async () => {
    mockDb.get.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM equipos WHERE serie')) return { ine: 'INE-EXIST' };
      return null;
    });
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });

    await expect(equiposService.createOrUpdateEquipo(baseData, null)).rejects.toThrow('ya se encuentra registrado');
    expect(mockDb.rollback).toHaveBeenCalled();
  });

  it('rechaza serie duplicada en update con id distinto', async () => {
    mockDb.get.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM equipos WHERE serie')) return { ine: 'INE-EXIST' };
      return null;
    });
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });

    await expect(equiposService.createOrUpdateEquipo({ ...baseData, serie: 'DUPE' }, 'eq_2')).rejects.toThrow('ya se encuentra registrado');
  });

  it('permite serie duplicada si es el mismo registro (update mismo id)', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });

    const id = await equiposService.createOrUpdateEquipo(baseData, 'eq_1');
    expect(id).toBe('eq_1');
    expect(mockDb.commit).toHaveBeenCalled();
  });

  it('no valida serie si es "-" , " - " o vacío', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });

    for (const serie of ['-', ' - ', '']) {
      const data = { ...baseData, serie };
      const id = await equiposService.createOrUpdateEquipo(data, null);
      expect(typeof id).toBe('string');
    }
    expect(mockDb.commit).toHaveBeenCalled();
  });

  it('permite NNE duplicado (NNE libre)', async () => {
    mockDb.get.mockImplementation(async (sql: string) => {
      if (sql.includes('FROM equipos WHERE serie')) return null;
      return null;
    });
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });

    const id1 = await equiposService.createOrUpdateEquipo({ ...baseData, nne: 'SAME-NNE', serie: 'S-A' }, null);
    const id2 = await equiposService.createOrUpdateEquipo({ ...baseData, nne: 'SAME-NNE', serie: 'S-B', ine: 'INE-002' }, null);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
  });

  it('rechaza si faltan ambos NNE y serie', async () => {
    await expect(equiposService.createOrUpdateEquipo({ ...baseData, nne: '', serie: '' }, null)).rejects.toThrow('NNE o un Número de Serie');
    await expect(equiposService.createOrUpdateEquipo({ ...baseData, nne: '-', serie: '-' }, null)).rejects.toThrow('NNE o un Número de Serie');
    await expect(equiposService.createOrUpdateEquipo({ ...baseData, nne: undefined, serie: undefined } as any, null)).rejects.toThrow('NNE o un Número de Serie');
  });

  it('trimtea serie antes de validar (espacios)', async () => {
    mockDb.get.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('FROM equipos WHERE serie')) {
        expect(params[0]).toBe('SERIE-001');
        return { ine: 'X' };
      }
      return null;
    });
    await expect(equiposService.createOrUpdateEquipo({ ...baseData, serie: '  SERIE-001  ' }, null)).rejects.toThrow('ya se encuentra registrado');
  });
});
