const express = require('express');
const router = express.Router();
const ipamService = require('../servicios/ipam.service');
const { ROLES } = require('../config/constants');

// Middleware simple para asegurar que solo admin acceda (asumiendo que req.user está disponible)
// Si no, se puede omitir para pruebas iniciales pero es recomendable.

router.get('/redes', async (req, res, next) => {
    try {
        const redes = await ipamService.getNetworks();
        res.json(redes);
    } catch (error) {
        next(error);
    }
});

router.post('/redes', async (req, res, next) => {
    try {
        const nuevaRed = await ipamService.createNetwork(req.body);
        res.status(201).json(nuevaRed);
    } catch (error) {
        next(error);
    }
});

router.put('/redes/:id', async (req, res, next) => {
    try {
        const updated = await ipamService.updateNetwork(req.params.id, req.body);
        res.json(updated);
    } catch (error) {
        next(error);
    }
});

router.delete('/redes/:id', async (req, res, next) => {
    try {
        await ipamService.deleteNetwork(req.params.id);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.get('/redes/:id/mapa', async (req, res, next) => {
    try {
        const mapa = await ipamService.getNetworkDetails(req.params.id);
        res.json(mapa);
    } catch (error) {
        next(error);
    }
});

router.post('/redes/:id/reservar', async (req, res, next) => {
    try {
        const { ip, notas } = req.body;
        await ipamService.reserveIP(req.params.id, ip, notas);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.delete('/liberar/:ip', async (req, res, next) => {
    try {
        await ipamService.releaseIP(req.params.ip);
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

router.post('/asignar', async (req, res, next) => {
    try {
        const { redId, ip, equipoId, dns1, dns2 } = req.body;
        const result = await ipamService.assignIPToEquipo(redId, ip, equipoId, dns1, dns2);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/desvincular', async (req, res, next) => {
    try {
        const { equipoId, ip } = req.body;
        const result = await ipamService.unlinkIPFromEquipo(equipoId, ip);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.get('/ping/:ip', async (req, res, next) => {
    try {
        const resultado = await ipamService.pingIP(req.params.ip);
        res.json(resultado);
    } catch (error) {
        next(error);
    }
});

router.get('/exportar-excel', async (req, res, next) => {
    try {
        const buffer = await ipamService.generateExcelBuffer();
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Reporte_IPAM_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
    } catch (error) {
        next(error);
    }
});

router.post('/exportar-drive', async (req, res, next) => {
    try {
        const resultado = await ipamService.exportToDrive();
        res.json(resultado);
    } catch (error) {
        next(error);
    }
});

module.exports = router;
