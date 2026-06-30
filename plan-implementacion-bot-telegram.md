# Plan de Implementacion - Bot Telegram

## Resumen

Este plan consolida la auditoria y el rediseño del bot de Telegram de Control de Equipos 3.0. El objetivo es que el bot sea estable, seguro y comodo de usar desde el chat: botones tactiles cuando aportan valor, escritura minima cuando el dato es especifico, y resultados largos controlados con resumen y paginacion.

El flujo de contrasenas se toma como referencia porque ya funciona bien: el usuario elige con botones hasta llegar al unico dato que realmente debe escribir, como INE, NNE o numero de serie.

## Problemas Detectados

1. El bot muestra listados largos demasiado pronto.
   - Responsables y ubicaciones se listan completos al pedir una busqueda.
   - Esto ensucia el chat y escala mal cuando crecen los datos.

2. Las respuestas largas pueden romper Telegram.
   - Telegram limita los mensajes a 4096 caracteres.
   - Listados por estado, ubicacion o responsable pueden superar ese limite con mas datos.

3. Las respuestas usan Markdown con datos de base sin escape.
   - Si una ubicacion, especificacion, usuario o contrasena contiene caracteres especiales, Telegram puede rechazar el mensaje.

4. Algunas consultas pueden dar falsos negativos.
   - Hay claves de especificaciones con diferencias de mayusculas/minusculas, por ejemplo `PASS ADMIN`, `pass admin`, `pASS ADMIN`, `SO` y `so`.
   - El bot filtra varias claves por igualdad exacta.

5. La opcion MAC no esta aislada.
   - Actualmente comparte logica con datos de red y puede devolver mas informacion que la solicitada.

6. La busqueda por INE puede ser ambigua.
   - `findEquipo()` usa coincidencia parcial y `LIMIT 1`, por lo que puede devolver el primer equipo que coincida aunque no sea el esperado.

7. La sesion conserva datos anteriores.
   - `setState()` mezcla nuevos campos con los viejos.
   - Esto puede dejar `subMenu`, `awaitingType` o claves temporales colgadas entre flujos.

8. La seguridad actual es basica.
   - `TELEGRAM_ALLOWED_USERS` existe y debe mantenerse.
   - Si se comparte el bot, conviene sumar clave de invitacion para registrar usuarios autorizados.

## Criterios de UX

1. Valores cortos y controlados se muestran con botones.
   - Estados: `E/S`, `F/S`, `MANT`, `PRESTAMO`.
   - Menus principales y submenus.
   - Acciones posteriores: `Ver mas`, `Filtrar`, `Nueva busqueda`, `Menu`, `Salir`.

2. Valores largos o variables se escriben primero.
   - Responsables.
   - Ubicaciones.
   - INE, NNE, serie, IP y texto libre.

3. Opciones de ayuda solo como ultima instancia.
   - En responsables y ubicaciones, el bot pide texto primero.
   - Si no hay coincidencias, ofrece `Buscar por opciones`.
   - Si hay varias coincidencias, muestra solo las primeras 5 opciones.

4. No listar todo automaticamente.
   - Para resultados grandes, responder primero con conteo y resumen.
   - Mostrar como maximo 10 equipos por pagina.
   - Incluir boton `Ver mas` cuando queden resultados.

## Cambios de Implementacion

### 1. Capa comun de respuestas

Crear helpers para centralizar las respuestas del bot:

- `replySafe(ctx, text, options)`: responde escapando Markdown o usando texto plano seguro.
- `replyChunks(ctx, text, options)`: divide mensajes largos en partes seguras.
- `replyResult(ctx, text, options)`: agrega teclado de resultado de forma consistente.
- `buildPagedResult(items, page, pageSize)`: arma resultados paginados.

Todas las respuestas del bot deben pasar por esta capa, no llamar `ctx.reply()` directamente desde cada rama del flujo.

### 2. Estado de conversacion

Reemplazar la mutacion acumulativa de sesion por transiciones limpias:

- `setState(chatId, state, data)` debe reemplazar el contexto temporal anterior.
- `resetSession(chatId)` sigue eliminando la sesion.
- Acciones globales:
  - `menu` vuelve al menu principal.
  - `volver` vuelve al nivel anterior cuando exista.
  - `salir` limpia la sesion.

Cada flujo debe saber en que paso esta y que dato espera.

### 3. Flujos de cantidad

Mantener:

- Total general directo.
- Por estado con botones.

Cambiar:

- Por ubicacion: pedir texto primero, no listar ubicaciones completas.
- Por responsable: pedir texto primero, no listar responsables completos.

