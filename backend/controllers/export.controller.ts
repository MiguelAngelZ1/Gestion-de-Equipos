const reportingService = require('../services/reporting.service');
const exceljs = require('exceljs');
const { google } = require('googleapis');
const { Readable } = require('stream');

const HEADER_FILL = '1e1b4b';
const HEADER_ACCENT = '4f46e5';
const ALT_ROW_FILL = 'f8fafc';
const BORDER_COLOR = 'e2e8f0';

const { normalizeText } = require('../utils/helpers');

const specValue = (specMap, aliases) => {
    for (const alias of aliases) {
        const value = specMap.get(normalizeText(alias));
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
};

const buildSpecMap = (specs = []) => {
    const map = new Map();
    specs.forEach((spec) => {
        const key = normalizeText(spec.clave);
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, spec.valor || '');
        } else if (spec.valor && !String(map.get(key)).includes(spec.valor)) {
            map.set(key, `${map.get(key)} | ${spec.valor}`);
        }
    });
    return map;
};

const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const applySheetDefaults = (sheet, freezeRows = 1) => {
    sheet.views = [{ state: 'frozen', ySplit: freezeRows }];
    sheet.properties.defaultRowHeight = 20;
    sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
            cell.font = { name: 'Calibri', size: 10 };
            cell.alignment = { vertical: 'top', wrapText: true };
            cell.border = {
                bottom: { style: 'thin', color: { argb: BORDER_COLOR } }
            };
        });

        if (rowNumber > 1 && rowNumber % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW_FILL } };
            });
        }
    });
};

const styleHeader = (sheet) => {
    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
        cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { bottom: { style: 'medium', color: { argb: HEADER_ACCENT } } };
    });
};

const addTableFilter = (sheet) => {
    const lastColumn = sheet.columnCount;
    const lastColumnLetter = sheet.getColumn(lastColumn).letter;
    sheet.autoFilter = { from: 'A1', to: `${lastColumnLetter}1` };
};

const addWorksheet = (workbook, name, columns) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    styleHeader(sheet);
    return sheet;
};

const buildRowData = (eq) => {
    const specs = eq.especificaciones || [];
    const specMap = buildSpecMap(specs);

    return {
        id: eq.id,
        ine: eq.ine || '',
        nne: eq.nne || '',
        serie: eq.serie || '',
        tipo: eq.tipo || '',
        estado: eq.estado || '',
        responsable: eq.responsable || '',
        ubicacion: eq.ubicacion || '',
        cuentaAdmin: specValue(specMap, ['CUENTA ADMIN', 'USUARIO ADMIN', 'ADMIN USER', 'ADMINISTRADOR']),
        passAdmin: specValue(specMap, ['PASS ADMIN', 'PASSWORD ADMIN', 'CONTRASEÑA ADMIN', 'CONTRASENA ADMIN', 'CLAVE ADMIN', 'pASS ADMIN', 'pass admin']),
        cuentaEstandar: specValue(specMap, ['CUENTA ESTANDAR', 'USUARIO ESTANDAR']),
        passEstandar: specValue(specMap, ['PASS ESTANDAR', 'PASSWORD ESTANDAR', 'CONTRASEÑA ESTANDAR', 'CONTRASENA ESTANDAR']),
        passBios: specValue(specMap, ['PASS BIOS', 'PASSWORD BIOS', 'CLAVE BIOS']),
        idRustdesk: specValue(specMap, ['ID RUSTDESK', 'RUSTDESK ID', 'ID Rustdesk']),
        passRustdesk: specValue(specMap, ['PASS RUSTDESK', 'PASSWORD RUSTDESK', 'CLAVE RUSTDESK']),
        ip: specValue(specMap, ['IP', 'DIRECCION IP', 'DIRECCIÓN IP', 'IPV4']),
        mascara: specValue(specMap, ['MASCARA', 'MÁSCARA', 'MASK', 'SUBRED']),
        gateway: specValue(specMap, ['PUERTA DE ENLACE', 'GATEWAY', 'GW']),
        dns1: specValue(specMap, ['DNS 1', 'DNS PRIMARIO', 'DNS1']),
        dns2: specValue(specMap, ['DNS 2', 'DNS SECUNDARIO', 'DNS2']),
        mac: specValue(specMap, ['MAC', 'MAC ADDRESS', 'DIRECCION MAC']),
        procesador: specValue(specMap, ['PROCESADOR', 'CPU']),
        ram: specValue(specMap, ['RAM', 'MEMORIA']),
        disco: specValue(specMap, ['DISCO', 'ALMACENAMIENTO', 'SSD', 'HDD']),
        so: specValue(specMap, ['SO', 'SISTEMA OPERATIVO', 'OS']),
        puerto: specValue(specMap, ['PUERTO']),
        entradasVideo: specValue(specMap, ['ENTRADAS DE VIDEO']),
        createdAt: formatDate(eq.created_at),
        updatedAt: formatDate(eq.updated_at),
        specsTexto: specs.map(s => `${s.clave}: ${s.valor}`).join('\n')
    };
};

