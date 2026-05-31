const syncScript = require('../db/sync');

const runSync = async (req, res, next) => {
    try {
        // Ejecutar la sincronización
        const result = await syncScript.sync();
        
        res.json({ 
            success: true, 
            message: "Sincronización completada exitosamente",
            result: result 
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    runSync
};
