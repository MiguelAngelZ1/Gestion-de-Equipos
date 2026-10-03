// Port de backend/controllers/export.controller.ts (buildRowData y afines).
// Misma lógica de columnas que el .xlsx local generado con exceljs.

export const normalizeText = (value: unknown = '') =>
  String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();


const specValue = (specMap: Map<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    const value = specMap.get(normalizeText(alias));
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return '';
};

const buildSpecMap = (specs: any[] = []) => {
  const map = new Map<string, string>();
  for (const spec of specs) {
    const key = normalizeText(spec.clave);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, spec.valor || '');
    } else if (spec.valor && !String(map.get(key)).includes(spec.valor)) {
      map.set(key, `${map.get(key)} | ${spec.valor}`);
    }
  }
  return map;
};

export const formatDate = (value: unknown) => {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

export interface InventoryRow {
  ine: string; nne: string; serie: string; tipo: string; estado: string;
  responsable: string; ubicacion: string; cuentaAdmin: string; passAdmin: string;
  creado: string; actualizado: string; specsTexto: string;
}

export function buildInventoryRow(eq: any): InventoryRow {
  const specs = eq.especificaciones || [];
  const specMap = buildSpecMap(specs);
  return {
    ine: eq.ine || '',
    nne: eq.nne || '',
    serie: eq.serie || '',
    tipo: eq.tipo || eq.categoria || '',
    estado: eq.estado || '',
    responsable: eq.responsable || '',
    ubicacion: eq.ubicacion || '',
    cuentaAdmin: specValue(specMap, ['CUENTA ADMIN', 'USUARIO ADMIN', 'ADMIN USER', 'ADMINISTRADOR']),
    passAdmin: specValue(specMap, ['PASS ADMIN', 'PASSWORD ADMIN', 'CONTRASEÑA ADMIN', 'CONTRASENA ADMIN', 'CLAVE ADMIN', 'pASS ADMIN', 'pass admin']),
    creado: formatDate(eq.created_at),
    actualizado: formatDate(eq.updated_at),
    specsTexto: specs.map((s: any) => `${s.clave}: ${s.valor}`).join('\n'),
  };
}

// Ancho auto = local (exceljs): min/max por columna + factor 1.12.
export function autoWidth(header: string, values: string[], cap: number, min: number): number {
  let maxLen = header.length;
  for (const v of values) {
    for (const part of String(v || '').split('\n')) {
      if (part.length > maxLen) maxLen = part.length;
    }
  }
  return Math.min(cap, Math.max(min, Math.ceil(maxLen * 1.12) + 2));
}
