# Backend - Control de Equipos 3.0

Servidor API para el sistema de gestión de inventario tecnológico.

## 🛠️ Tecnologías
- **Node.js**: Entorno de ejecución.
- **Express**: Framework para la API REST.
- **SQLite**: Base de datos local por defecto.
- **Prisma**: ORM para gestión de esquemas y consultas.
- **ExcelJS**: Generación de reportes en Excel.

## 🚀 Desarrollo
Para iniciar el servidor:
```powershell
npm run dev
```
El servidor escuchará en el puerto: `3000`

## 📊 Base de Datos
- El archivo local es `equipos.db` en la raíz del proyecto.
- Se utiliza Prisma como cliente de base de datos (`prismaClient.js`).

## 🌐 Túnel de Cloudflare
Para permitir que el frontend se conecte de forma remota o sincronice datos:
```powershell
C:\Tunnel\cloudflared.exe tunnel --url http://localhost:3000
```
Cuando inicies este comando, Cloudflare te dará una URL (ej. `https://random-name.trycloudflare.com`). **Esta es la URL que debes poner en el archivo `api.js` del frontend.**

## 📂 Endpoints Principales
- `/api/auth`: Autenticación de usuarios.
- `/api/equipos`: CRUD de equipos tecnológicos.
- `/api/config`: Configuración de estados y categorías.
- `/api/exportar-nube`: Generación de reportes y sincronización.
