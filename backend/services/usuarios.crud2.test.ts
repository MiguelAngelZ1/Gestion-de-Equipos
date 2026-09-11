import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDb = vi.hoisted(() => ({
  get: vi.fn(),
  all: vi.fn(),
  run: vi.fn().mockResolvedValue({ changes: 1, lastID: 1 }),
}));
vi.mock('../db/database', () => ({ default: mockDb, ...mockDb }));
vi.mock('../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn() }, info: vi.fn(), error: vi.fn(), warn: vi.fn(), fatal: vi.fn() }));
const mockBcrypt = vi.hoisted(() => ({ hash: vi.fn().mockResolvedValue('hashed') }));
vi.mock('bcryptjs', () => ({ default: mockBcrypt, ...mockBcrypt }));

// @ts-ignore
import usuariosService from './usuarios.service';

describe('UsuariosService - CRUD restante cobertura 80% global', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getUsuarios retorna lista', async () => {
    mockDb.all.mockResolvedValue([{ id: 1, usuario: 'a' }]);
    const r = await usuariosService.getUsuarios();
    expect(r).toHaveLength(1);
    expect(mockDb.all).toHaveBeenCalledWith(expect.stringContaining('SELECT id, usuario'));
  });

  it('getUsuarioById parseInt id', async () => {
    mockDb.get.mockResolvedValue({ id: 5, usuario: 'x' });
    await usuariosService.getUsuarioById('5');
    expect(mockDb.get).toHaveBeenCalledWith(expect.any(String), [5]);
  });

  it('findByUsuarioOrEmail busca por usuario o email', async () => {
    mockDb.get.mockResolvedValue({ id: 1 });
    await usuariosService.findByUsuarioOrEmail('test@test.com');
    expect(mockDb.get).toHaveBeenCalledWith(expect.stringContaining('WHERE usuario = ? OR email = ?'), ['test@test.com', 'test@test.com']);
  });

  it('countUsuarios parseInt', async () => {
    mockDb.get.mockResolvedValue({ count: '3' });
    expect(await usuariosService.countUsuarios()).toBe(3);
  });

  it('updateUsuario sin password', async () => {
    mockDb.run.mockResolvedValue({ changes: 1 });
    await usuariosService.updateUsuario(1, { usuario: 'u', email: 'e@e.com', rol: 'USER', permisos_json: [] });
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE usuarios SET usuario'), expect.any(Array));
  });

  it('updateUsuario con password hashea', async () => {
    mockDb.run.mockResolvedValue({ changes: 1 });
    await usuariosService.updateUsuario(1, { usuario: 'u', email: 'e@e.com', password: 'newpass', rol: 'USER', permisos_json: [] });
    expect(mockBcrypt.hash).toHaveBeenCalledWith('newpass', 12);
  });

  it('deleteUsuario parseInt', async () => {
    await usuariosService.deleteUsuario('7');
    expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), [7]);
  });

  it('updateLastLogin', async () => {
    await usuariosService.updateLastLogin(2);
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('last_login'), expect.any(Array));
  });

  it('saveRecoveryCode delete previo + insert', async () => {
    await usuariosService.saveRecoveryCode('a@a.com', '123', new Date('2026-01-01'));
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM recuperacion_claves'), ['a@a.com']);
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO recuperacion_claves'), expect.any(Array));
  });

  it('getRecoveryCode y deleteRecoveryCode', async () => {
    mockDb.get.mockResolvedValue({ codigo: '123', expires: '2026-01-01' });
    await usuariosService.getRecoveryCode('a@a.com');
    expect(mockDb.get).toHaveBeenCalledWith(expect.stringContaining('SELECT codigo'), ['a@a.com']);
    await usuariosService.deleteRecoveryCode('a@a.com');
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM recuperacion_claves'), ['a@a.com']);
  });

  it('resetPasswordSync', async () => {
    await usuariosService.resetPasswordSync('a@a.com', 'hash123');
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('UPDATE usuarios SET password_hash'), expect.any(Array));
  });
});
