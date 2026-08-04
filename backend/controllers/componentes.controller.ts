const logger = require('../utils/logger');
const componentesService = require('../services/componentes.service');
const notificationService = require('../services/notificationService');

const getComponentes = async (req, res, next) => {
    try {
        const componentes = await componentesService.getComponentes(req.query);
        res.json(componentes);
    } catch (err) {
        next(err);
    }
};

const createOrUpdateComponente = async (req, res, next) => {
    try {
        const result = await componentesService.createOrUpdateComponente(req.body);
        
        // Check stock only for this specific component
        if (req.body.cantidad !== undefined) {
            notificationService.checkComponentStock(
                result.id, 
                req.body.nombre || 'Repuesto', 
                req.body.cantidad
            ).catch(err => logger.error({ err }, "Error checking component stock"));
        }

        res.json({ success: true, id: result.id });
    } catch (err) {
        next(err);
    }
};

const deleteComponente = async (req, res, next) => {
    try {
        const { id } = req.params;
        await componentesService.deleteComponente(id);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

const deleteBulkComponentes = async (req, res, next) => {
    try {
        const { ids } = req.body;
        const result = await componentesService.deleteBulkComponentes(ids);
        res.json({ success: true, count: result.count });
    } catch (err) {
        next(err);
    }
};

const instalarComponente = async (req, res, next) => {
    try {
        const { equipo_id } = req.body;
        if (!equipo_id) return res.status(400).json({ error: "Faltan datos requeridos (equipo_id)" });

        const result = await componentesService.instalarComponente(req.body);

        // After installation, check stock for the source component
        if (req.body.componente_id) {
            const componente = await componentesService.getComponenteById(req.body.componente_id);
            if (componente) {
                notificationService.checkComponentStock(
                    componente.id,
                    componente.nombre,
                    componente.cantidad
                ).catch(err => logger.error({ err }, "Error checking component stock"));
            }
        }

        res.json({ success: true, id: result.id });
    } catch (err) {
        next(err);
    }
};

const getComponentesInstalados = async (req, res, next) => {
    try {
        const { equipo_id } = req.params;
        const result = await componentesService.getComponentesInstalados(equipo_id);
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const getMovimientosStock = async (req, res, next) => {
    try {
        const { id } = req.params;
        const movimientos = await componentesService.getMovimientosStock(id);
        
        // Formatear para mantener compatibilidad con el frontend si es necesario
        const formatted = movimientos.map(m => ({
            ...m,
            equipo_tipo: m.equipos?.grupos_comodidad?.nombre,
            ine: m.equipos?.ine,
            serie: m.equipos?.serie
        }));
        
        res.json(formatted);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getComponentes,
    createOrUpdateComponente,
    deleteComponente,
    deleteBulkComponentes,
    instalarComponente,
    getComponentesInstalados,
    getMovimientosStock
};
