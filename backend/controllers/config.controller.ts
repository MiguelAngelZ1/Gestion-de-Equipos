const configService = require("../services/config.service");

// --- GRUPO COMODIDAD ---
exports.getGruposComodidad = async (req, res, next) => {
    try {
        const rows = await configService.getGruposComodidad();
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.createGrupoComodidad = async (req, res, next) => {
    try {
        await configService.createGrupoComodidad(req.body.nombre);
        res.status(201).json({ message: "Grupo Comodidad creado" });
    } catch (error) {
        next(error);
    }
};

exports.updateGrupoComodidad = async (req, res, next) => {
    try {
        await configService.updateGrupoComodidad(req.params.id, req.body.nombre);
        res.json({ message: "Grupo Comodidad actualizado" });
    } catch (error) {
        next(error);
    }
};

exports.deleteGrupoComodidad = async (req, res, next) => {
    try {
        await configService.deleteGrupoComodidad(req.params.id);
        res.json({ message: "Grupo Comodidad eliminado" });
    } catch (error) {
        next(error);
    }
};

exports.deleteBulkGruposComodidad = async (req, res, next) => {
    try {
        await configService.deleteBulkGruposComodidad(req.body.ids);
        res.json({ message: "Grupos Comodidad eliminados" });
    } catch (error) {
        next(error);
    }
};

// --- GRADOS ---
exports.getGrados = async (req, res, next) => {
    try {
        const rows = await configService.getGrados();
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.createGrado = async (req, res, next) => {
    try {
        await configService.createGrado(req.body.abreviatura, req.body.grado_completo);
        res.status(201).json({ message: "Grado creado" });
    } catch (error) {
        next(error);
    }
};

exports.updateGrado = async (req, res, next) => {
    try {
        await configService.updateGrado(req.params.id, req.body.abreviatura, req.body.grado_completo);
        res.json({ message: "Grado actualizado" });
    } catch (error) {
        next(error);
    }
};

exports.deleteGrado = async (req, res, next) => {
    try {
        await configService.deleteGrado(req.params.id);
        res.json({ message: "Grado eliminado" });
    } catch (error) {
        next(error);
    }
};

exports.deleteBulkGrados = async (req, res, next) => {
    try {
        await configService.deleteBulkGrados(req.body.ids);
        res.json({ message: "Grados eliminados" });
    } catch (error) {
        next(error);
    }
};

// --- ESTADOS ---
exports.getEstados = async (req, res, next) => {
    try {
        const rows = await configService.getEstados();
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.createEstado = async (req, res, next) => {
    try {
        await configService.createEstado(req.body.nombre, req.body.color_hex);
        res.status(201).json({ message: "Estado creado" });
    } catch (error) {
        next(error);
    }
};

exports.updateEstado = async (req, res, next) => {
    try {
        await configService.updateEstado(req.params.id, req.body.nombre, req.body.color_hex);
        res.json({ message: "Estado actualizado" });
    } catch (error) {
        next(error);
    }
};

exports.deleteEstado = async (req, res, next) => {
    try {
        await configService.deleteEstado(req.params.id);
        res.json({ message: "Estado eliminado" });
    } catch (error) {
        next(error);
    }
};

exports.deleteBulkEstados = async (req, res, next) => {
    try {
        await configService.deleteBulkEstados(req.body.ids);
        res.json({ message: "Estados eliminados" });
    } catch (error) {
        next(error);
    }
};

// --- UBICACIONES ---
exports.getUbicaciones = async (req, res, next) => {
    try {
        const rows = await configService.getUbicaciones();
        res.json(rows);
    } catch (error) {
        next(error);
    }
};

exports.createUbicacion = async (req, res, next) => {
    try {
        await configService.createUbicacion(req.body.nombre);
        res.status(201).json({ message: "Ubicación creada" });
    } catch (error) {
        next(error);
    }
};

exports.updateUbicacion = async (req, res, next) => {
    try {
        await configService.updateUbicacion(req.params.id, req.body.nombre);
        res.json({ message: "Ubicación actualizada" });
    } catch (error) {
        next(error);
    }
};

exports.deleteUbicacion = async (req, res, next) => {
    try {
        await configService.deleteUbicacion(req.params.id);
        res.json({ message: "Ubicación eliminada" });
    } catch (error) {
        next(error);
    }
};

exports.deleteBulkUbicaciones = async (req, res, next) => {
    try {
        await configService.deleteBulkUbicaciones(req.body.ids);
        res.json({ message: "Ubicaciones eliminadas" });
    } catch (error) {
        next(error);
    }
};
