const soporteService = require('../services/soporte.service');

const getTareasSoporte = async (req, res, next) => {
    try {
        const tareas = await soporteService.getTareasSoporte(req.query);
        res.json(tareas);
    } catch (err) {
        next(err);
    }
};

const createOrUpdateTareaSoporte = async (req, res, next) => {
    try {
        const { id: bodyId } = req.body;
        const { id: paramsId } = req.params;
        const id = bodyId || paramsId;

        const result = await soporteService.createOrUpdateTareaSoporte(req.body, id);
        res.json({ success: true, id: result.id });
    } catch (err) {
        next(err);
    }
};

const deleteTareaSoporte = async (req, res, next) => {
    try {
        const { id } = req.params;
        await soporteService.deleteTareaSoporte(id);
        res.json({ success: true });
    } catch (err) {
        next(err);
    }
};

const deleteBulkSoporte = async (req, res, next) => {
    try {
        const { ids } = req.body;
        const result = await soporteService.deleteBulkSoporte(ids);
        res.json({ success: true, count: result.count });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getTareasSoporte,
    createOrUpdateTareaSoporte,
    deleteTareaSoporte,
    deleteBulkSoporte
};