const getMissingFields = (row) => {
    const missing = [];

    if (!row.ine) missing.push('INE');
    if (!row.nne && !row.serie) missing.push('NNE o SERIE');
    if (!row.tipo) missing.push('TIPO DE EQUIPO');
    if (!row.estado) missing.push('ESTADO');
    if (!row.ubicacion) missing.push('UBICACION');
    if (!row.cuentaAdmin) missing.push('CUENTA ADMIN');
    if (!row.passAdmin) missing.push('PASS ADMIN');
    if (!row.ip) missing.push('IP');
    if (row.ip && !row.mascara) missing.push('MASCARA');
    if (row.ip && !row.gateway) missing.push('PUERTA DE ENLACE');
    if (row.idRustdesk && !row.passRustdesk) missing.push('PASS RUSTDESK');

    return missing;
};

const groupSpecs = (specs = []) => {
    const groups = {
        credenciales: [],
        red: [],
        hardware: [],
        sistema: [],
        otras: []
    };

    specs.forEach((spec) => {
        const key = normalizeText(spec.clave);
        const line = `${spec.clave}: ${spec.valor}`;

        if (['cuenta', 'pass', 'password', 'contrasena', 'clave', 'rustdesk', 'admin', 'bios'].some(fragment => key.includes(fragment))) {
            groups.credenciales.push(line);
        } else if (['ip', 'mascara', 'mask', 'puerta', 'gateway', 'dns', 'mac', 'puerto'].some(fragment => key.includes(fragment))) {
            groups.red.push(line);
        } else if (['procesador', 'cpu', 'ram', 'memoria', 'disco', 'ssd', 'hdd', 'motherboard', 'video', 'fuente', 'hardware', 'entrada'].some(fragment => key.includes(fragment))) {
            groups.hardware.push(line);
        } else if (['so', 'sistema operativo', 'os', 'software', 'windows', 'linux'].some(fragment => key.includes(fragment))) {
            groups.sistema.push(line);
        } else {
            groups.otras.push(line);
        }
    });

    return Object.fromEntries(
        Object.entries(groups).map(([key, list]) => [key, list.join('\n')])
    );
};

