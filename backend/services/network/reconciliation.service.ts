const db = require('../../db/database');
import { OuiResolver } from './probes/oui.resolver';

export interface DiscoveredNodeData {
  redId: string;
  ip: string;
  mac?: string | null;
  hostname?: string | null;
  rttMs?: number | null;
  evidencias?: any;
}

export class ReconciliationService {
  /**
   * Concilia un dispositivo descubierto contra la base de datos de inventario y red.
   * Detecta cambios de IP, cambios de MAC y colisiones.
   */
  static async reconcileDevice(data: DiscoveredNodeData): Promise<{
    dispositivoId: string;
    esNuevo: boolean;
    conflicto?: string;
    equipoId?: string | null;
  }> {
    const { redId, ip, mac, hostname, rttMs } = data;
    const normalizedMac = mac ? OuiResolver.normalizeMac(mac) : null;
    const ouiInfo = normalizedMac ? OuiResolver.resolve(normalizedMac) : null;

    // 1. Verificar si ya existe este nodo para (red_id, ip)
    const existingNode = await db.get(
      'SELECT * FROM dispositivos_red WHERE red_id = ? AND ip = ?',
      [redId, ip]
    );

    // 2. Verificar si la MAC pertenece a alguna interfaz de inventario registrada
    let matchedEquipoId: string | null = null;
    let matchedInterfaceId: string | null = null;

    if (normalizedMac) {
      const iface = await db.get(
        'SELECT id, equipo_id FROM interfaces_red WHERE mac = ?',
        [normalizedMac]
      );
      if (iface) {
        matchedEquipoId = iface.equipo_id;
        matchedInterfaceId = iface.id;
      } else {
        // Fallback: buscar en especificaciones (clave 'MAC')
        const spec = await db.get(
          "SELECT equipo_id FROM especificaciones WHERE (LOWER(clave) = 'mac' OR LOWER(clave) = 'direccion mac') AND UPPER(REPLACE(valor, '-', ':')) = ?",
          [normalizedMac]
        );
        if (spec) {
          matchedEquipoId = spec.equipo_id;
        }
      }
    }

    // 3. Detección de anomalías y conflictos
    let conflictoDetectado: string | undefined = undefined;

    if (existingNode) {
      // 3.1. ¿Cambio de MAC en la misma IP?
      if (normalizedMac && existingNode.mac_actual && existingNode.mac_actual !== normalizedMac) {
        conflictoDetectado = 'CAMBIO_MAC';
        await db.run(
          `INSERT INTO eventos_red (red_id, dispositivo_id, tipo_evento, severidad, descripcion, detalles_json)
           VALUES (?, ?, 'CAMBIO_MAC', 'WARNING', ?, ?)`,
          [
            redId,
            existingNode.id,
            `Cambio de MAC detectado en ${ip}: anterior ${existingNode.mac_actual}, nueva ${normalizedMac}`,
            JSON.stringify({ ip, macAnterior: existingNode.mac_actual, macNueva: normalizedMac })
          ]
        );
      }

      // Actualizar registro existente
      await db.run(
        `UPDATE dispositivos_red 
         SET mac_actual = COALESCE(?, mac_actual),
             hostname_actual = COALESCE(?, hostname_actual),
             fabricante_actual = COALESCE(?, fabricante_actual),
             tipo_mac = COALESCE(?, tipo_mac),
             latencia_actual_ms = ?,
             ultimo_visto_online = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          normalizedMac,
          hostname || null,
          ouiInfo?.fabricante || null,
          ouiInfo?.tipoMac || 'UNIVERSAL',
          rttMs || null,
          existingNode.id
        ]
      );

      return {
        dispositivoId: existingNode.id,
        esNuevo: false,
        conflicto: conflictoDetectado,
        equipoId: existingNode.interfaz_id || matchedEquipoId
      };
    }

    // 4. Nodo no existía en esta (red_id, ip)
    // 4.1. ¿La misma MAC ya estaba en otra IP de este mismo segmento? -> IP Drift
    if (normalizedMac) {
      const previousIpNode = await db.get(
        'SELECT id, ip FROM dispositivos_red WHERE red_id = ? AND mac_actual = ?',
        [redId, normalizedMac]
      );

      if (previousIpNode) {
        conflictoDetectado = 'CAMBIO_IP';
        await db.run(
          `INSERT INTO eventos_red (red_id, dispositivo_id, tipo_evento, severidad, descripcion, detalles_json)
           VALUES (?, ?, 'CAMBIO_IP', 'WARNING', ?, ?)`,
          [
            redId,
            previousIpNode.id,
            `Dispositivo con MAC ${normalizedMac} cambió de IP: ${previousIpNode.ip} -> ${ip}`,
            JSON.stringify({ mac: normalizedMac, ipAnterior: previousIpNode.ip, ipNueva: ip })
          ]
        );
      }
    }

    // 5. Inserción de nuevo nodo en dispositivos_red (preservar alias por MAC si existe)
    let aliasToCarry: string | null = null;
    if (normalizedMac) {
      const prevAlias = await db.get('SELECT alias FROM dispositivos_red WHERE mac_actual = ? AND alias IS NOT NULL AND alias != "" LIMIT 1', [normalizedMac]);
      if (prevAlias?.alias) aliasToCarry = prevAlias.alias;
    }
    const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.run(
      `INSERT INTO dispositivos_red (
         id, red_id, ip, mac_actual, hostname_actual, fabricante_actual, tipo_mac,
         interfaz_id, rol, estado_monitoreo, latencia_actual_ms, ultimo_visto_online, alias
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ONLINE', ?, CURRENT_TIMESTAMP, ?)`,
      [
        newId,
        redId,
        ip,
        normalizedMac,
        hostname || null,
        ouiInfo?.fabricante || null,
        ouiInfo?.tipoMac || 'UNIVERSAL',
        matchedInterfaceId,
        ouiInfo?.rolSugerido || 'ENDPOINT',
        rttMs || null,
        aliasToCarry
      ]
    );

    // Registrar evento de nuevo dispositivo
    await db.run(
      `INSERT INTO eventos_red (red_id, dispositivo_id, tipo_evento, severidad, descripcion, detalles_json)
       VALUES (?, ?, 'DISPOSITIVO_NUEVO', 'INFO', ?, ?)`,
      [
        redId,
        newId,
        `Nuevo dispositivo detectado en ${ip}${normalizedMac ? ` (MAC: ${normalizedMac})` : ''}`,
        JSON.stringify({ ip, mac: normalizedMac, hostname, fabricante: ouiInfo?.fabricante })
      ]
    );

    return {
      dispositivoId: newId,
      esNuevo: true,
      conflicto: conflictoDetectado,
      equipoId: matchedEquipoId
    };
  }

  static async updateAlias(dispositivoId: string, alias: string | null): Promise<void> {
    const trimmed = alias ? String(alias).trim().slice(0, 80) : null;
    if (trimmed && trimmed.length < 1) throw new Error('Alias inválido.');
    await db.run('UPDATE dispositivos_red SET alias = ? WHERE id = ?', [trimmed || null, dispositivoId]);
    if (trimmed) {
      const node = await db.get('SELECT mac_actual FROM dispositivos_red WHERE id = ?', [dispositivoId]);
      if (node?.mac_actual) {
        await db.run('UPDATE dispositivos_red SET alias = ? WHERE mac_actual = ? AND (alias IS NULL OR alias = "")', [trimmed, node.mac_actual]);
      }
    }
  }

  /**
   * Vincula manualmente un dispositivo de red descubierto a un equipo de inventario
   */
  static async linkToEquipo(dispositivoId: string, equipoId: string): Promise<boolean> {
    const node = await db.get('SELECT * FROM dispositivos_red WHERE id = ?', [dispositivoId]);
    if (!node) throw new Error('Dispositivo de red no encontrado.');

    const equipo = await db.get('SELECT id FROM equipos WHERE id = ? AND is_deleted = 0', [equipoId]);
    if (!equipo) throw new Error('Equipo de inventario no encontrado.');

    // Si el nodo tiene MAC, registrar o asociar interfaz
    if (node.mac_actual) {
      const existingIface = await db.get(
        'SELECT id FROM interfaces_red WHERE equipo_id = ? AND mac = ?',
        [equipoId, node.mac_actual]
      );

      let ifaceId = existingIface?.id;
      if (!ifaceId) {
        const ins = await db.run(
          `INSERT INTO interfaces_red (equipo_id, mac, tipo_interfaz, es_principal)
           VALUES (?, ?, 'ETHERNET', TRUE) RETURNING id`,
          [equipoId, node.mac_actual]
        );
        ifaceId = ins.lastID;
      }

      await db.run(
        'UPDATE dispositivos_red SET interfaz_id = ? WHERE id = ?',
        [ifaceId, dispositivoId]
      );
    }

    return true;
  }
}
