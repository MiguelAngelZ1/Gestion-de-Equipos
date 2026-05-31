/**
 * Busca coincidencias de una consulta (query) en un objeto (item) de forma profunda y universal.
 * @param {Object} item - El objeto donde buscar (equipo, tarea, historial, etc).
 * @param {string} query - El término de búsqueda.
 * @returns {boolean} - true si hay coincidencia.
 */
export const matchesSearch = (item, query) => {
    if (!query || query.trim() === "") return true;

    const searchLower = query.toLowerCase().trim();
    const seen = new Set();

    // Función recursiva para buscar en valores
    const checkValue = (val) => {
        if (val === null || val === undefined) return false;

        if (typeof val === 'string' || typeof val === 'number') {
            return String(val).toLowerCase().includes(searchLower);
        }

        if (typeof val === 'object') {
            if (seen.has(val)) return false;
            seen.add(val);

            if (Array.isArray(val)) {
                return val.some(item => checkValue(item));
            }

            return Object.values(val).some(item => checkValue(item));
        }

        return false;
    };

    return checkValue(item);
};
