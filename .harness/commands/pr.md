---
description: Crea un Pull Request en GitHub con título y descripción generados automáticamente
agent: orchestrator
---

# Comando: Pull Request

Crea un Pull Request en GitHub usando la cuenta autenticada.

## Proceso

1. Verifica que `gh` está autenticado (`gh auth status`)
2. Confirma que NO estamos en la rama `main`
3. Obtiene el diff de cambios con `git diff main...HEAD --stat` y `git diff main...HEAD`
4. Genera un título y descripción en inglés representativos de los cambios
5. Muestra al usuario el resumen y pide confirmación antes de crear el PR
6. Si el usuario confirma, ejecuta `gh pr create --assignee "@me"` con el título y body generados
7. Devuelve la URL del PR creado

## Formato del PR

- **Título**: formato `tipo: descripción` (ej: `feat: add public website and branch convention`)
- **Cuerpo**: incluir lista de cambios, archivos modificados y propósito

## Reglas

- El título y descripción deben ser en **inglés**
- No hacer `git add`, `git commit` ni `git push` por cuenta propia — `gh pr create` lo maneja internamente
- Si el PR ya existe para la rama actual, informarlo y no duplicarlo
- Si hay errores de autenticación o permisos, reportarlos claramente
