const { historialService } = require("../services/analitica.service");

const getHistorial = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;
        const results = await historialService.getHistorial({ ...req.query, page, limit, offset });
        res.json(results);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHistorial
};
