const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
    if (import.meta.env.PROD) return "/api";
    return import.meta.env.VITE_API_BASE || "http://localhost:3000/api";
};
export const API_BASE = getBaseURL();
const USER_DATA_KEY = "equipos_user_data";

export const getAuthToken = () => null;
export const setAuthToken = () => {};
export const removeAuthToken = () => {
    localStorage.removeItem(USER_DATA_KEY);
    apiRequest('/logout', { method: 'POST' }).catch(() => {});
};
export const isAuthenticated = () => !!localStorage.getItem(USER_DATA_KEY);

export const getUserData = () => JSON.parse(localStorage.getItem(USER_DATA_KEY) || "null");
export const setUserData = (userData) => localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

export async function apiRequest(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
        options.body = JSON.stringify(options.body);
    }

    let url = `${API_BASE}${endpoint}`;

    const response = await fetch(url, {
        headers,
        credentials: 'include',
        ...options,
    });

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
}