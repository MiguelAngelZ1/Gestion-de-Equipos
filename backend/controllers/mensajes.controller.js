const { mensajeriaService } = require("../servicios/comunicaciones.service");
const notificationService = require("../servicios/notificationService");
const prisma = require("../prismaClient");

exports.enviarMensaje = async (req, res, next) => {
    try {
        const { mensaje } = req.body;
        const usuarioId = req.user?.userId || req.user?.id;
        const remitente = req.user?.usuario || 'Usuario';

        if (!mensaje || mensaje.trim() === "") {
            return res.status(400).json({ error: "El mensaje no puede estar vacío" });
        }

        const result = await mensajeriaService.enviarMensaje({
            usuario_id: usuarioId,
            remitente,
            mensaje
        });

        // Notificar a todos los administradores
        try {
            const admins = await prisma.usuarios.findMany({
                where: { rol: 'ADMIN' },
                select: { id: true }
            });

            const payload = {
                title: `📝 Nuevo mensaje de ${remitente}`,
                body: mensaje.length > 60 ? mensaje.substring(0, 60) + '...' : mensaje,
                type: 'tickets',
                mensaje: mensaje
            };

            for (const admin of admins) {
                await notificationService.sendToUser(admin.id, payload);
            }
        } catch (notifErr) {
            console.error("⚠️ [Mensajes] Error enviando notificaciones:", notifErr);
        }

        res.status(201).json({ success: true, message: "Mensaje enviado correctamente", id: result.id });
    } catch (error) {
        next(error);
    }
};

exports.getMensajes = async (req, res, next) => {
    try {
        const rows = await mensajeriaService.getMensajes();
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.marcarLeido = async (req, res, next) => {
    try {
        const { id } = req.params;
        await mensajeriaService.marcarLeido(id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.marcarTodoLeido = async (req, res, next) => {
    try {
        await mensajeriaService.marcarTodoLeido();
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.eliminarLeidos = async (req, res, next) => {
    try {
        await mensajeriaService.eliminarLeidos();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Error interno del servidor" });
    }
};