const generarExcelBuffer = async (id) => {
    const equiposFull = await reportingService.getInventarioCompleto(id);

    if (equiposFull.length === 0) {
        throw new Error('No se encontraron equipos para exportar.');
    }

    const workbook = new exceljs.Workbook();
    workbook.creator = 'Control de Equipos 3.0';
    workbook.created = new Date();
    workbook.modified = new Date();

    const rows = equiposFull.map(buildRowData);

    const inventario = addWorksheet(workbook, 'Inventario', [
        { header: 'INE', key: 'ine', width: 20 },
        { header: 'NNE', key: 'nne', width: 22 },
        { header: 'SERIE', key: 'serie', width: 22 },
        { header: 'TIPO DE EQUIPO', key: 'tipo', width: 22 },
        { header: 'ESTADO', key: 'estado', width: 18 },
        { header: 'RESPONSABLE', key: 'responsable', width: 34 },
        { header: 'UBICACION', key: 'ubicacion', width: 24 },
        { header: 'CUENTA ADMIN', key: 'cuentaAdmin', width: 20 },
        { header: 'PASS ADMIN', key: 'passAdmin', width: 24 },
        { header: 'CUENTA ESTANDAR', key: 'cuentaEstandar', width: 20 },
        { header: 'PASS ESTANDAR', key: 'passEstandar', width: 24 },
        { header: 'PASS BIOS', key: 'passBios', width: 18 },
        { header: 'ID RUSTDESK', key: 'idRustdesk', width: 18 },
        { header: 'PASS RUSTDESK', key: 'passRustdesk', width: 22 },
        { header: 'IP', key: 'ip', width: 16 },
        { header: 'MASCARA', key: 'mascara', width: 16 },
        { header: 'PUERTA DE ENLACE', key: 'gateway', width: 18 },
        { header: 'DNS 1', key: 'dns1', width: 18 },
        { header: 'DNS 2', key: 'dns2', width: 18 },
        { header: 'MAC', key: 'mac', width: 20 },
        { header: 'PROCESADOR', key: 'procesador', width: 28 },
        { header: 'RAM', key: 'ram', width: 14 },
        { header: 'DISCO', key: 'disco', width: 24 },
        { header: 'SO', key: 'so', width: 24 },
        { header: 'PUERTO', key: 'puerto', width: 14 },
        { header: 'ENTRADAS DE VIDEO', key: 'entradasVideo', width: 20 },
        { header: 'CREADO', key: 'createdAt', width: 14 },
        { header: 'ACTUALIZADO', key: 'updatedAt', width: 14 },
        { header: 'TODAS LAS ESPECIFICACIONES', key: 'specsTexto', width: 60 }
    ]);

    rows.forEach(row => inventario.addRow(row));
    applySheetDefaults(inventario);
    addTableFilter(inventario);
    inventario.getColumn('passAdmin').font = { name: 'Calibri', size: 10, bold: true, color: { argb: '991b1b' } };
    inventario.getColumn('passRustdesk').font = { name: 'Calibri', size: 10, color: { argb: '075985' } };
    inventario.getColumn('specsTexto').alignment = { vertical: 'top', wrapText: true };

    const credenciales = addWorksheet(workbook, 'Credenciales', [
        { header: 'INE', key: 'ine', width: 20 },
        { header: 'TIPO', key: 'tipo', width: 22 },
        { header: 'UBICACION', key: 'ubicacion', width: 24 },
        { header: 'RESPONSABLE', key: 'responsable', width: 34 },
        { header: 'CUENTA ADMIN', key: 'cuentaAdmin', width: 22 },
        { header: 'PASS ADMIN', key: 'passAdmin', width: 26 },
        { header: 'CUENTA ESTANDAR', key: 'cuentaEstandar', width: 22 },
        { header: 'PASS ESTANDAR', key: 'passEstandar', width: 26 },
        { header: 'PASS BIOS', key: 'passBios', width: 20 },
        { header: 'ID RUSTDESK', key: 'idRustdesk', width: 18 },
        { header: 'PASS RUSTDESK', key: 'passRustdesk', width: 24 },
        { header: 'IP', key: 'ip', width: 16 }
    ]);
    rows
        .filter(row => row.cuentaAdmin || row.passAdmin || row.cuentaEstandar || row.passEstandar || row.passBios || row.idRustdesk || row.passRustdesk)
        .forEach(row => credenciales.addRow(row));
    applySheetDefaults(credenciales);
    addTableFilter(credenciales);
    credenciales.getColumn('passAdmin').font = { name: 'Calibri', size: 10, bold: true, color: { argb: '991b1b' } };

    const red = addWorksheet(workbook, 'Red', [
        { header: 'INE', key: 'ine', width: 20 },
        { header: 'TIPO', key: 'tipo', width: 22 },
        { header: 'UBICACION', key: 'ubicacion', width: 24 },
        { header: 'IP', key: 'ip', width: 16 },
        { header: 'MASCARA', key: 'mascara', width: 16 },
        { header: 'PUERTA DE ENLACE', key: 'gateway', width: 18 },
        { header: 'DNS 1', key: 'dns1', width: 18 },
        { header: 'DNS 2', key: 'dns2', width: 18 },
        { header: 'MAC', key: 'mac', width: 20 },
        { header: 'PUERTO', key: 'puerto', width: 14 }
    ]);
    rows
        .filter(row => row.ip || row.gateway || row.dns1 || row.dns2 || row.mac || row.puerto)
        .forEach(row => red.addRow(row));
    applySheetDefaults(red);
    addTableFilter(red);

    const especificaciones = addWorksheet(workbook, 'Especificaciones', [
        { header: 'INE', key: 'ine', width: 20 },
        { header: 'TIPO', key: 'tipo', width: 22 },
        { header: 'ESTADO', key: 'estado', width: 18 },
        { header: 'UBICACION', key: 'ubicacion', width: 24 },
        { header: 'RESPONSABLE', key: 'responsable', width: 34 },
        { header: 'CREDENCIALES', key: 'credenciales', width: 45 },
        { header: 'RED', key: 'red', width: 38 },
        { header: 'HARDWARE', key: 'hardware', width: 45 },
        { header: 'SISTEMA / SOFTWARE', key: 'sistema', width: 38 },
        { header: 'OTRAS ESPECIFICACIONES', key: 'otras', width: 45 }
    ]);
    equiposFull.forEach((eq) => {
        const base = buildRowData(eq);
        const grouped = groupSpecs(eq.especificaciones || []);
        especificaciones.addRow({
            ine: base.ine,
            tipo: base.tipo,
            estado: base.estado,
            ubicacion: base.ubicacion,
            responsable: base.responsable,
            ...grouped
        });
    });
    applySheetDefaults(especificaciones);
    addTableFilter(especificaciones);

    const faltantes = addWorksheet(workbook, 'Faltantes', [
        { header: 'INE', key: 'ine', width: 20 },
        { header: 'TIPO', key: 'tipo', width: 22 },
        { header: 'ESTADO', key: 'estado', width: 18 },
        { header: 'UBICACION', key: 'ubicacion', width: 24 },
        { header: 'RESPONSABLE', key: 'responsable', width: 34 },
        { header: 'FALTANTES CRITICOS', key: 'faltantes', width: 60 },
        { header: 'CANTIDAD', key: 'cantidad', width: 12 }
    ]);

    rows.forEach((row) => {
        const missing = getMissingFields(row);
        if (missing.length > 0) {
            faltantes.addRow({
                ine: row.ine,
                tipo: row.tipo,
                estado: row.estado,
                ubicacion: row.ubicacion,
                responsable: row.responsable,
                faltantes: missing.join(', '),
                cantidad: missing.length
            });
        }
    });
    applySheetDefaults(faltantes);
    addTableFilter(faltantes);
    faltantes.getColumn('faltantes').font = { name: 'Calibri', size: 10, color: { argb: '991b1b' } };

    [inventario, credenciales, red, especificaciones, faltantes].forEach((sheet) => {
        sheet.getRow(1).commit();
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) row.height = Math.min(90, Math.max(20, row.height || 20));
        });
    });

    return await workbook.xlsx.writeBuffer();
};

const exportarExcel = async (req, res, next) => {
    try {
        const { id } = req.query;
        const buffer = await generarExcelBuffer(id);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=Inventario_Equipos_${new Date().toISOString().split('T')[0]}.xlsx`);
        res.send(buffer);
    } catch (err) {
        next(err);
    }
};

const backupDrive = async (req, res, next) => {
    try {
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        if (!folderId || !clientId || !clientSecret || !refreshToken) {
            return res.status(500).json({ error: 'Falta configuracion de Google Drive en .env' });
        }

        const buffer = await generarExcelBuffer(null);
        const filename = `Copia_Seguridad_Inventario_${new Date().toISOString().split('T')[0]}.xlsx`;

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

        res.json({ success: true, message: 'Respaldo guardado en Google Drive exitosamente.' });
    } catch (err) {
        next(err);
    }
};

module.exports = { exportarExcel, backupDrive, generarExcelBuffer };
