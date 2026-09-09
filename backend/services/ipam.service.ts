const db = require('../db/database');
const { execFile } = require('child_process');
const { normalizeText } = require('../utils/helpers');
const exceljs = require('exceljs');
const { google } = require('googleapis');
const { Readable } = require('stream');

const IP_KEYS = ['ip', 'direccion ip', 'direccion_ipv4', 'ipv4'];
const MASK_KEYS = ['mascara', 'mask', 'subred', 'netmask'];
const GATEWAY_KEYS = ['gateway', 'puerta de enlace', 'p. enlace', 'gw'];
const DNS1_KEYS = ['dns primario', 'dns1', 'dns principal'];
const DNS2_KEYS = ['dns secundario', 'dns2', 'dns alternativo'];

class IPAMService {
    ipToInt(ip) {
        const parsed = this.parseIp(ip);
        if (!parsed) throw new Error(`IP invalida: ${ip}`);
        return parsed.reduce((acc, octet) => ((acc << 8) + octet) >>> 0, 0);
    }

    intToIp(i) {
        return [
            (i >>> 24) & 255,
            (i >>> 16) & 255,
            (i >>> 8) & 255,
            i & 255
        ].join('.');
    }

    parseIp(value) {
        if (!value || typeof value !== 'string') return null;
        const clean = value.trim();
        if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return null;
        const parts = clean.split('.').map(Number);
        if (parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
        return parts;
    }

    isValidIp(value) {
        return !!this.parseIp(value);
    }

    cidrToMask(cidr) {
        const bits = Number(cidr);
        if (!Number.isInteger(bits) || bits < 0 || bits > 32) {
            throw new Error('CIDR invalido. Use un valor entre 0 y 32.');
        }

        const maskInt = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
        return this.intToIp(maskInt);
    }

    maskToCidr(mask) {
        const maskInt = this.ipToInt(mask);
        const binary = maskInt.toString(2).padStart(32, '0');
        if (!/^1*0*$/.test(binary)) {
            throw new Error('Mascara invalida. Debe ser contigua, por ejemplo 255.255.255.0.');
        }
        return binary.indexOf('0') === -1 ? 32 : binary.indexOf('0');
    }

    normalizeMask(mask = '255.255.255.0') {
        const clean = String(mask || '').trim();
        if (/^\/?\d{1,2}$/.test(clean)) {
            return this.cidrToMask(clean.replace('/', ''));
        }
        if (!this.isValidIp(clean)) {
            throw new Error('Mascara invalida. Use formato /24 o 255.255.255.0.');
        }
        this.maskToCidr(clean);
        return clean;
    }

    getNetworkMeta(segmento, mascara) {
        if (!this.isValidIp(segmento)) {
            throw new Error('Segmento invalido. Use una direccion IPv4 valida.');
        }

        const mask = this.normalizeMask(mascara);
        const maskInt = this.ipToInt(mask);
        const netInt = (this.ipToInt(segmento) & maskInt) >>> 0;
        const totalIps = (0xffffffff - maskInt + 1) >>> 0;
        const broadcastInt = (netInt + totalIps - 1) >>> 0;

        return {
            segmento: this.intToIp(netInt),
            mascara: mask,
            cidr: this.maskToCidr(mask),
            netInt,
            broadcastInt,
            totalIps
        };
    }

    isIpInNetwork(ip, meta) {
        if (!this.isValidIp(ip)) return false;
        const ipInt = this.ipToInt(ip);
        return ipInt >= meta.netInt && ipInt <= meta.broadcastInt;
    }

    isKeyIn(clave, aliases) {
        const normalized = normalizeText(clave);
        return aliases.some(alias => normalized === alias || normalized.includes(alias));
    }

    async getEquipoNetworkRows(): Promise<any[]> {
        return await db.all(`
            SELECT e.equipo_id, e.clave, e.valor
            FROM especificaciones e
            JOIN equipos eq ON e.equipo_id = eq.id
            WHERE eq.is_deleted = 0
        `);
    }

    buildEquipoNetworkMap(rows: any[]) {
        const equipos: any = {};
        rows.forEach(row => {
            if (!equipos[row.equipo_id]) equipos[row.equipo_id] = {};
            if (this.isKeyIn(row.clave, IP_KEYS) && this.isValidIp(row.valor)) equipos[row.equipo_id].ip = row.valor.trim();
            if (this.isKeyIn(row.clave, MASK_KEYS)) equipos[row.equipo_id].mask = row.valor.trim();
            if (this.isKeyIn(row.clave, GATEWAY_KEYS) && this.isValidIp(row.valor)) equipos[row.equipo_id].gateway = row.valor.trim();
        });
        return equipos;
    }

    async getNetworks(userId?: any) {
        const manualRedes: any[] = userId != null
            ? await db.all('SELECT * FROM redes WHERE created_by = ? ORDER BY nombre ASC', [userId])
            : await db.all('SELECT * FROM redes ORDER BY nombre ASC');
        return manualRedes.map((red: any) => {
            try {
                const meta = this.getNetworkMeta(red.segmento, red.mascara);
                return { ...red, segmento: meta.segmento, mascara: meta.mascara, cidr: meta.cidr };
            } catch (_) {
                return { ...red };
            }
        });
    }

    async createNetwork(data, userId?: any) {
        const nombre = String(data?.nombre || '').trim();
        const segmentoInput = String(data?.segmento || '').trim();
        const mascaraInput = String(data?.mascara || data?.cidr || '255.255.255.0').trim();
        const gateway = String(data?.gateway || '').trim();
        const dns = String(data?.dns || '').trim();
        const vlan = data?.vlan === '' || data?.vlan === undefined || data?.vlan === null ? null : Number(data.vlan);

        if (!nombre) throw new Error('El nombre de la red es obligatorio.');
        const meta = this.getNetworkMeta(segmentoInput, mascaraInput);
        if (gateway && !this.isIpInNetwork(gateway, meta)) {
            throw new Error('El gateway debe ser una IP valida dentro del segmento.');
        }
        if (vlan !== null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)) {
            throw new Error('La VLAN debe estar entre 1 y 4094.');
        }

        const duplicated = await db.get(
            userId != null ? 'SELECT id FROM redes WHERE segmento = ? AND mascara = ? AND created_by = ?' : 'SELECT id FROM redes WHERE segmento = ? AND mascara = ?',
            userId != null ? [meta.segmento, meta.mascara, userId] : [meta.segmento, meta.mascara]
        );
        if (duplicated) throw new Error('Ya existe una red manual con ese segmento y mascara.');

        const id = `red_${crypto.randomUUID()}`;
        await db.run(
            'INSERT INTO redes (id, nombre, segmento, mascara, gateway, dns, vlan, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, nombre, meta.segmento, meta.mascara, gateway || null, dns || null, vlan, userId ?? null]
        );
        const netIp = this.intToIp(meta.netInt);
        const broadcastIp = this.intToIp(meta.broadcastInt);
        const toReserve = [
            [netIp, 'Direccion de Red (Segmento)'],
            ...(meta.totalIps > 1 ? [[broadcastIp, 'Direccion de Broadcast']] : []),
            ...(gateway ? [[gateway, 'Puerta de Enlace']] : [])
        ];
        for (const [ip, notas] of toReserve) {
            const exists = await db.get('SELECT id FROM ips_reservadas WHERE red_id = ? AND ip = ?', [id, ip]);
            if (!exists) await db.run('INSERT INTO ips_reservadas (red_id, ip, notas) VALUES (?, ?, ?)', [id, ip, notas]);
        }

        return { id, nombre, segmento: meta.segmento, mascara: meta.mascara, cidr: meta.cidr, gateway, dns, vlan };
    }

