import { describe, it, expect } from 'vitest';
import { buildEquiposParams } from './Equipos';

describe('Equipos - buildEquiposParams (server-side search REGLA 14)', () => {
  it('construye q + page + limit', () => {
    const p = buildEquiposParams({ searchTerm: '281', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 1 });
    expect(p.get('q')).toBe('281');
    expect(p.get('page')).toBe('1');
    expect(p.get('limit')).toBe('50');
  });

  it('no incluye q si searchTerm vacio o espacios', () => {
    expect(buildEquiposParams({ searchTerm: '', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 1 }).has('q')).toBe(false);
    expect(buildEquiposParams({ searchTerm: '   ', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 1 }).has('q')).toBe(false);
  });

  it('incluye filtros estado/ubicacion/categoria solo si no son TODOS/TODAS', () => {
    const p = buildEquiposParams({ searchTerm: '', estadoFilter: 'OPERATIVO', ubicacionFilter: 'LAB', categoriaFilter: 'PC', pageNum: 1 });
    expect(p.get('estado')).toBe('OPERATIVO');
    expect(p.get('ubicacion')).toBe('LAB');
    expect(p.get('categoria')).toBe('PC');
  });

  it('no incluye filtros cuando son TODOS/TODAS', () => {
    const p = buildEquiposParams({ searchTerm: 'test', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 1 });
    expect(p.has('estado')).toBe(false);
    expect(p.has('ubicacion')).toBe(false);
    expect(p.has('categoria')).toBe(false);
  });

  it('codifica correctamente caracteres especiales (IP, espacios)', () => {
    const p = buildEquiposParams({ searchTerm: '192.168.1.10', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 1 });
    expect(p.toString()).toContain('q=192.168.1.10');
    const p2 = buildEquiposParams({ searchTerm: 'a b', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 1 });
    expect(p2.get('q')).toBe('a b');
    expect(p2.toString()).toContain('q=a+b');
  });

  it('pageNum y limit siempre presentes para paginacion server-side', () => {
    const p = buildEquiposParams({ searchTerm: 'x', estadoFilter: 'TODOS', ubicacionFilter: 'TODAS', categoriaFilter: 'TODOS', pageNum: 2 });
    expect(p.get('page')).toBe('2');
    expect(p.get('limit')).toBe('50');
  });
});
