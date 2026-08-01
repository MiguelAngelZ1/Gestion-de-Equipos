const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.PROD) return "/api";
    return import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
};
export const API_BASE = getBaseURL();
const USER_DATA_KEY = "equipos_user_data";
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 2;

export const getAuthToken = () => null;
export const removeAuthToken = () => {
    localStorage.removeItem(USER_DATA_KEY);
    window.dispatchEvent(new Event("auth:unauthorized"));
};

export const getUserData = () => JSON.parse(localStorage.getItem(USER_DATA_KEY) || "null");

export async function apiRequest(endpoint: string, options: Record<string, any> = {}, retries = MAX_RETRIES) {
    if (!navigator.onLine) {
        throw new Error("Sin conexión a internet. Verifica tu red.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(options.body);
    }

    const url = `${API_BASE}${endpoint}`;

    try {
        const response = await fetch(url, {
            headers,
            credentials: 'include',
            signal: controller.signal,
            ...options,
        });

        clearTimeout(timeoutId);

        const isJson = response.headers.get("content-type")?.includes("application/json");
        const data = isJson ? await response.json() : null;

        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem(USER_DATA_KEY);
                window.dispatchEvent(new Event("auth:unauthorized"));
                throw new Error("No autorizado. Inicie sesión nuevamente.");
            }
            if (response.status === 403) {
                window.dispatchEvent(new Event("auth:forbidden"));
                throw new Error("Acceso denegado: No tiene los permisos necesarios para realizar esta acción.");
            }
            const errorMessage = (data && data.error) ? data.error : `Error ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        if (!isJson && response.ok) {
            throw new Error("El servidor devolvió un formato inesperado (HTML). Posiblemente necesite reiniciar el backend.");
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error(`La solicitud tardó demasiado (${REQUEST_TIMEOUT / 1000}s). Intenta nuevamente.`);
        }

        if (retries > 0 && !error.message.includes('No autorizado') && !error.message.includes('Acceso denegado')) {
            const delay = Math.min(1000 * Math.pow(2, MAX_RETRIES - retries), 4000);
            await new Promise(r => setTimeout(r, delay));
            return apiRequest(endpoint, options, retries - 1);
        }

        throw error;
    }
}