    async deleteNetwork(id, userId?: any) {
        if (userId != null) {
            const owner = await db.get('SELECT created_by FROM redes WHERE id = ?', [id]);
            if (!owner) throw new Error('Red no encontrada');
            if (String(owner.created_by) !== String(userId)) throw new Error('No tienes permiso para eliminar esta red');
        }
        await db.run('DELETE FROM redes WHERE id = ?', [id]);
        return { success: true };
    }

    async updateNetwork(id, data, userId?: any) {
        const existing = await db.get('SELECT * FROM redes WHERE id = ?', [id]);
        if (!existing) throw new Error('Red no encontrada.');
        if (userId != null && String(existing.created_by) !== String(userId)) throw new Error('No tienes permiso para editar esta red');

        const nombre = String(data?.nombre || '').trim();
        const segmentoInput = String(data?.segmento || '').trim();
        const mascaraInput = String(data?.mascara || data?.cidr || '255.255.255.0').trim();
        const gateway = String(data?.gateway || '').trim();
        const dns = String(data?.dns || '').trim();
        const vlan = data?.vlan === '' || data?.vlan === undefined || data?.vlan === null ? null : Number(data.vlan);

        if (!nombre) throw new Error('El nombre de la red es obligatorio.');
        const meta = this.getNetworkMeta(segmentoInput, mascaraInput);
        if (gateway && !this.isIpInNetwork(gateway, meta)) {
            throw new Error('El gateway debe ser una IP valida dentro del segmento.');
        }
        if (vlan !== null && (!Number.isInteger(vlan) || vlan < 1 || vlan > 4094)) {
            throw new Error('La VLAN debe estar entre 1 y 4094.');
        }

        const duplicated = await db.get(
            userId != null ? 'SELECT id FROM redes WHERE segmento = ? AND mascara = ? AND created_by = ? AND id != ?' : 'SELECT id FROM redes WHERE segmento = ? AND mascara = ? AND id != ?',
            userId != null ? [meta.segmento, meta.mascara, userId, id] : [meta.segmento, meta.mascara, id]
        );
        if (duplicated) throw new Error('Ya existe otra red manual con ese segmento y mascara.');

        await db.run(
            'UPDATE redes SET nombre = ?, segmento = ?, mascara = ?, gateway = ?, dns = ?, vlan = ? WHERE id = ?',
            [nombre, meta.segmento, meta.mascara, gateway || null, dns || null, vlan, id]
        );
        const netIp = this.intToIp(meta.netInt);
        const broadcastIp = this.intToIp(meta.broadcastInt);
        const toReserve = [
            [netIp, 'Direccion de Red (Segmento)'],
            ...(meta.totalIps > 1 ? [[broadcastIp, 'Direccion de Broadcast']] : []),
            ...(gateway ? [[gateway, 'Puerta de Enlace']] : [])
        ];
        for (const [ip, notas] of toReserve) {
            const exists = await db.get('SELECT id FROM ips_reservadas WHERE red_id = ? AND ip = ?', [id, ip]);
            if (!exists) await db.run('INSERT INTO ips_reservadas (red_id, ip, notas) VALUES (?, ?, ?)', [id, ip, notas]);
        }

        return { id, nombre, segmento: meta.segmento, mascara: meta.mascara, cidr: meta.cidr, gateway, dns, vlan };
    }

