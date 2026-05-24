const usuariosService = require("../servicios/usuarios.service");

const getUsuarios = async (req, res, next) => {
    try {
        const usuarios = await usuariosService.getUsuarios();
        res.json(usuarios);
    } catch (error) {
        next(error);
    }
};

const getUsuarioById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const usuario = await usuariosService.getUsuarioById(id);
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(usuario);
    } catch (error) {
        next(error);
    }
};

const createUsuario = async (req, res, next) => {
    try {
        await usuariosService.createUsuario(req.body);
        res.status(201).json({ success: true, message: "Usuario creado exitosamente" });
    } catch (error) {
        next(error);
    }
};

const updateUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        await usuariosService.updateUsuario(id, req.body);
        res.json({ success: true, message: "Usuario actualizado" });
    } catch (error) {
        next(error);
    }
};

const deleteUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        await usuariosService.deleteUsuario(id);
        res.json({ success: true, message: "Usuario eliminado" });
    } catch (error) {
        next(error);
    }
};

const getPerfil = async (req, res, next) => {
    try {
        const { userId, usuario: username } = req.user;

        if (userId === 0) {
            return res.json({
                id: 0,
                usuario: username || 'admin',
                email: 'admin@sistema.cl',
                rol: 'admin',
                is_initial: true
            });
        }

        const usuario = await usuariosService.getUsuarioById(userId);
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado" });
        res.json(usuario);
    } catch (error) {
        next(error);
    }
};

const updatePerfil = async (req, res, next) => {
    try {
        const { userId } = req.user;
        const { usuario, email, password } = req.body;

        if (userId === 0) {
            return res.status(400).json({ error: "El admin inicial no puede actualizarse. Por favor cree un usuario admin real en Gestión de Usuarios." });
        }

        // Validaciones de duplicados (ya manejadas en el servicio o por triggers/constraints de Prisma)
        // Pero el controlador puede ser más explícito
        if (usuario || email) {
            const existing = await usuariosService.findByUsuarioOrEmail(usuario || email);
            if (existing && existing.id !== userId) {
                return res.status(400).json({ error: "El nombre de usuario o email ya está en uso." });
            }
        }

        await usuariosService.updateUsuario(userId, { usuario, email, password });
        res.json({ success: true, message: "Perfil actualizado correctamente" });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getUsuarios,
    getUsuarioById,
    createUsuario,
    updateUsuario,
    deleteUsuario,
    getPerfil,
    updatePerfil
};
