const { prestamosService } = require('../servicios/comunicaciones.service');

const getPrestamos = async (req, res, next) => {
    try {
        const prestamos = await prestamosService.getPrestamos();
        
        // Formatear para compatibilidad si el frontend espera campos planos
        const formatted = prestamos.map(p => ({
            ...p,
            ine: p.equipos?.ine,
            nne: p.equipos?.nne,
            serie: p.equipos?.serie
        }));
        
        res.json(formatted);
    } catch (error) {
        next(error);
    }
};

const crearPrestamo = async (req, res, next) => {
    try {
        const result = await prestamosService.crearPrestamo(req.body);
        res.status(201).json({ id: result.id, success: true });
    } catch (error) {
        next(error);
    }
};

const devolverEquipo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { estado_id_final } = req.body;
        await prestamosService.devolverEquipo(id, estado_id_final);
        res.json({ message: 'Equipo devuelto exitosamente', success: true });
    } catch (error) {
        next(error);
    }
};

const devolverBulkEquipos = async (req, res, next) => {
    try {
        const { ids, estado_id_final } = req.body;
        const result = await prestamosService.devolverBulkEquipos(ids, estado_id_final);
        res.json({ message: 'Equipos devueltos exitosamente', success: true, ...result });
    } catch (error) {
        next(error);
    }
};

const deleteBulkPrestamos = async (req, res, next) => {
    try {
        const { ids } = req.body;
        const result = await prestamosService.deleteBulkPrestamos(ids);
        res.json({ message: 'Registros eliminados exitosamente', success: true, ...result });
    } catch (error) {
        next(error);
    }
};

const limpiarHistorial = async (req, res, next) => {
    try {
        const result = await prestamosService.limpiarHistorial();
        res.json({ message: 'Historial limpiado exitosamente', deletedCount: result.count });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getPrestamos,
    crearPrestamo,
    devolverEquipo,
    devolverBulkEquipos,
    deleteBulkPrestamos,
    limpiarHistorial
};