    async getNetworkById(redId, userId?: any) {
        const red = await db.get(userId != null ? 'SELECT * FROM redes WHERE id = ? AND created_by = ?' : 'SELECT * FROM redes WHERE id = ?', userId != null ? [redId, userId] : [redId]);
        if (!red) throw new Error('Red no encontrada');
        const meta = this.getNetworkMeta(red.segmento, red.mascara);
        return { ...red, segmento: meta.segmento, mascara: meta.mascara, cidr: meta.cidr };
    }

    async getNetworkDetails(redId: string, userId?: any) {
        const red: any = await this.getNetworkById(redId, userId);
        const meta = this.getNetworkMeta(red.segmento, red.mascara);

        const occupiedRows: any[] = await db.all(`
            SELECT e.clave, e.valor as ip, eq.id as equipo_id, eq.ine, gc.nombre as tipo,
                   COALESCE(u.nombre, u.ubicacion) as ubicacion,
                   TRIM(COALESCE(r.grado, '') || ' ' || COALESCE(r.nombre, '') || ' ' || COALESCE(r.apellido, '')) as responsable,
                   est.nombre as estado, est.color_hex
            FROM especificaciones e
            JOIN equipos eq ON e.equipo_id = eq.id
            LEFT JOIN grupos_comodidad gc ON eq.categoria_id = gc.id
            LEFT JOIN ubicaciones u ON eq.ubicacion_id = u.id
            LEFT JOIN responsables r ON eq.responsable_id = r.id
            LEFT JOIN estados est ON eq.estado_id = est.id
            WHERE eq.is_deleted = 0
        `);

        const occupied = occupiedRows
            .filter(row => this.isKeyIn(row.clave, IP_KEYS))
            .filter(row => this.isValidIp(row.ip) && this.isIpInNetwork(row.ip, meta));

        const allSpecs = await this.getEquipoNetworkRows();
        const equipoNetworkMap: any = this.buildEquipoNetworkMap(allSpecs);
        const detectedGateways = Array.from(new Set(
            (Object.values(equipoNetworkMap) as any[])
                .map((e: any) => e.gateway)
                .filter((ip: string) => ip && this.isIpInNetwork(ip, meta))
        ));

        if (red.gateway && this.isIpInNetwork(red.gateway, meta)) {
            detectedGateways.unshift(red.gateway);
        }

        const reserved: any[] = (await db.all('SELECT * FROM ips_reservadas WHERE red_id = ?', [redId]))
            .filter((row: any) => this.isValidIp(row.ip) && this.isIpInNetwork(row.ip, meta));

        const scannedRows: any[] = await db.all('SELECT ip FROM dispositivos_red WHERE red_id = ?', [redId])
            .then((rows: any[]) => rows.filter((r: any) => this.isValidIp(r.ip) && this.isIpInNetwork(r.ip, meta)))
            .catch(() => []);

        const occupiedByIp = new Map(occupied.map((row: any) => [row.ip, row]));
        const reservedByIp = new Map(reserved.map((row: any) => [row.ip, row]));
        const scannedByIp = new Map(scannedRows.map((r: any) => [r.ip, r]));
        const gateways = new Set(detectedGateways);
        const maxDisplay = 1000;
        const displayLimit = Math.min(meta.totalIps, maxDisplay);

        const ipMap = [];
        for (let i = 0; i < displayLimit; i++) {
            const currentInt = meta.netInt + i;
            const currentIp = this.intToIp(currentInt);
            const occ: any = occupiedByIp.get(currentIp);
            const res: any = reservedByIp.get(currentIp);
            const scanned = scannedByIp.has(currentIp);

            let estado = 'LIBRE';
            let equipo: any = null;
            let notas = '';

            if (res) {
                estado = 'RESERVADA';
                notas = res.notas || '';
                if (occ) {
                    equipo = {
                        id: occ.equipo_id,
                        ine: occ.ine,
                        tipo: occ.tipo,
                        ubicacion: occ.ubicacion,
                        responsable: occ.responsable,
                        estado: occ.estado,
                        color: occ.color_hex
                    };
                } else if (scanned) {
                    notas = res.notas ? res.notas : 'Reservada manualmente';
                }
            } else if (occ) {
                estado = 'OCUPADA';
                equipo = {
                    id: occ.equipo_id,
                    ine: occ.ine,
                    tipo: occ.tipo,
                    ubicacion: occ.ubicacion,
                    responsable: occ.responsable,
                    estado: occ.estado,
                    color: occ.color_hex
                };
            } else if (scanned) {
                estado = 'OCUPADA';
                notas = 'Detectado por escaneo';
            }

            if (currentInt === meta.netInt) {
                estado = 'RESERVADA';
                notas = 'Direccion de Red (Segmento)';
            } else if (currentInt === meta.broadcastInt && meta.totalIps > 1) {
                estado = 'RESERVADA';
                notas = 'Direccion de Broadcast';
            } else if (gateways.has(currentIp)) {
                if (estado !== 'OCUPADA') {
                    estado = 'RESERVADA';
                    notas = 'Puerta de Enlace';
                } else {
                    notas = notas ? `${notas} · Puerta de Enlace (Gateway)` : 'Puerta de Enlace (Gateway)';
                }
            }

            ipMap.push({ ip: currentIp, estado, equipo, notas });
        }

        const occupiedIps = new Set([...occupiedByIp.keys(), ...scannedByIp.keys()]);
        const reservedIps = new Set([
            ...reserved.map(r => r.ip),
            this.intToIp(meta.netInt),
            ...(meta.totalIps > 1 ? [this.intToIp(meta.broadcastInt)] : []),
            ...Array.from(gateways).filter(ip => !occupiedIps.has(ip))
        ]);
        const occupiedCount = occupiedIps.size;
        const reservedCount = reservedIps.size;
        const freeCount = Math.max(0, meta.totalIps - occupiedCount - reservedCount);

        return {
            network: { ...red, gateway: detectedGateways[0] || red.gateway || null, cidr: meta.cidr },
            stats: {
                total: meta.totalIps,
                occupied: occupiedCount,
                reserved: reservedCount,
                free: freeCount,
                shown: displayLimit,
                truncated: meta.totalIps > maxDisplay
            },
            ips: ipMap
        };
    }

