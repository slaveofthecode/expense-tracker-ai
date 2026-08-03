<!-- Fuente de verdad principal. Todos los tools la leen. -->

# Expense Tracker AI

App de gastos con AI para análisis y categorización automática.

## Tech Stack

- Usar `bun` en reemplazo de npm
- Node.js + TypeScript
- TUI con Ink + React
- Persistencia: SQLite (v2+)

## Comandos

- `bun start` - Iniciar app TUI
- `bun test` - Ejecutar tests
- `bun run build` - Compilar

## Convenciones

- Usar TypeScript estricto
- Los commit seran en ingles
- Solo la documentacion en .md sera en español, todo lo demas es en ingles.
- **NUNCA trabajar directamente sobre `main`.** Todo cambio (código, docs, config) se hace en una branch nueva creada desde `main` actualizado: primero `git pull origin main`, luego crear la branch con el formato de `.harness/memory/conventions/branch-naming.md`. Si el AI detecta que está sobre `main`, debe frenar y crear la branch antes de tocar cualquier archivo.
- Branches: seguir la convención en `.harness/memory/conventions/branch-naming.md`
- La AI nunca debe hacer `git add`, `git commit` ni `git push`. El único responsable de stage/commit/push es el humano.
- [agregar más conforme aprendas]

## Referencias

- `docs/ARCHITECTURE.md`: Decisiones técnicas y modelo de datos
- `docs/ROADMAP.md`: Visión de versiones

## Agentes Disponibles

### orchestrator

Coordina tareas complejas delegando a sub-agentes.

### developer

Escribe código siguiendo las convenciones del proyecto, dejando listo para que el agente `tester` lo valide.

### tester

Revisa codigo y aplica los tests correspondiente para un correcto funcionamiento, y valida calidad contra `.harness/memory/conventions/code-style.md`. Luego manda a ejecutar al agente `reviewer` para su revision.

### reviewer

Revisa código buscando errores y malas prácticas, y manda a corregir al agente `developer`.
