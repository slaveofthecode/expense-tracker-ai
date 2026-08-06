---
description: Crea un Pull Request en GitHub con título y descripción generados
---

Crea un Pull Request en GitHub siguiendo `.harness/commands/pr.md`:

1. Verifica que `gh` está autenticado (`gh auth status`)
2. Confirma que NO estás en la rama `main`
3. Obtén el diff de cambios con `git diff main...HEAD --stat` y `git diff main...HEAD`
4. Genera un título y descripción en inglés representativos de los cambios
5. Muestra al usuario el resumen y pedí confirmación antes de crear el PR
6. Si el usuario confirma, ejecuta `gh pr create --assignee "@me"` con el título y body generados
7. Devuelve la URL del PR creado
8. Posicionate en `main` actualizada para la próxima tarea: `git checkout main && git pull origin main`

Reglas:

- El título y descripción deben ser en inglés
- No hagas git add/commit/push por cuenta propia — `gh pr create` lo maneja internamente
- Si el PR ya existe para la rama actual, informalo y no lo dupliques
- Si el working tree tiene cambios sin commitear al pedir el PR, avisá al humano antes de hacer checkout (no perderse trabajo)
