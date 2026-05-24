const getBaseURL = () => {
    // Si hay una URL de API explícita en el entorno, usarla (Prioridad alta)
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    
    // Si estamos en producción y no hay URL explícita, usamos el path relativo /api (Proxy)
    if (import.meta.env.PROD) return "/api";
    
    // Fallback para desarrollo local
    return import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
};
export const API_BASE = getBaseURL();
const AUTH_TOKEN_KEY = "equipos_admin_token";
const USER_DATA_KEY = "equipos_user_data";

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY);
export const setAuthToken = (token) => localStorage.setItem(AUTH_TOKEN_KEY, token);
export const removeAuthToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
};
export const isAuthenticated = () => !!getAuthToken();

export const getUserData = () => JSON.parse(localStorage.getItem(USER_DATA_KEY) || "null");
export const setUserData = (userData) => localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

export async function apiRequest(endpoint, options = {}) {
    const token = getAuthToken();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    // Stringify body if it's an object
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(options.body);
    }

    // URL base de la petición
    let url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
        headers,
        ...options,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
        if (response.status === 401) {
            removeAuthToken();
            window.dispatchEvent(new Event("auth:unauthorized")); // Global hook dispatch
            throw new Error("No autorizado. Inicie sesión nuevamente.");
        }
        if (response.status === 403) {
            window.dispatchEvent(new Event("auth:forbidden"));
            throw new Error("Acceso denegado: No tiene los permisos necesarios para realizar esta acción.");
        }
        const errorMessage = (data && data.error) ? data.error : `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
    }

    // Si esperamos JSON pero recibimos otra cosa (posible catch-all HTML), lanzamos error
    if (!isJson && response.ok) {
        throw new Error("El servidor devolvió un formato inesperado (HTML). Posiblemente necesite reiniciar el backend.");
    }

    return data;
}
