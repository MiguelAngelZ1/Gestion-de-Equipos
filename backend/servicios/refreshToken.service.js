const db = require('../db/database');

class RefreshTokenService {
    async saveRefreshToken(userId, token, expires) {
        await db.run(
            `INSERT INTO refresh_tokens (user_id, token, expires) VALUES (?, ?, ?)`,
            [userId, token, expires.toISOString()]
        );
    }

    async findRefreshToken(token) {
        return await db.get(
            `SELECT * FROM refresh_tokens WHERE token = ?`,
            [token]
        );
    }

    async revokeRefreshToken(token) {
        await db.run(
            `UPDATE refresh_tokens SET revoked = 1 WHERE token = ?`,
            [token]
        );
    }

    async revokeAllUserTokens(userId) {
        await db.run(
            `UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND revoked = 0`,
            [userId]
        );
    }
}

module.exports = new RefreshTokenService();
