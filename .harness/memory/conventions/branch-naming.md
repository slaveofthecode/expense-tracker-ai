# Convención de Nomenclatura de Branches

## Formato

<pre><code>
<tipo>/<número>-<descripción-corta>
</code></pre>

## Tipos

| Tipo     | Uso                                    |
| -------- | -------------------------------------- |
| feat     | Nueva funcionalidad                    |
| bug      | Corrección de error                    |
| task     | Tareas de mantenimiento (deps, config) |
| refactor | Refactorización sin cambio funcional   |
| docs     | Cambios en documentación               |

## Ejemplos

- `feat/001-add-new-column`
- `bug/002-remove-unused-variable`
- `task/003-update-bun-deps`
- `refactor/004-rename-user-service`

## Reglas

- Descripción en inglés, separada por guiones (`-`)
- Número correlativo por repositorio (no por tipo)
- Usar minúsculas
- Sin caracteres especiales ni acentos
  Y agregar una línea en AGENTS.md (en la sección de convenciones) referenciando este archivo.
