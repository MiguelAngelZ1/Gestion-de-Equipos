import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.hoisted(() => { process.env.JWT_SECRET = 'test-secret'; });

const mockDb = vi.hoisted(() => ({
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn().mockResolvedValue({ lastID: 1, changes: 1 }),
}));
vi.mock('../db/database', () => ({ default: mockDb, ...mockDb }));
const mockLogger = vi.hoisted(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn() }));
vi.mock('../utils/logger', () => ({ default: mockLogger, ...mockLogger }));
const mockBcrypt = vi.hoisted(() => ({ hash: vi.fn().mockResolvedValue('hashed'), compare: vi.fn() }));
vi.mock('bcryptjs', () => ({ default: mockBcrypt, ...mockBcrypt }));

// @ts-ignore
import usuariosService from './usuarios.service';
// @ts-ignore
import { requirePermission } from '../middleware/auth.middleware';

describe('UsuariosService - DEFAULT_USER_PERMISOS (RBAC)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asigna DEFAULT_USER_PERMISOS a USER sin permisos_json', async () => {
    mockDb.get.mockResolvedValue(null);
    mockDb.run.mockResolvedValue({ lastID: 1, changes: 1 });
    await usuariosService.createUsuario({ usuario: 'testuser', email: 't@t.com', password: 'pass123', rol: 'USER' });
    const args = mockDb.run.mock.calls[0][1] as any[];
    const permisos = JSON.parse(args[4]);
    expect(permisos).toContain('equipos:ver');
    expect(permisos).toContain('config:ver');
    expect(permisos.length).toBe(7);
  });

  it('asigna [] a ADMIN sin permisos_json', async () => {
    mockDb.get.mockResolvedValue(null);
    await usuariosService.createUsuario({ usuario: 'admin1', email: 'a@a.com', password: 'pass123', rol: 'ADMIN' });
    const permisos = JSON.parse(mockDb.run.mock.calls[0][1][4]);
    expect(permisos).toEqual([]);
  });

  it('respeta permisos_json explicito incluso para USER', async () => {
    mockDb.get.mockResolvedValue(null);
    await usuariosService.createUsuario({ usuario: 'u2', email: 'u2@u.com', password: 'pass123', rol: 'USER', permisos_json: ['custom:perm'] });
    const permisos = JSON.parse(mockDb.run.mock.calls[0][1][4]);
    expect(permisos).toEqual(['custom:perm']);
  });

  it('rol case-insensitive: admin lower case es ADMIN', async () => {
    mockDb.get.mockResolvedValue(null);
    await usuariosService.createUsuario({ usuario: 'u3', email: 'u3@u.com', password: 'pass123', rol: 'admin' });
    const args = mockDb.run.mock.calls[0][1] as any[];
    expect(args[3]).toBe('ADMIN');
    expect(JSON.parse(args[4])).toEqual([]);
  });
});

describe('requirePermission - case-insensitive ADMIN bypass', () => {
  const mockRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });
  const mockNext = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('ADMIN mayuscula bypass', () => {
    const req: any = { user: { rol: 'ADMIN', permisos: [] } };
    const res: any = mockRes();
    requirePermission('equipos:ver')(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('admin minuscula bypass via toUpperCase()', () => {
    const req: any = { user: { rol: 'admin', permisos: [] } };
    const res: any = mockRes();
    requirePermission('equipos:ver')(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('USER con permiso pasa', () => {
    const req: any = { user: { rol: 'USER', permisos: ['equipos:ver'] } };
    const res: any = mockRes();
    requirePermission('equipos:ver')(req, res, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('USER sin permiso 403', () => {
    const req: any = { user: { rol: 'USER', permisos: [] } };
    const res: any = mockRes();
    requirePermission('equipos:ver')(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('sin user 401', () => {
    const req: any = {};
    const res: any = mockRes();
    requirePermission('equipos:ver')(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
