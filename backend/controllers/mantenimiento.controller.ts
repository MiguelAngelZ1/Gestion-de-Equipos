const configService = require('../services/config.service');

const getSystemStats = async (req, res, next) => {
    try {
        const stats = await configService.getSystemStats();
        res.json(stats);
    } catch (err) {
        next(err);
    }
};

const getTrashItems = async (req, res, next) => {
    try {
        const items = await configService.getTrashItems();
        res.json(items);
    } catch (err) {
        next(err);
    }
};

const restoreEquipo = async (req, res, next) => {
    try {
        await configService.restoreEquipo(req.params.id);
        res.json({ success: true, message: "Equipo restaurado correctamente" });
    } catch (err) {
        next(err);
    }
};

const deleteFromTrash = async (req, res, next) => {
    try {
        await configService.deleteFromTrash(req.params.id);
        res.json({ success: true, message: "Equipo eliminado definitivamente" });
    } catch (err) {
        next(err);
    }
};

const purgeTrash = async (req, res, next) => {
    try {
        const result = await configService.purgeTrash();
        res.json({ success: true, message: `Se eliminaron ${result.count} equipos definitivamente` });
    } catch (err) {
        next(err);
    }
};

const optimizeDatabase = async (req, res, next) => {
    try {
        await configService.optimizeDatabase();
        res.json({
            success: true,
            message: `Base de Datos optimizada y datos huérfanos limpiados correctamente.`
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getSystemStats,
    getTrashItems,
    restoreEquipo,
    deleteFromTrash,
    purgeTrash,
    optimizeDatabase
};
