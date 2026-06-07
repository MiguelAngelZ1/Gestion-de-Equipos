const db = require('../db/database');

class EquiposService {
    async getAllEquipos(query) {
        const { q, page = 1, limit = 50, offset = 0, estado, ubicacion, categoria } = query;

        const fromClause = `
            FROM equipos e
            LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
            LEFT JOIN estados es ON e.estado_id = es.id
            LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
            LEFT JOIN responsables r ON e.responsable_id = r.id
        `;

        let whereClause = "WHERE e.is_deleted = false";
        const params = [];

        if (q && q.trim() !== "") {
            const search = `%${q.trim()}%`;
            whereClause += ` AND (
                e.ine LIKE ? OR 
                e.nne LIKE ? OR 
                e.serie LIKE ? OR 
                gc.nombre LIKE ? OR 
                es.nombre LIKE ? OR 
                u.nombre LIKE ? OR 
                u.ubicacion LIKE ? OR
                r.nombre LIKE ? OR 
                r.apellido LIKE ? OR
                r.grado LIKE ? OR
                EXISTS (
                    SELECT 1 FROM especificaciones esp 
                    WHERE esp.equipo_id = e.id 
                    AND (esp.clave LIKE ? OR esp.valor LIKE ?)
                )
            )`;
            for(let i=0; i<12; i++) params.push(search);
        }

        if (estado && estado.trim() !== "") {
            whereClause += " AND es.nombre = ?";
            params.push(estado.trim());
        }

        if (ubicacion && ubicacion.trim() !== "") {
            whereClause += " AND u.nombre = ?";
            params.push(ubicacion.trim());
        }

        if (categoria && categoria.trim() !== "") {
            whereClause += " AND gc.nombre = ?";
            params.push(categoria.trim());
        }

        const countResult = await db.get(`SELECT COUNT(*) as total ${fromClause} ${whereClause}`, params);
        const total = countResult.total;

        const equipos = await db.all(`
            SELECT e.*, 
                   gc.nombre as tipo, 
                   es.nombre as estado, es.color_hex, 
                   u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
                   r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado, r.grado_id as responsable_grado_id
            ${fromClause} ${whereClause} ORDER BY e.ine ASC LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        const ids = equipos.map(e => e.id);
        const placeholders = ids.map(() => '?').join(',');
        const allSpecs = ids.length > 0
            ? await db.all(`SELECT id, clave, valor, equipo_id FROM especificaciones WHERE equipo_id IN (${placeholders}) ORDER BY id ASC`, ids)
            : [];

        const specsByEquipo = {};
        for (const spec of allSpecs) {
            if (!specsByEquipo[spec.equipo_id]) specsByEquipo[spec.equipo_id] = [];
            specsByEquipo[spec.equipo_id].push({ id: spec.id, clave: spec.clave, valor: spec.valor });
        }

        const data = equipos.map(e => ({
            ...e,
            ubicacion: e.ubicacion_nombre || e.ubicacion_desc,
            responsable: `${e.responsable_grado || ''} ${e.responsable_nombre || ''} ${e.responsable_apellido || ''}`.trim(),
            especificaciones: specsByEquipo[e.id] || []
        }));

        return {
            data,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getEquipoById(id) {
        const sql = `
            SELECT e.*, 
                   gc.nombre as tipo, 
                   es.nombre as estado, es.color_hex, 
                   u.nombre as ubicacion_nombre, u.ubicacion as ubicacion_desc,
                   r.nombre as responsable_nombre, r.apellido as responsable_apellido, r.grado as responsable_grado, r.grado_id as responsable_grado_id
            FROM equipos e
            LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
            LEFT JOIN estados es ON e.estado_id = es.id
            LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
            LEFT JOIN responsables r ON e.responsable_id = r.id
            WHERE e.id = ? AND is_deleted = false
        `;

        const e = await db.get(sql, [id]);

        if (!e) return null;

        const specs = await db.all("SELECT id, clave, valor FROM especificaciones WHERE equipo_id = ? ORDER BY id ASC", [id]);

        // Filtrar claves duplicadas si existen (limpieza en vuelo)
        const uniqueSpecs = [];
        const seenKeys = new Set();
        for (const s of specs) {
            const lowerKey = s.clave.toLowerCase().trim();
            if (!seenKeys.has(lowerKey)) {
                seenKeys.add(lowerKey);
                uniqueSpecs.push(s);
            }
        }

        return {
            ...e,
            ubicacion: e.ubicacion_nombre || e.ubicacion_desc,
            responsable: `${e.responsable_grado || ''} ${e.responsable_nombre || ''} ${e.responsable_apellido || ''}`.trim(),
            especificaciones: uniqueSpecs
        };
    }

    async createOrUpdateEquipo(data, targetId = null) {
        const {
            ine, nne, serie, categoria_id, ubicacion_id, responsable_id, estado_id,
            nombre, apellido, grado_id, especificaciones = []
        } = data;

        if (!ine || !categoria_id || !estado_id || !ubicacion_id) {
            throw new Error("INE, Categoría, Estado y Ubicación son obligatorios para el registro.");
        }

        const hasNNE = nne && nne.trim() !== "" && nne.trim() !== "-";
        const hasSerie = serie && serie.trim() !== "" && serie.trim() !== "-";
        
        if (!hasNNE && !hasSerie) {
            throw new Error("Error de validación: El equipo debe poseer obligatoriamente un NNE o un Número de Serie para ser identificado.");
        }

        await db.beginTransaction();
        try {
            let finalResponsableId = responsable_id;

            // Gestión del responsable
            if (nombre && apellido) {
                const existingResp = await db.get(
                    "SELECT id FROM responsables WHERE nombre = ? AND apellido = ?", 
                    [nombre.trim(), apellido.trim()]
                );

                let gradoText = '';
                if (grado_id) {
                    const g = await db.get("SELECT abreviatura FROM grados WHERE id = ?", [parseInt(grado_id, 10)]);
                    if (g) gradoText = g.abreviatura;
                }

                if (existingResp) {
                    finalResponsableId = existingResp.id;
                    await db.run(
                        "UPDATE responsables SET grado_id = ?, grado = ? WHERE id = ?",
                        [grado_id ? parseInt(grado_id, 10) : null, gradoText, finalResponsableId]
                    );
                } else {
                    const newResp = await db.run(
                        "INSERT INTO responsables (nombre, apellido, grado_id, grado) VALUES (?, ?, ?, ?)",
                        [nombre.trim(), apellido.trim(), grado_id ? parseInt(grado_id, 10) : null, gradoText]
                    );
                    finalResponsableId = newResp.lastID;
                }
            }

            if (hasSerie && serie.trim() !== '-' && serie.trim() !== '') {
                const existingSerie = await db.get(
                    "SELECT ine FROM equipos WHERE serie = ? AND id != ? AND is_deleted = false",
                    [serie.trim(), targetId || '']
                );
                if (existingSerie) {
                    throw new Error(`Atención: El Número de Serie "${serie}" ya se encuentra registrado.`);
                }
            }

            const equipoId = targetId || `eq_${Date.now()}`;

            if (targetId) {
                const oldEquipo = await db.get("SELECT estado_id, ubicacion_id, responsable_id FROM equipos WHERE id = ?", [targetId]);

                await db.run(
                    `UPDATE equipos SET 
                        ine = ?, nne = ?, serie = ?, 
                        categoria_id = ?, estado_id = ?, 
                        responsable_id = ?, ubicacion_id = ?, 
                        updated_at = ?
                     WHERE id = ?`,
                    [
                        ine, nne || '-', serie || '-', 
                        parseInt(categoria_id, 10), parseInt(estado_id, 10), 
                        finalResponsableId ? parseInt(finalResponsableId, 10) : null, 
                        parseInt(ubicacion_id, 10), new Date().toISOString(), 
                        targetId
                    ]
                );

                // Registro de Historial (Simplificado para brevedad, expandible)
                if (oldEquipo) {
                    const commonData = [targetId, "SISTEMA"];
                    if (oldEquipo.estado_id !== parseInt(estado_id, 10)) {
                        await db.run(
                            "INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, 'CAMBIO_DE_ESTADO', ?)",
                            [...commonData, `Cambio de estado`]
                        );
                    }
                }

                // Limpiar especificaciones
                await db.run("DELETE FROM especificaciones WHERE equipo_id = ?", [targetId]);
            } else {
                await db.run(
                    "INSERT INTO equipos (id, ine, nne, serie, categoria_id, estado_id, responsable_id, ubicacion_id, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)",
                    [
                        equipoId, ine, nne || '-', serie || '-', 
                        parseInt(categoria_id, 10), parseInt(estado_id, 10), 
                        finalResponsableId ? parseInt(finalResponsableId, 10) : null, 
                        parseInt(ubicacion_id, 10)
                    ]
                );
                await db.run(
                    "INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, 'ASIGNACION', 'Nueva alta de equipo')",
                    [equipoId, "SISTEMA"]
                );
            }

            // Especificaciones
            if (especificaciones.length > 0) {
                const seen = new Set();
                for (const spec of especificaciones) {
                    if (spec.clave && spec.valor) {
                        const key = `${spec.clave.trim().toLowerCase()}-${spec.valor.trim().toLowerCase()}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            await db.run(
                                "INSERT INTO especificaciones (equipo_id, clave, valor) VALUES (?, ?, ?)",
                                [equipoId, spec.clave.trim(), spec.valor.trim()]
                            );
                        }
                    }
                }
            }

            await db.commit();
            return equipoId;
        } catch (error) {
            await db.rollback();
            throw error;
        }
    }

    async deleteEquipo(id) {
        const isSQLite = !db.isPostgreSQL;
        const deletedVal = isSQLite ? 1 : true;
        
        const result = await db.run(
            "UPDATE equipos SET is_deleted = ?, updated_at = ? WHERE id = ?",
            [deletedVal, new Date().toISOString(), id]
        );
        
        await db.run(
            "INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, 'BAJA_EQUIPO', 'Movido a papelera')",
            [id, "SISTEMA"]
        );

        return result.changes > 0;
    }

    async deleteBulkEquipos(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return { count: 0 };
        
        const isSQLite = !db.isPostgreSQL;
        const deletedVal = isSQLite ? 1 : true;
        const placeholders = ids.map(() => '?').join(',');
        
        const result = await db.run(
            `UPDATE equipos SET is_deleted = ?, updated_at = ? WHERE id IN (${placeholders})`,
            [deletedVal, new Date().toISOString(), ...ids]
        );

        return { count: result.changes };
    }
}

module.exports = new EquiposService();

