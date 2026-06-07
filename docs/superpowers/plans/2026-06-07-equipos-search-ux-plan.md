# Equipos Search UX + Paginación — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Equipos page to start empty (no initial load), show results only on search/filter interaction, and add server-side pagination.

**Architecture:** Backend changes add 3 new filter params (`?estado=`, `?ubicacion=`, `?categoria=`) to the existing equipos endpoint. Frontend changes rewire `Equipos.tsx` to skip initial fetch, add an empty state message, connect filter dropdowns to server-side calls, and render pagination controls. The backend already returns `{ data, pagination: { total, totalPages } }`.

**Tech Stack:** Express (backend `.ts` via tsx), React 19 + Vite 7 (frontend), SQLite, Framer Motion.

---

### Task 1: Backend — Add filter params to GET /api/equipos

**Files:**
- Modify: `backend/services/equipos.service.ts:5-38`

The endpoint already supports `?q=`, `?page=`, `?limit=`. Add 3 optional params: `?estado=`, `?ubicacion=`, `?categoria=`. Each filters by exact match on the corresponding table name column.

- [ ] **Step 1: Add filter params to the WHERE clause in `getAllEquipos`**

Replace lines 4-38:

```ts
async getAllEquipos(query) {
    const { q, page = 1, limit = 50, offset = 0, estado, ubicacion, categoria } = query;

    const fromClause = `
        FROM equipos e
        LEFT JOIN grupos_comodidad gc ON e.categoria_id = gc.id
        LEFT JOIN estados es ON e.estado_id = es.id
        LEFT JOIN ubicaciones u ON e.ubicacion_id = u.id
        LEFT JOIN responsables r ON e.responsable_id = r.id
    `;

    let whereClause = "WHERE e.is_deleted = false";
    const params = [];

    if (q && q.trim() !== "") {
        const search = `%${q.trim()}%`;
        whereClause += ` AND (
            e.ine LIKE ? OR 
            e.nne LIKE ? OR 
            e.serie LIKE ? OR 
            gc.nombre LIKE ? OR 
            es.nombre LIKE ? OR 
            u.nombre LIKE ? OR 
            u.ubicacion LIKE ? OR
            r.nombre LIKE ? OR 
            r.apellido LIKE ? OR
            r.grado LIKE ? OR
            EXISTS (
                SELECT 1 FROM especificaciones esp 
                WHERE esp.equipo_id = e.id 
                AND (esp.clave LIKE ? OR esp.valor LIKE ?)
            )
        )`;
        for(let i=0; i<12; i++) params.push(search);
    }

    if (estado && estado.trim() !== "") {
        whereClause += " AND es.nombre = ?";
        params.push(estado.trim());
    }

    if (ubicacion && ubicacion.trim() !== "") {
        whereClause += " AND u.nombre = ?";
        params.push(ubicacion.trim());
    }

    if (categoria && categoria.trim() !== "") {
        whereClause += " AND gc.nombre = ?";
        params.push(categoria.trim());
    }
```

The rest of the method (lines 40-79) stays unchanged.

- [ ] **Step 2: Verify the backend change**

Run: `npx tsx -e "const s = require('./services/equipos.service'); s.getAllEquipos({estado:'En Servicio', limit:5}).then(r => console.log(JSON.stringify({total: r.pagination.total, count: r.data.length}))).catch(e => console.error(e))"` from `backend/`

Expected: Returns filtered results by estado name.

- [ ] **Step 3: Commit**

```bash
git add backend/services/equipos.service.ts
git commit -m "feat: add estado/ubicacion/categoria filter params to equipos endpoint"
```

---

### Task 2: Frontend — Remove initial fetch, add empty state

**Files:**
- Modify: `frontend/src/pages/Equipos.tsx:64-142`

Remove the initial `fetchData()` call from `useEffect`. Add an `initialEmpty` state (no need for a separate variable — use `search === "" && !loading && equipos.length === 0 && fetchedOnce` logic). Track whether user has ever searched.

- [ ] **Step 1: Add `fetchedOnce` ref and skip initial fetch**

Add after line 64 (state declarations):

```tsx
const fetchedOnce = useRef(false);
```

Replace lines 130-132:

```tsx
useEffect(() => {
    // No cargar equipos al montar — esperar a que usuario busque
}, []);
```

- [ ] **Step 2: Update `fetchData` to mark `fetchedOnce`**