    async pingIP(ip) {
        if (!this.isValidIp(ip)) throw new Error('IP invalida.');

        return new Promise((resolve) => {
            const args = process.platform === 'win32'
                ? ['-n', '1', '-w', '1000', ip]
                : ['-c', '1', '-W', '1', ip];

            execFile('ping', args, { timeout: 2000 }, (error) => {
                resolve({ ip, online: !error });
            });
        });
    }

    async pingWithOutput(ip, count = 4) {
        if (!this.isValidIp(ip)) throw new Error('IP invalida.');
        return new Promise((resolve, reject) => {
            const isWin = process.platform === 'win32';
            const args = isWin ? ['-n', String(count), ip] : ['-c', String(count), ip];
            execFile('ping', args, { timeout: 10000, encoding: 'utf8' }, (err, stdout, stderr) => {
                const output = (stdout || stderr || '').trim();
                if (!output) return reject(new Error('Sin salida de ping'));
                resolve({ ip, output });
            });
        });
    }

    async reserveIP(redId, ip, notas, userId?: any) {
        const red = await this.getNetworkById(redId, userId);
        const meta = this.getNetworkMeta(red.segmento, red.mascara);
        if (!this.isIpInNetwork(ip, meta)) throw new Error('La IP no pertenece a la red seleccionada.');

        const ipInt = this.ipToInt(ip);
        if (ipInt === meta.netInt || ipInt === meta.broadcastInt) {
            throw new Error('No se puede reservar la direccion de red ni broadcast.');
        }

        const existing = await db.get('SELECT id FROM ips_reservadas WHERE red_id = ? AND ip = ?', [redId, ip]);
        if (existing) {
            await db.run('UPDATE ips_reservadas SET notas = ? WHERE id = ?', [notas || '', existing.id]);
            return { success: true, updated: true };
        }

        await db.run(
            'INSERT INTO ips_reservadas (red_id, ip, notas) VALUES (?, ?, ?)',
            [redId, ip, notas || '']
        );
        return { success: true };
    }

