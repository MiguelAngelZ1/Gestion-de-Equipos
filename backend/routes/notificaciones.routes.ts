
const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');

// Middleware para verificar token
const { verificarAutenticacion } = require('../middleware/auth.middleware');

// const auth = require('../middleware/auth'); 

// Obtener llave pública VAPID
router.get('/public-key', (req, res) => {
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Suscribirse a notificaciones push
router.post('/subscribe', verificarAutenticacion, async (req, res, next) => {
    try {
        const { subscription, deviceInfo } = req.body;
        const userId = req.user?.userId || req.user?.id;

        if (!userId && userId !== 0) {
            return res.status(401).json({ error: "No se pudo identificar el usuario" });
        }

        if (!subscription) {
            return res.status(400).json({ error: "Suscripción ausente" });
        }

        await notificationService.saveSubscription(userId, subscription, deviceInfo);
        res.status(201).json({ success: true, message: 'Suscrito correctamente' });
    } catch (error) {
        next(error);
    }
});

// Obtener alertas del usuario (para la campanita)
router.get('/', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        const alerts = await notificationService.getUserAlerts(userId);
        res.json(alerts);
    } catch (error) {
        next(error);
    }
});

// Marcar todas las alertas como leídas
router.patch('/all/read', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        await notificationService.markAllAsRead(userId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Marcar alerta como leída
router.patch('/:id/read', verificarAutenticacion, async (req, res, next) => {
    try {
        const alertId = parseInt(req.params.id);
        if (isNaN(alertId)) {
            return res.status(400).json({ error: "ID de notificación no válido" });
        }
        await notificationService.markAsRead(alertId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Limpiar todas las alertas leídas
router.delete('/read/clear', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        await notificationService.clearReadAlerts(userId);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Enviar notificación de prueba
router.post('/test', verificarAutenticacion, async (req, res, next) => {
    try {
        const userId = req.user?.userId || req.user?.id;
        await notificationService.sendToUser(userId, {
            title: 'Notificación de Prueba',
            body: '¡Excelente! Las notificaciones Push están configuradas correctamente.'
        });
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