At the end of the `fetchData` function (after `setLoading(false)` inside `finally`), add:

```tsx
fetchedOnce.current = true;
```

- [ ] **Step 3: Add empty state render section**

In the main return (`return (`), after the header/filters section (line 291) and before the grid section (line 295), add a conditional block:

Replace lines 295-370 (the entire grid/loading/no-results section) with:

```tsx
{/* Content area */}
<div>
    {!fetchedOnce.current ? (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-[3rem] border border-dashed border-white/10"
        >
            <Search className="w-16 h-16 text-slate-500 mb-4 opacity-20" />
            <h3 className="text-2xl font-black text-white">Busca un equipo</h3>
            <p className="text-slate-400 mt-2 max-w-md text-center">
                Utiliza la búsqueda o los filtros para encontrar equipos en el inventario.
            </p>
        </motion.div>
    ) : loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white/5 rounded-3xl h-52 animate-pulse border border-white/5"></div>
            ))}
        </div>
    ) : filtered.length === 0 ? (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-[3rem] border border-dashed border-white/10"
        >
            <Server className="w-12 h-12 text-slate-500 mb-4 opacity-20" />
            <h3 className="text-xl font-black text-white">No se encontraron equipos</h3>
            <p className="text-slate-400 mt-2">Prueba con otros filtros o términos de búsqueda.</p>
            <button
                onClick={clearFilters}
                className="mt-6 text-indigo-400 font-black text-xs uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
            >
                Restablecer búsqueda
            </button>
        </motion.div>
    ) : (
        // grid + pagination section (moved to Task 3)
        null
    )}
</div>
```

Add `Search` to the lucide-react imports at line 5:

```tsx
import { Server, User, MapPin, Tag, Info, Plus, Search, Sliders, X, Filter, Calendar, CheckSquare, Square, Trash2, CheckCircle, Check } from 'lucide-react';
```

Make sure the grid rendering section is extracted into a separate block for Task 3.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Equipos.tsx
git commit -m "feat: equipos page starts empty, results on search"
```

---

### Task 3: Frontend — Wire filters and search to server-side calls

**Files:**
- Modify: `frontend/src/pages/Equipos.tsx:105-142`

When the user types in search (already debounced) OR changes a filter dropdown, call `fetchData` with the current search term AND filter values. The filter changes need to trigger refetch.

- [ ] **Step 1: Pass filter values to `fetchData`**

Update `fetchData` to accept and send filter params:

```tsx
const fetchData = async (searchTerm = "", estadoFilter = "TODOS", ubicacionFilter = "TODAS", categoriaFilter = "TODOS", pageNum = 1) => {
    try {
        setLoading(true);
        const params = new URLSearchParams();
        if (searchTerm) params.set('q', searchTerm);
        if (estadoFilter && estadoFilter !== "TODOS") params.set('estado', estadoFilter);
        if (ubicacionFilter && ubicacionFilter !== "TODAS") params.set('ubicacion', ubicacionFilter);
        if (categoriaFilter && categoriaFilter !== "TODOS") params.set('categoria', categoriaFilter);
        params.set('page', String(pageNum));
        params.set('limit', '50');
        const query = `/equipos?${params.toString()}`;
        const [eData, ueData, gcData, sData, uData] = await Promise.all([
            apiRequest(query),
            apiRequest('/config/grados').catch(() => []),
            apiRequest('/config/grupos-comodidad').catch(() => []),
            apiRequest('/config/estados').catch(() => []),
            apiRequest('/config/ubicaciones').catch(() => [])
        ]);
        setEquipos(eData?.data || eData || []);
        setTotal(eData?.pagination?.total || 0);
        setTotalPages(eData?.pagination?.totalPages || 0);
        setCurrentPage(eData?.pagination?.page || 1);
        setGrados(ueData);
        setGruposComodidad(gcData);
        setEstados(sData);
        setUbicaciones(uData);
    } catch (error) {
        showToast("Error", "No se pudieron cargar los datos del inventario.", "error");
    } finally {
        setLoading(false);
        fetchedOnce.current = true;
    }
};
```

- [ ] **Step 2: Add pagination state variables**

After line 76 (`const [filterGrupo, setFilterGrupo] = useState("TODOS");`), add:

```tsx
const [currentPage, setCurrentPage] = useState(1);
const [total, setTotal] = useState(0);
const [totalPages, setTotalPages] = useState(0);
```

- [ ] **Step 3: Update debounce effect to use current filter values**

Replace lines 134-142:

```tsx
useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
        fetchData(search, filterEstado, filterUbicacion, filterGrupo, 1);
    }, 400);
    return () => {
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
}, [search]);
```

- [ ] **Step 4: Add useEffect for filter dropdown changes**

Add after the search debounce effect:

```tsx
useEffect(() => {
    if (fetchedOnce.current) {
        fetchData(search, filterEstado, filterUbicacion, filterGrupo, 1);
    }
}, [filterEstado, filterUbicacion, filterGrupo]);
```

- [ ] **Step 5: Remove client-side filtering**

Replace lines 194-200 (the `filtered` computation):

```tsx
const filtered = equipos;
```

Since filtering is now done server-side, the `filtered` array is just the data returned from the server. The `matchesSearch` client-side filter is no longer needed (but keep the import, it may be used elsewhere).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Equipos.tsx
git commit -m "feat: wire filter dropdowns to server-side queries"
```

