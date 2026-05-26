/**
 * Inicializa el objeto de estadísticas de sincronización
 */
function crearStatsSync() {
  return {
    creados: 0,
    actualizados: 0,
    eliminados: 0,
    conflictosReales: 0,
  };
}

module.exports = {
  crearStatsSync,
};
