const { dashboardService } = require("../services/analitica.service");

const getDashboardSummary = async (req, res, next) => {
    try {
        const summary = await dashboardService.getDashboardSummary();
        res.json(summary);
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getDashboardSummary
};
