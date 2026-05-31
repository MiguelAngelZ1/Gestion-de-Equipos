const equiposService = require('../servicios/equipos.service');

const getEquipos = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const result = await equiposService.getAllEquipos({ ...req.query, page, limit, offset });
        // Asegurar que no haya caché para que la UI se actualice inmediatamente tras cambios
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(result);
    } catch (err) {
        next(err);
    }
};

const getEquipoById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const equipo = await equiposService.getEquipoById(id);
        
        if (!equipo) {
            return res.status(404).json({ error: "Equipo no encontrado" });
        }

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.json(equipo);
    } catch (err) {
        next(err);
    }
};

const createOrUpdateEquipo = async (req, res, next) => {
    try {
        const targetId = req.body.id || req.params.id;
        const equipoId = await equiposService.createOrUpdateEquipo(req.body, targetId);
        
        res.json({ id: equipoId, success: true });
    } catch (err) {
        next(err);
    }
};

const deleteEquipo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const success = await equiposService.deleteEquipo(id);
        
        res.json({ success: true, softDeleted: success });
    } catch (err) {
        next(err);
    }
};

const deleteBulkEquipos = async (req, res, next) => {
    try {
        const { ids } = req.body;
        const result = await equiposService.deleteBulkEquipos(ids);
        res.json({ success: true, ...result });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getEquipos,
    getEquipoById,
    createOrUpdateEquipo,
    deleteEquipo,
    deleteBulkEquipos
};
