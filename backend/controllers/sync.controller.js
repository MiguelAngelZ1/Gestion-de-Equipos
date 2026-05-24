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
        console.error("❌ [Manual Sync] Error:", error.message);
        res.status(500).json({ 
            success: false, 
            error: "Error durante la sincronización: " + error.message 
        });
    }
};

module.exports = {
    runSync
};