Si hay varias coincidencias, mostrar hasta 5 botones. Si no hay coincidencias, ofrecer ayuda con opciones.

### 4. Flujos de listados

Cambiar el menu para evitar listados completos de responsables o ubicaciones.

Nuevo comportamiento:

- Listado por estado:
  - Mostrar botones de estado.
  - Responder con conteo y primeros 10 equipos.
  - Boton `Ver mas` si hay mas resultados.

- Listado por ubicacion:
  - Pedir texto.
  - Resolver coincidencias.
  - Mostrar conteo y primeros 10 equipos.

- Listado por responsable:
  - Pedir texto.
  - Resolver coincidencias.
  - Mostrar conteo y primeros 10 equipos.

Eliminar o esconder como flujo principal:

- `Todas ubicaciones`.
- `Todos responsables`.

Estas opciones solo deben aparecer como ayuda contextual y con limite.

### 5. Credenciales y hardware

Normalizar claves de especificaciones antes de comparar:

- Comparar en mayusculas y sin espacios redundantes.
- `PASS ADMIN`, `pass admin` y `pASS ADMIN` deben matchear igual.
- `SO` y `so` deben matchear igual.

El flujo de credenciales debe mantener el patron actual:

1. Elegir tipo de credencial con botones.
2. Pedir INE, NNE o serie.
3. Mostrar resultado.
4. Ofrecer acciones posteriores.

### 6. Red y MAC

Separar la respuesta de MAC:

- `MAC` devuelve solo claves MAC.
- `Datos red` devuelve IP, mascara, puerta de enlace y DNS.
- `Todo red` devuelve todos los datos de red disponibles.
- `Buscar IP` sigue buscando por valor de IP.

### 7. Seguridad

Mantener `TELEGRAM_ALLOWED_USERS` como control principal.

Agregar clave de invitacion opcional:

- Variable sugerida: `TELEGRAM_INVITE_PASSWORD`.
- Si un usuario no esta autorizado, el bot ofrece ingresar clave.
- Si la clave es correcta, se registra el `chatId` o `userId` como autorizado.
- La lista de autorizados persistentes puede guardarse en base de datos o archivo controlado por backend.

Importante:

- No mostrar la clave ingresada en respuestas.
- Registrar intentos fallidos con rate limit.
- Rotar secretos si el repo privado fue compartido o si algun token estuvo expuesto en documentacion.

## Pruebas Requeridas

### Unitarias

- Normalizacion de botones.
- Normalizacion de claves de especificaciones.
- Escape o modo seguro de Markdown.
- Division de mensajes largos.
- Paginacion.
- Transiciones limpias de sesion.

### Conversacion simulada

Cubrir estos flujos:

- Inicio y menu principal.
- Contrasenas por `PASS ADMIN`.
- Todas las credenciales.
- Cantidad por estado.
- Cantidad por responsable con texto.
- Listado por estado con paginacion.
- Listado por ubicacion con busqueda.
- Listado por responsable con multiples coincidencias.
- MAC aislada.
- Buscar IP.
- Info completa.
- Sin resultados.
- Volver, menu y salir desde estados intermedios.
- Usuario no autorizado.
- Alta por clave de invitacion.

### Verificacion manual

- Probar desde Telegram real con un usuario autorizado.
- Probar con un usuario no autorizado.
- Probar resultados grandes.
- Probar valores con caracteres especiales en especificaciones.

## Orden de Trabajo

1. Crear helpers de respuesta segura.
2. Refactorizar sesion y acciones globales.
3. Ajustar normalizacion de botones y claves.
4. Cambiar flujos de cantidad/listados para no mostrar listas largas de entrada.
5. Separar red, MAC y todo red.
6. Agregar paginacion.
7. Agregar seguridad por clave de invitacion.
8. Agregar pruebas unitarias y conversacionales.
9. Verificar en local.
10. Probar en Telegram real.

## Criterios de Aceptacion

- El bot no lista responsables ni ubicaciones completas al iniciar una consulta.
- Estados se muestran como botones.
- Los resultados largos se resumen y se paginan.
- Ninguna respuesta supera el limite de Telegram.
- Las claves de especificaciones matchean sin depender de mayusculas/minusculas.
- La opcion MAC devuelve solo MAC.
- El bot mantiene el contexto cuando no encuentra resultados.
- Usuarios no autorizados no pueden consultar datos.
- Un usuario invitado puede habilitarse con clave si la configuracion lo permite.
- Las pruebas principales del bot pasan.
