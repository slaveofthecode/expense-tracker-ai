# Convención de Nomenclatura de Branches

## Formato

```
<tipo>/<número>-<descripción-corta>
```

## Tipos

| Tipo      | Uso                                    |
|-----------|----------------------------------------|
| feat      | Nueva funcionalidad                    |
| bug       | Corrección de error                    |
| chore     | Tareas de mantenimiento (deps, config) |
| refactor  | Refactorización sin cambio funcional   |
| docs      | Cambios en documentación               |

## Reglas

- Antes de crear un branch, hacer `git pull origin main` para partir desde el estado más reciente de `main`
- Descripción en inglés, separada por guiones (`-`)
- Números correlativos por repositorio (no por tipo)
- Usar minúsculas
- Sin caracteres especiales ni acentos

## Ejemplos

- `feat/001-add-new-column`
- `bug/002-remove-unused-variable`
- `chore/003-update-bun-deps`
- `refactor/004-rename-user-service`
- `docs/005-update-readme`
