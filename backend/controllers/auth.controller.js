const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const usuariosService = require('../servicios/usuarios.service');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { sendRecoveryCode } = require('../servicios/email.service');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;

if (!ADMIN_PASSWORD && IS_PROD) {
    console.error("❌ ERROR CRÍTICO: ADMIN_PASSWORD no definido en producción. El acceso administrativo está deshabilitado por seguridad.");
} else if (!ADMIN_PASSWORD) {
    console.warn("⚠️ ADVERTENCIA: ADMIN_PASSWORD no definido. El bootstrap inicial de admin no estará disponible.");
}

const setTokenCookie = (res, token) => {
    const IS_PROD = process.env.NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
    res.cookie('token', token, {
        httpOnly: true,
        secure: IS_PROD,
        sameSite: IS_PROD ? 'strict' : 'lax',
        maxAge: 24 * 60 * 60 * 1000
    });
};

const login = async (req, res, next) => {
    const { usuario, password } = req.body;

    try {
        const user = await usuariosService.findByUsuarioOrEmail(usuario);

        if (user) {
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                const token = jwt.sign({ userId: user.id, rol: user.rol, usuario: user.usuario }, JWT_SECRET, { expiresIn: "24h" });

                await usuariosService.updateLastLogin(user.id);
                setTokenCookie(res, token);

                return res.json({ success: true, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
            }
        }

        const count = await usuariosService.countUsuarios();
        if (ADMIN_PASSWORD && count === 0 && usuario === 'admin' && password === ADMIN_PASSWORD) {
            const token = jwt.sign({ userId: 0, rol: "admin", usuario: 'admin' }, JWT_SECRET, { expiresIn: "24h" });
            setTokenCookie(res, token);
            return res.json({ success: true, user: { id: 0, usuario: 'admin', rol: 'admin' }, initial: true });
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
        const expires = new Date(Date.now() + 15 * 60 * 1000);
        
        await usuariosService.saveRecoveryCode(email, code, expires);

        sendRecoveryCode(email, code).catch(err => {
            console.error("❌ Error enviando email de recuperación:", err);
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

        if (!stored || stored.codigo !== code || new Date() > new Date(stored.expires)) {
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
    res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
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

module.exports = { login, forgotPassword, resetPassword, logout, me };
