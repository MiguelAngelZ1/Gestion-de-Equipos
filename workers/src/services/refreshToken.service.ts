// Puerto directo de backend/services/refreshToken.service.ts.
import type { Db } from '../db';

export function refreshTokenService(db: Db) {
  return {
    async saveRefreshToken(userId: unknown, token: string, expires: Date) {
      await db.run(`INSERT INTO refresh_tokens (user_id, token, expires) VALUES (?, ?, ?)`, [userId, token, expires.toISOString()]);
    },
    async findRefreshToken(token: string) {
      return db.get(`SELECT * FROM refresh_tokens WHERE token = ?`, [token]);
    },
    async revokeRefreshToken(token: string) {
      await db.run(`UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`, [token]);
    },
    async revokeAllUserTokens(userId: unknown) {
      await db.run(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0`, [userId]);
    },
  };
}
