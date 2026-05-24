# Control de Equipos 3.0 - Proyecto de Gestión de Inventario

Este proyecto es una aplicación full-stack diseñada para la gestión y control de equipos tecnológicos, permitiendo el seguimiento de inventario, estados, mantenimientos e historial de asignaciones.

## 🚀 Inicio Rápido

El proyecto está dividido en dos partes principales: el **Frontend** (React + Vite) y el **Backend** (Node.js + Express + Prisma/SQLite).

### Requisitos Previos
- Node.js (v18 o superior)
- npm o yarn
- Cloudflared (instalado en `C:\Tunnel`)

### Instalación General
Para instalar las dependencias en ambos directorios:

1. **Backend**:
   ```powershell
   cd backend
   npm install
   ```

2. **Frontend**:
   ```powershell
   cd frontend
   npm install
   ```

## 🌐 Configuración de Acceso Remoto (Cloudflare Tunnels)

Para exponer la aplicación a internet y permitir la sincronización o acceso remoto, utiliza los siguientes comandos (ejecutar en terminales separadas):

### Iniciar Túnel del Backend (Puerto 3000)
```powershell
C:\Tunnel\cloudflared.exe tunnel --url http://localhost:3000
```
*Nota: Copia la URL generada (ej. `https://random-name.trycloudflare.com`) y actualízala en el frontend.*

### Iniciar Túnel del Frontend (Puerto 5173)
```powershell
C:\Tunnel\cloudflared.exe tunnel --url http://localhost:5173
```

## ⚙️ Configuración de la API

Cuando uses los túneles, debes actualizar la URL base de la API en el frontend para que apunte a la dirección del túnel del backend:

1. Abre el archivo: `frontend/src/services/api.js`
2. Cambia la variable `API_BASE`:
   ```javascript
   const API_BASE = "https://tu-url-de-cloudflare.trycloudflare.com/api";
   ```

## 📂 Estructura del Proyecto

- `/frontend`: Interfaz de usuario construida con React, Vite y CSS moderno.
- `/backend`: Servidor API con Express y base de datos SQLite (local) / PostgreSQL (nube).
- `equipos.db`: Base de datos SQLite local.

---
Desarrollado para el Control de Equipos v3.0
