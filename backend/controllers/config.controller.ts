const configService = require('../services/config.service');
const { asyncHandler } = require('../utils/helpers');

// --- GRUPO COMODIDAD ---
exports.getGruposComodidad = asyncHandler(async (req, res) => {
    res.json(await configService.getGruposComodidad());
});

exports.createGrupoComodidad = asyncHandler(async (req, res) => {
    await configService.createGrupoComodidad(req.body.nombre);
    res.status(201).json({ message: 'Grupo Comodidad creado' });
});

exports.updateGrupoComodidad = asyncHandler(async (req, res) => {
    await configService.updateGrupoComodidad(req.params.id, req.body.nombre);
    res.json({ message: 'Grupo Comodidad actualizado' });
});

exports.deleteGrupoComodidad = asyncHandler(async (req, res) => {
    await configService.deleteGrupoComodidad(req.params.id);
    res.json({ message: 'Grupo Comodidad eliminado' });
});

exports.deleteBulkGruposComodidad = asyncHandler(async (req, res) => {
    await configService.deleteBulkGruposComodidad(req.body.ids);
    res.json({ message: 'Grupos Comodidad eliminados' });
});

// --- GRADOS ---
exports.getGrados = asyncHandler(async (req, res) => {
    res.json(await configService.getGrados());
});

exports.createGrado = asyncHandler(async (req, res) => {
    await configService.createGrado(req.body.abreviatura, req.body.grado_completo);
    res.status(201).json({ message: 'Grado creado' });
});

exports.updateGrado = asyncHandler(async (req, res) => {
    await configService.updateGrado(req.params.id, req.body.abreviatura, req.body.grado_completo);
    res.json({ message: 'Grado actualizado' });
});

exports.deleteGrado = asyncHandler(async (req, res) => {
    await configService.deleteGrado(req.params.id);
    res.json({ message: 'Grado eliminado' });
});

exports.deleteBulkGrados = asyncHandler(async (req, res) => {
    await configService.deleteBulkGrados(req.body.ids);
    res.json({ message: 'Grados eliminados' });
});

// --- ESTADOS ---
exports.getEstados = asyncHandler(async (req, res) => {
    res.json(await configService.getEstados());
});

exports.createEstado = asyncHandler(async (req, res) => {
    await configService.createEstado(req.body.nombre, req.body.color_hex);
    res.status(201).json({ message: 'Estado creado' });
});

exports.updateEstado = asyncHandler(async (req, res) => {
    await configService.updateEstado(req.params.id, req.body.nombre, req.body.color_hex);
    res.json({ message: 'Estado actualizado' });
});

exports.deleteEstado = asyncHandler(async (req, res) => {
    await configService.deleteEstado(req.params.id);
    res.json({ message: 'Estado eliminado' });
});

exports.deleteBulkEstados = asyncHandler(async (req, res) => {
    await configService.deleteBulkEstados(req.body.ids);
    res.json({ message: 'Estados eliminados' });
});

// --- UBICACIONES ---
exports.getUbicaciones = asyncHandler(async (req, res) => {
    res.json(await configService.getUbicaciones());
});

exports.createUbicacion = asyncHandler(async (req, res) => {
    await configService.createUbicacion(req.body.nombre);
    res.status(201).json({ message: 'Ubicación creada' });
});

exports.updateUbicacion = asyncHandler(async (req, res) => {
    await configService.updateUbicacion(req.params.id, req.body.nombre);
    res.json({ message: 'Ubicación actualizada' });
});

exports.deleteUbicacion = asyncHandler(async (req, res) => {
    await configService.deleteUbicacion(req.params.id);
    res.json({ message: 'Ubicación eliminado' });
});

exports.deleteBulkUbicaciones = asyncHandler(async (req, res) => {
    await configService.deleteBulkUbicaciones(req.body.ids);
    res.json({ message: 'Ubicaciones eliminadas' });
});
