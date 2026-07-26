const logger = require('../utils/logger');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const usuariosService = require('../services/usuarios.service');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { sendRecoveryCode } = require('../services/email.service');

const refreshTokenService = require('../services/refreshToken.service');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const IS_PROD = process.env.NODE_ENV === 'production';

const DUMMY_HASH = bcrypt.hashSync('dummy-placeholder-' + crypto.randomUUID(), 10);

if (!ADMIN_PASSWORD && IS_PROD) {
    logger.error("ADMIN_PASSWORD no definido en producción. El acceso administrativo está deshabilitado por seguridad.");
} else if (!ADMIN_PASSWORD) {
    logger.warn("ADMIN_PASSWORD no definido. El bootstrap inicial de admin no estará disponible.");
}

const setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: IS_PROD ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    });
};

const setRefreshTokenCookie = (res, token) => {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

const login = async (req, res, next) => {
    const { usuario, password } = req.body;

    if (!usuario || !password || usuario.trim() === '' || password.trim() === '') {
        return res.status(400).json({ error: "Usuario y contraseña son requeridos" });
    }

    try {
        const user = await usuariosService.findByUsuarioOrEmail(usuario);
        const match = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH);

        if (user && match) {
            const permisos = (() => { try { return JSON.parse(user.permisos_json || '[]'); } catch { return []; } })();
            const token = jwt.sign({ userId: user.id, rol: user.rol, usuario: user.usuario, permisos }, JWT_SECRET, { expiresIn: "24h" });

            const refreshToken = crypto.randomBytes(32).toString('hex');
            const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await refreshTokenService.saveRefreshToken(user.id, refreshToken, refreshExpires);

            await usuariosService.updateLastLogin(user.id);
            setTokenCookie(res, token);
            setRefreshTokenCookie(res, refreshToken);

            return res.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
        }

        const count = await usuariosService.countUsuarios();
        if (ADMIN_PASSWORD && count === 0 && usuario === 'admin' && password === ADMIN_PASSWORD) {
            let adminId;
            try {
                const created = await usuariosService.createUsuario({
                    usuario: 'admin',
                    email: 'admin@control-equipos.local',
                    password: ADMIN_PASSWORD,
                    rol: 'ADMIN',
                    permisos_json: []
                });
                adminId = created.id;
            } catch (_) {
                const existing = await usuariosService.findByUsuarioOrEmail('admin');
                adminId = existing?.id || 1;
            }
            const token = jwt.sign({ userId: adminId, rol: "admin", usuario: 'admin', permisos: [] }, JWT_SECRET, { expiresIn: "24h" });
            setTokenCookie(res, token);
            return res.json({ success: true, user: { id: adminId, usuario: 'admin', rol: 'admin' }, initial: true });
        }

        return res.status(401).json({ error: "Credenciales incorrectas" });
    } catch (error) {
        next(error);
    }
};

const forgotPassword = async (req, res, next) => {
    const { email } = req.body;
    try {
        const user = await usuariosService.findByEmail(email);
        if (!user) {
            return res.json({ success: true, message: "Si el correo existe, se enviará un código." });
        }

        const code = crypto.randomInt(100000, 999999).toString();
        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        
        await usuariosService.saveRecoveryCode(email, codeHash, expires);

        sendRecoveryCode(email, code).catch(err => {
            logger.error({ err }, "Error enviando email de recuperación");
        });

        res.json({ success: true, message: "Si el correo existe, se enviará un código." });
    } catch (error) {
        next(error);
    }
};

const resetPassword = async (req, res, next) => {
    const { email, code, newPassword } = req.body;
    
    try {
        const stored = await usuariosService.getRecoveryCode(email);

        if (!stored || new Date() > new Date(stored.expires)) {
            return res.status(400).json({ error: "Código inválido o expirado." });
        }

        const codeHash = crypto.createHash('sha256').update(code).digest('hex');
        let codeValid = false;
        try {
            codeValid = crypto.timingSafeEqual(Buffer.from(stored.codigo), Buffer.from(codeHash));
        } catch (_) {
            codeValid = false;
        }
        if (!codeValid) {
            return res.status(400).json({ error: "Código inválido o expirado." });
        }

        const password_hash = await bcrypt.hash(newPassword, 12);
        await usuariosService.resetPasswordSync(email, password_hash);
        await usuariosService.deleteRecoveryCode(email);

        res.json({ success: true, message: "Contraseña actualizada correctamente." });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res) => {
    try {
        if (req.user && req.user.userId) {
            await refreshTokenService.revokeAllUserTokens(req.user.userId);
        }
    } catch (e) {
        logger.error({ err: e }, "Error en logout");
    }
    res.clearCookie('token', { httpOnly: true, secure: IS_PROD, sameSite: 'strict' });
    res.clearCookie('refreshToken', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/api/auth' });
    res.json({ success: true, message: "Sesión cerrada." });
};

const me = async (req, res, next) => {
    try {
        const user = await usuariosService.getUsuarioById(req.user.userId);
        if (!user) return res.status(401).json({ error: "Usuario no encontrado" });
        res.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
    } catch (error) {
        next(error);
    }
};

const refresh = async (req, res) => {
    const token = req.cookies && req.cookies.refreshToken;
    if (!token) {
        res.clearCookie('token', { httpOnly: true, secure: IS_PROD, sameSite: 'strict' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/api/auth' });
        return res.status(401).json({ error: "Refresh token no proporcionado" });
    }
    try {
        const stored = await refreshTokenService.findRefreshToken(token);
        if (!stored || stored.revoked === 1 || new Date() > new Date(stored.expires)) {
            await refreshTokenService.revokeRefreshToken(token);
            res.clearCookie('token', { httpOnly: true, secure: IS_PROD, sameSite: 'strict' });
            res.clearCookie('refreshToken', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/api/auth' });
            return res.status(401).json({ error: "Refresh token inválido o expirado" });
        }
        await refreshTokenService.revokeRefreshToken(token);
        const user = await usuariosService.getUsuarioById(stored.user_id);
        if (!user) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }
        const permisos = (() => { try { return JSON.parse(user.permisos_json || '[]'); } catch { return []; } })();
        const newToken = jwt.sign({ userId: user.id, rol: user.rol, usuario: user.usuario, permisos }, JWT_SECRET, { expiresIn: "24h" });
        const newRefreshToken = crypto.randomBytes(32).toString('hex');
        const newRefreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await refreshTokenService.saveRefreshToken(user.id, newRefreshToken, newRefreshExpires);
        setTokenCookie(res, newToken);
        setRefreshTokenCookie(res, newRefreshToken);
        res.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
    } catch (error) {
        res.clearCookie('token', { httpOnly: true, secure: IS_PROD, sameSite: 'strict' });
        res.clearCookie('refreshToken', { httpOnly: true, secure: IS_PROD, sameSite: 'strict', path: '/api/auth' });
        return res.status(401).json({ error: "Error al renovar sesión" });
    }
};

module.exports = { login, forgotPassword, resetPassword, logout, me, refresh };
