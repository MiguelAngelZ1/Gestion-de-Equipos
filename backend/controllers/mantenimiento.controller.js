const configService = require('../servicios/config.service');

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
        console.error("❌ Error en getTrashItems:", err);
        res.status(500).json({ error: "Error obteniendo elementos de la papelera" });
    }
};

const restoreEquipo = async (req, res, next) => {
    try {
        await configService.restoreEquipo(req.params.id);
        res.json({ success: true, message: "Equipo restaurado correctamente" });
    } catch (err) {
        console.error("❌ Error en restoreEquipo:", err);
        res.status(500).json({ error: "Error al restaurar el equipo" });
    }
};

const deleteFromTrash = async (req, res, next) => {
    try {
        await configService.deleteFromTrash(req.params.id);
        res.json({ success: true, message: "Equipo eliminado definitivamente" });
    } catch (err) {
        console.error("❌ Error en deleteFromTrash:", err);
        res.status(500).json({ error: "Error al eliminar el equipo definitivamente" });
    }
};

const purgeTrash = async (req, res, next) => {
    try {
        const result = await configService.purgeTrash();
        res.json({ success: true, message: `Se eliminaron ${result.count} equipos definitivamente` });
    } catch (err) {
        console.error("❌ Error en purgeTrash:", err);
        res.status(500).json({ error: "Error al vaciar la papelera" });
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
        console.error("❌ Error en optimizeDatabase:", err);
        res.status(500).json({ error: "Error al optimizar la base de datos" });
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
