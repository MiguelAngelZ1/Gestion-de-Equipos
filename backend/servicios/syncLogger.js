function imprimirResumenSync(stats, totalLocal, totalRemote, detalles = []) {
  console.log("📊 Resumen de sincronización:");
  console.log(`  Duración: completado`);
  console.log(`  Equipos locales: ${totalLocal}`);
  console.log(`  Equipos remotos: ${totalRemote}`);
  console.log(`  Creados: ${stats.creados}`);
  console.log(`  Actualizados: ${stats.actualizados}`);
  console.log(`  Eliminados: ${stats.eliminados}`);
  console.log(`  Conflictos reales: ${stats.conflictosReales}`);
  const errores = detalles.filter(d => d.includes("Error") || d.includes("error"));
  if (errores.length > 0) {
    errores.forEach(e => console.error(`  ${e}`));
  }
  if (stats.creados + stats.actualizados + stats.eliminados > 0) {
    console.log("  Estado: Éxito");
  } else {
    console.log("  Estado: Sin cambios");
  }
}

module.exports = {
  imprimirResumenSync,
};
