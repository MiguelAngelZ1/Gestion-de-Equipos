# Especificación: UX de Búsqueda y Paginación de Equipos

## Fecha
2026-06-07

## Contexto
La página de Equipos actualmente carga 50 registros al montar (página 1), pero el dashboard
reporta 61 equipos totales. El usuario no ve los 11 restantes porque no hay paginación UI.
Además, la carga inicial es lenta e innecesaria cuando el usuario no está buscando nada.

## Objetivo
- No cargar equipos al montar la página
- Mostrar estado vacío con instrucciones claras ("Busca un equipo...")
- Solo obtener resultados cuando el usuario interactúe con búsqueda o filtros
- Agregar paginación cuando haya más de 50 resultados coincidentes

## Flujo de usuario

### 1. Estado inicial (vacío)
- No se llama a `GET /api/equipos`
- Se muestran: search input, filtros (Estado, Ubicación, Categoría), botón "Nuevo Equipo"
- Área de resultados: mensaje centrado con icono de búsqueda
  - Título: "Busca un equipo"
  - Subtítulo: "Utiliza la búsqueda o los filtros para encontrar equipos en el inventario"
- Los filtros están habilitados desde el inicio (no bloqueados)

### 2. Búsqueda
- Usuario escribe en search → debounce 400ms → `GET /api/equipos?q=termino&page=1&limit=50`
- Si el usuario cambia un filtro (Estado/Ubicación/Categoría) → misma llamada con filtros adicionales
- Loading state: skeleton cards mientras se cargan resultados

### 3. Resultados
- Barra superior: "Mostrando 1-50 de 61 resultados" + controles de paginación
- Grid de equipos (igual que hoy, con AnimatePresence)
- Paginación: botones "Anterior" / "Siguiente" + indicador "Página X de Y"

### 4. Sin resultados
- Mensaje: "No se encontraron equipos" + "Prueba con otros filtros o términos de búsqueda"
- Botón "Restablecer búsqueda" que limpia search + filtros y vuelve al estado vacío

## Cambios técnicos

### Backend: `equipos.service.ts`

Endpoint `GET /api/equipos`:
- Ya soporta `?q=`, `?page=`, `?limit=`
- `limit` por defecto sigue siendo 50
- Devolver `{ data: [...], total, page, limit, totalPages }` en vez de array plano
  - `totalPages = Math.ceil(total / limit)`

### Frontend: `Equipos.tsx`

#### Estados
- `initialEmpty: boolean` — controla si mostramos el estado vacío inicial
- `search: string` — término de búsqueda
- `page: number` — página actual (default 1)
- `total: number` — total de resultados
- `totalPages: number` — páginas totales

#### Lógica
- `useEffect` de montaje: NO llama a `fetchData()`, solo `initialEmpty = true`
- `fetchData(searchTerm, pageNum)` se llama solo cuando:
  - Usuario escribe (debounce 400ms sobre `search`)
  - Usuario cambia filtro (Estado/Ubicación/Categoría)
  - Usuario navega entre páginas
- `fetchData` envía: `?q=${search}&page=${page}&limit=50`
- La respuesta del backend (`{ data, total, totalPages }`) actualiza `equipos`, `total`, `totalPages`

#### Render condicional
- `initialEmpty && !search` → estado vacío
- `loading` → skeleton cards
- `filtered.length === 0` → "No se encontraron equipos"
- `filtered.length > 0` → grid + paginación

#### Componente Paginación
- Barra compacta debajo del contador de resultados
- Botón "Anterior" (deshabilitado en página 1)
- Texto "Página X de Y"
- Botón "Siguiente" (deshabilitado en última página)

### Consideraciones adicionales
- Los filtros de Estado/Ubicación/Categoría se envían como query params al backend
  (`?estado=`, `?ubicacion=`, `?categoria=`)
- Al limpiar filtros: volver al estado vacío inicial
- Al crear/editar/eliminar un equipo: re-fetch con los mismos parámetros actuales
