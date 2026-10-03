// Subida a Google Drive vía REST directo (googleapis excede el bundle).
// Reutiliza las credenciales OAuth del .env local (GOOGLE_*).
import type { Env } from '../middleware';
import { XLSX_MIME } from './xlsx';

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export async function uploadToDrive(env: Env, filename: string, bytes: Uint8Array): Promise<void> {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID } = env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error('Falta configuracion de Google Drive (secrets GOOGLE_*).');
  }
  const tokRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }).toString(),
  });
  if (!tokRes.ok) throw new Error(`Drive: no se pudo refrescar token (HTTP ${tokRes.status}).`);
  const { access_token } = (await tokRes.json()) as any;
  if (!access_token) throw new Error('Drive: Google no devolvio access_token.');

  const boundary = `drive-${Date.now().toString(36)}`;
  const meta = { name: filename, parents: [GOOGLE_DRIVE_FOLDER_ID], mimeType: XLSX_MIME };
  const head = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: ${XLSX_MIME}\r\n\r\n`,
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);
  const upRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: concat([head, bytes, tail]),
  });
  if (!upRes.ok) throw new Error(`Drive: subida fallida (HTTP ${upRes.status}).`);
}
