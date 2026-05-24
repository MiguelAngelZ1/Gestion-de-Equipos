const { historialService } = require("../servicios/analitica.service");

const getHistorial = async (req, res, next) => {
    try {
        const results = await historialService.getHistorial(req.query);
        res.json(results);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getHistorial
};
