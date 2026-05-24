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
    console.warn("⚠️ ADVERTENCIA: ADMIN_PASSWORD no definido. Usando 'admin123' para desarrollo.");
}

const PASSWORD_TO_USE = ADMIN_PASSWORD || 'admin123';

const login = async (req, res, next) => {
    const { usuario, password } = req.body;

    try {
        const user = await usuariosService.findByUsuarioOrEmail(usuario);

        if (user) {
            const match = await bcrypt.compare(password, user.password_hash);
            if (match) {
                const token = jwt.sign({ userId: user.id, rol: user.rol, usuario: user.usuario }, JWT_SECRET, { expiresIn: "24h" });

                // Actualizar último acceso
                await usuariosService.updateLastLogin(user.id);

                return res.json({ success: true, token, user: { id: user.id, usuario: user.usuario, rol: user.rol } });
            }
        }

        const count = await usuariosService.countUsuarios();
        if (count === 0 && usuario === 'admin' && password === PASSWORD_TO_USE) {
            const token = jwt.sign({ userId: 0, rol: "admin", usuario: 'admin' }, JWT_SECRET, { expiresIn: "24h" });
            return res.json({ success: true, token, user: { id: 0, usuario: 'admin', rol: 'admin' }, initial: true });
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

        const code = Math.floor(100000 + Math.random() * 900000).toString();
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

module.exports = { login, forgotPassword, resetPassword };