---

### Task 4: Frontend — Add pagination UI

**Files:**
- Modify: `frontend/src/pages/Equipos.tsx`

When `filtered.length > 0`, render pagination controls below the results counter bar.

- [ ] **Step 1: Add pagination navigation function**

```tsx
const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    fetchData(search, filterEstado, filterUbicacion, filterGrupo, pageNum);
};
```

- [ ] **Step 2: Add pagination component in the results header**

In the results section (where "Resultados: 50" is shown, around line 339-342), replace the simple counter with a combined counter + pagination bar:

```tsx
<div className="flex items-center gap-3 px-2">
    <div className="h-px bg-white/10 flex-1"></div>
    <div className="flex items-center gap-6">
        {userRole === ROLES.ADMIN && filtered.length > 0 && (
            <button 
                onClick={toggleAll}
                className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors cursor-pointer group"
            >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    filtered.every(e => selectedIds.includes(e.id)) 
                        ? 'bg-indigo-600 border-indigo-500' 
                        : 'border-white/20 group-hover:border-indigo-500/50'
                }`}>
                    {filtered.every(e => selectedIds.includes(e.id)) && <Check className="w-3 h-3 text-white" />}
                </div>
                Seleccionar Todo
            </button>
        )}
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span className="text-indigo-400">{total}</span> resultado{total !== 1 ? 's' : ''}
            {totalPages > 1 && <> &mdash; Pág. <span className="text-indigo-400">{currentPage}</span> de {totalPages}</>}
        </h2>
        {totalPages > 1 && (
            <div className="flex items-center gap-2">
                <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-300"
                >
                    Anterior
                </button>
                <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed bg-white/5 hover:bg-white/10 text-slate-300"
                >
                    Siguiente
                </button>
            </div>
        )}
    </div>
    <div className="h-px bg-white/10 flex-1"></div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Equipos.tsx
git commit -m "feat: add pagination controls to equipos results"
```

---

### Task 5: Frontend — Update mutations to maintain current search context

**Files:**
- Modify: `frontend/src/pages/Equipos.tsx`

After any mutation (create, edit, delete, bulk delete, loan), the re-fetch should use the current search/filter/page state.

- [ ] **Step 1: Replace all `fetchData()` calls inside mutation callbacks with `fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)`**

Search for every `fetchData(` call (there are ~6: in handleBulkDelete, after form save, after loan, after single delete). Each one should preserve the current search context:

| Line context | Current call | Replace with |
|---|---|---|
| `handleBulkDelete` line 173 | `fetchData(search)` | `fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)` |
| Form save success callback line 443 | `fetchData(search)` | `fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)` |
| Loan confirm callback line 480 | `fetchData(search)` | `fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)` |
| Single delete confirm line 499 | `fetchData(search)` | `fetchData(search, filterEstado, filterUbicacion, filterGrupo, currentPage)` |

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Equipos.tsx
git commit -m "fix: preserve search context after mutations"
```

---

### Task 6: Verify build

**Files:**
- Verify: both backend and frontend

- [ ] **Step 1: Run frontend build**

Run: `npx vite build` from `frontend/`

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run backend typecheck**

Run: `npx tsc --noEmit` from `backend/`

Expected: No type errors.

- [ ] **Step 3: Final commit with any build fixes**

```bash
git add -A
git commit -m "chore: fix build after search UX changes"
```
