const logger = require('../utils/logger');

function imprimirResumenSync(stats, totalLocal, totalRemote, detalles = []) {
  logger.info({ stats, totalLocal, totalRemote, detalles }, "Resumen de sincronización");
}

module.exports = {
  imprimirResumenSync,
};
