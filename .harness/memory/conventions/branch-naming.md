# Convención de Nomenclatura de Branches

## Formato

```
<tipo>/<número>-<descripción-corta>
```

## Tipos

| Tipo     | Uso                                    | Ejemplo                            |
| -------- | -------------------------------------- | ---------------------------------- |
| feat     | Nueva funcionalidad                    | `feat/001-add-new-column`          |
| bug      | Corrección de error                    | `bug/002-remove-unused-variable`   |
| chore    | Tareas de mantenimiento (deps, config) | `chore/003-update-bun-deps`        |
| refactor | Refactorización sin cambio funcional   | `refactor/004-rename-user-service` |
| docs     | Cambios en documentación               | `docs/005-update-readme`           |

## Reglas

- **NUNCA trabajar directamente sobre `main`.** Todo trabajo (código o docs) se hace siempre en una branch. `main` solo recibe merges de PRs.
- Antes de crear una branch, hacer `git pull origin main` para partir desde el estado más reciente de `main`.
- Descripción en inglés, separada por guiones (`-`).
- Números correlativos por repositorio (no por tipo).
- Usar minúsculas.
- Sin caracteres especiales ni acentos.