    async releaseIP(ip) {
        if (!this.isValidIp(ip)) throw new Error('IP invalida.');
        await db.run('DELETE FROM ips_reservadas WHERE ip = ?', [ip]);
        return { success: true };
    }

    async upsertEquipoSpec(equipoId, clave, valor, aliases) {
        if (!valor) return;

        const specs = await db.all('SELECT id, clave FROM especificaciones WHERE equipo_id = ?', [equipoId]);
        const existing = specs.find(spec => this.isKeyIn(spec.clave, aliases));

        if (existing) {
            await db.run('UPDATE especificaciones SET clave = ?, valor = ? WHERE id = ?', [clave, valor, existing.id]);
        } else {
            await db.run('INSERT INTO especificaciones (equipo_id, clave, valor) VALUES (?, ?, ?)', [equipoId, clave, valor]);
        }
    }

    async assignIPToEquipo(redId, ip, equipoId, dns1 = '', dns2 = '', userId?: any) {
        const red = await this.getNetworkById(redId, userId);
        const meta = this.getNetworkMeta(red.segmento, red.mascara);
        if (!this.isIpInNetwork(ip, meta)) throw new Error('La IP no pertenece a la red seleccionada.');

        const equipo = await db.get('SELECT id FROM equipos WHERE id = ? AND is_deleted = 0', [equipoId]);
        if (!equipo) throw new Error('Equipo no encontrado.');

        const details = await this.getNetworkDetails(redId, userId);
        const current = details.ips.find(row => row.ip === ip);
        if (current?.estado === 'OCUPADA' && current.equipo?.id !== equipoId) {
            throw new Error(`La IP ya esta ocupada por el equipo ${current.equipo.ine}.`);
        }

        await this.releaseIP(ip);

        await this.upsertEquipoSpec(equipoId, 'IP', ip, IP_KEYS);
        await this.upsertEquipoSpec(equipoId, 'Mascara', meta.mascara, MASK_KEYS);
        await this.upsertEquipoSpec(equipoId, 'Puerta de Enlace', red.gateway || details.network.gateway || '', GATEWAY_KEYS);
        await this.upsertEquipoSpec(equipoId, 'DNS Primario', dns1, DNS1_KEYS);
        await this.upsertEquipoSpec(equipoId, 'DNS Secundario', dns2, DNS2_KEYS);

        await db.run(
            'INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, ?, ?)',
            [equipoId, 'SISTEMA', 'ASIGNACION IP', `IP ${ip} asignada desde IPAM (${redId}).`]
        );

        return { success: true };
    }

