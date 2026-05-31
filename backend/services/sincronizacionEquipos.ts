const calcularHashEquipo = require("../sincronizacion/calcularHashEquipo");

function hayConflictoReal(local: any, remote: any) {
  if (!local || !remote) return false;
  if (!local.updated_at || !remote.updated_at) return false;

  return local.hash !== remote.hash;
}

function resolverConflicto(local: any, remote: any) {
  return new Date(local.updated_at) >= new Date(remote.updated_at)
    ? { ganador: "local", equipo: local }
    : { ganador: "remote", equipo: remote };
}


async function sincronizarEquipos({
    obtenerEquiposLocal,
    obtenerEquiposRemote,
    actualizarLocal,
    actualizarRemote,
    equiposLocal: datosEquiposLocal = null,
    equiposRemote: datosEquiposRemote = null
}: {
    obtenerEquiposLocal: () => Promise<any[]>;
    obtenerEquiposRemote: () => Promise<any[]>;
    actualizarLocal: (equipo: any) => Promise<void>;
    actualizarRemote: (equipo: any) => Promise<void>;
    equiposLocal?: any[] | null;
    equiposRemote?: any[] | null;
}) {
  const stats: any = {
    creados: 0,
    actualizados: 0,
    eliminados: 0,
    conflictosReales: 0
  };
  const detalles: string[] = [];

  const equiposLocal = datosEquiposLocal || await obtenerEquiposLocal();
  const equiposRemote = datosEquiposRemote || await obtenerEquiposRemote();

  equiposLocal.forEach((e: any) => e.hash = calcularHashEquipo(e));
  equiposRemote.forEach((e: any) => e.hash = calcularHashEquipo(e));

  const mapLocal = new Map<string, any>(equiposLocal.map((e: any) => [e.id, e]));
  const mapRemote = new Map<string, any>(equiposRemote.map((e: any) => [e.id, e]));

  // 🔁 Fase 1: Local → Remote
  for (const [id, local] of mapLocal) {
    const remote = mapRemote.get(id);

    if (!remote) {
      if (local.is_deleted) continue; // Si está borrado local y no existe en remoto, ignorar
      
      await actualizarRemote(local);
      stats.creados++;
      detalles.push(`➕ [LOCAL -> REMOTO] Creado equipo: ${local.ine} (ID: ${local.id})`);
      continue;
    }

    // Si ambos existen, comparar fechas de actualización
    const dateLocal = new Date(local.updated_at);
    const dateRemote = new Date(remote.updated_at);

    if (dateLocal > dateRemote) {
      await actualizarRemote(local);
      if (local.is_deleted && !remote.is_deleted) {
        stats.eliminados++;
        detalles.push(`🗑️ [LOCAL -> REMOTO] Eliminado equipo: ${local.ine} (ID: ${local.id})`);
      } else {
        stats.actualizados++;
        detalles.push(`📝 [LOCAL -> REMOTO] Actualizado equipo: ${local.ine} (ID: ${local.id})`);
      }
      continue;
    }

    // Si hay discrepancia pero las fechas son iguales (o similar), ver hash
    if (hayConflictoReal(local, remote)) {
      stats.conflictosReales++;
      const resultado = resolverConflicto(local, remote);
      
      if (resultado.ganador === "local") {
        await actualizarRemote(resultado.equipo);
        detalles.push(`⚔️ [CONFLICTO] Ganó Local: ${local.ine} (ID: ${local.id})`);
      } else {
        await actualizarLocal(resultado.equipo);
        detalles.push(`⚔️ [CONFLICTO] Ganó Remoto: ${remote.ine} (ID: ${remote.id})`);
      }
      continue;
    }
  }

  // 🔁 Fase 2: Remote → Local (solo para equipos que no están en Local)
  for (const [id, remote] of mapRemote) {
    const local = mapLocal.get(id);

    if (!local) {
      if (remote.is_deleted) continue; // Si está borrado en remoto y no existe local, ignorar
      
      await actualizarLocal(remote);
      stats.creados++;
      detalles.push(`➕ [REMOTO -> LOCAL] Creado equipo: ${remote.ine} (ID: ${remote.id})`);
      continue;
    }

    // Si existe local pero remoto es más nuevo
    const dateLocal = new Date(local.updated_at);
    const dateRemote = new Date(remote.updated_at);

    if (dateRemote > dateLocal) {
      await actualizarLocal(remote);
      if (remote.is_deleted && !local.is_deleted) {
        stats.eliminados++;
        detalles.push(`🗑️ [REMOTO -> LOCAL] Eliminado equipo: ${remote.ine} (ID: ${remote.id})`);
      } else {
        stats.actualizados++;
        detalles.push(`📝 [REMOTO -> LOCAL] Actualizado equipo: ${remote.ine} (ID: ${remote.id})`);
      }
    }
  }

  return {
    stats,
    detalles,
    equiposLocalFinal: datosEquiposLocal || await obtenerEquiposLocal(),
    equiposRemoteFinal: datosEquiposRemote || await obtenerEquiposRemote()
  };
}

module.exports = {
  sincronizarEquipos
};

