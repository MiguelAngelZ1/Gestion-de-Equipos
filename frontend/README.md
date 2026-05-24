# Frontend - Control de Equipos 3.0

Esta es la interfaz de usuario del sistema de Control de Equipos, desarrollada con React y Vite.

## 🛠️ Tecnologías
- **React**: Biblioteca principal para la UI.
- **Vite**: Herramienta de construcción y servidor de desarrollo.
- **Vanilla CSS**: Estilos personalizados de alta calidad.
- **Lucide React**: Iconografía.

## 🚀 Desarrollo
Para iniciar el servidor de desarrollo:
```powershell
npm run dev
```
El servidor correrá por defecto en: `http://localhost:5173`

## 🌐 Túnel de Cloudflare
Si necesitas exponer el frontend externamente:
```powershell
C:\Tunnel\cloudflared.exe tunnel --url http://localhost:5173
```

## 🔗 Conexión con el Backend
La conexión se configura en `src/services/api.js`. 

**IMPORTANTE:** Si estás usando un túnel para el backend, asegúrate de actualizar la constante `API_BASE` con la URL HTTPS proporcionada por Cloudflare para que las peticiones funcionen correctamente fuera de la red local.

```javascript
// Local
const API_BASE = "http://localhost:3000/api";

// Cloudflare Tunnel (Ejemplo)
const API_BASE = "https://xxxx-xxxx-xxxx.trycloudflare.com/api";
```