    async unlinkIPFromEquipo(equipoId, ip) {
        if (!this.isValidIp(ip)) throw new Error('IP invalida.');

        const specs = await db.all('SELECT id, clave FROM especificaciones WHERE equipo_id = ?', [equipoId]);
        const ids = specs
            .filter(spec => this.isKeyIn(spec.clave, [...IP_KEYS, ...MASK_KEYS, ...GATEWAY_KEYS, ...DNS1_KEYS, ...DNS2_KEYS]))
            .map(spec => spec.id);

        if (ids.length > 0) {
            const placeholders = ids.map(() => '?').join(',');
            await db.run(`DELETE FROM especificaciones WHERE id IN (${placeholders})`, ids);
        }

        await db.run(
            'INSERT INTO historial_personal (equipo_id, responsable, evento, notas) VALUES (?, ?, ?, ?)',
            [equipoId, 'SISTEMA', 'DESVINCULACION IP', `IP ${ip} desvinculada desde IPAM.`]
        );

        return { success: true };
    }

    async generateExcelBuffer(userId?: any) {
        const redes = await this.getNetworks(userId);
        const workbook = new exceljs.Workbook();
        const usedSheetNames = new Set();

        for (const red of redes) {
            const data = await this.getNetworkDetails(red.id);
            let baseSheetName = String(red.nombre || red.segmento || 'Red')
                .replace(/[*?:\\/[\]]/g, '-')
                .trim()
                .substring(0, 31) || 'Red';
            let sheetName = baseSheetName;
            let index = 2;
            while (usedSheetNames.has(sheetName)) {
                const suffix = ` ${index}`;
                sheetName = `${baseSheetName.substring(0, 31 - suffix.length)}${suffix}`;
                index += 1;
            }
            usedSheetNames.add(sheetName);
            const sheet = workbook.addWorksheet(sheetName);

            sheet.columns = [
                { header: 'IP', key: 'ip', width: 20 },
                { header: 'ESTADO', key: 'estado', width: 15 },
                { header: 'INE EQUIPO', key: 'ine', width: 20 },
                { header: 'TIPO', key: 'tipo', width: 22 },
                { header: 'UBICACION', key: 'ubicacion', width: 25 },
                { header: 'RESPONSABLE', key: 'responsable', width: 35 },
                { header: 'ESTADO EQUIPO', key: 'estado_equipo', width: 20 },
                { header: 'NOTAS / RESERVA', key: 'notas', width: 40 }
            ];

            sheet.getRow(1).eachCell((cell) => {
                cell.font = { bold: true, color: { argb: 'FFFFFF' } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1e1b4b' } };
                cell.alignment = { horizontal: 'center' };
            });

            data.ips.forEach(ip => {
                sheet.addRow({
                    ip: ip.ip,
                    estado: ip.estado,
                    ine: ip.equipo?.ine || '',
                    tipo: ip.equipo?.tipo || '',
                    ubicacion: ip.equipo?.ubicacion || '',
                    responsable: ip.equipo?.responsable || '',
                    estado_equipo: ip.equipo?.estado || '',
                    notas: ip.notas || ''
                });
            });

            sheet.autoFilter = { from: 'A1', to: 'H1' };
        }

        return await workbook.xlsx.writeBuffer();
    }

    async exportToDrive(userId?: any) {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!folderId || !clientId || !clientSecret || !refreshToken) {
            throw new Error('Falta configuracion de Google Drive en .env');
        }

        const buffer = await this.generateExcelBuffer(userId);
        const filename = `Reporte_IPAM_${new Date().toISOString().split('T')[0]}.xlsx`;

        const auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials({ refresh_token: refreshToken });

        const drive = google.drive({ version: 'v3', auth });
        const bufferStream = new Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);

        await drive.files.create({
            requestBody: { name: filename, parents: [folderId] },
            media: {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                body: bufferStream
            }
        });

        return { success: true };
    }
}

module.exports = new IPAMService();
