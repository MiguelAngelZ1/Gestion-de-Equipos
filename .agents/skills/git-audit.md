# Skill: Git Audit
Description: Audita el historial de Git, busca secretos filtrados y verifica la higiene del repositorio.

## Instrucciones
1. Ejecuta `git log` para revisar los patrones de commit.
2. Escanea archivos sensibles ( .env, *.pem, google-credentials.json ) para asegurar que no estén en el historial.
3. Verifica que `.gitignore` esté correctamente configurado.

## Herramientas Sugeridas
- `grep_search`: Para buscar cadenas de secretos en el historial de archivos.
- `run_command`: Para ejecutar comandos git de auditoría.
