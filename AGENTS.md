<!-- Fuente de verdad principal. Todos los tools la leen. -->

# Expense Tracker AI

App de gastos con AI para análisis y categorización automática.

## Tech Stack

- Usar `bun` en reemplazo de npm
- Node.js + TypeScript
- [pendiente: definir DB, framework, etc.]

## Comandos

- `bun test` - Ejecutar tests
- `bun run build` - Compilar

## Convenciones

- Usar TypeScript estricto
- Los commit seran en ingles
- Solo la documentacion en .md sera en español, todo lo demas es en ingles.
- [agregar más conforme aprendas]

## Agentes Disponibles

### orchestrator

Coordina tareas complejas delegando a sub-agentes.

### coder

Escribe código siguiendo las convenciones del proyecto, dejando listo para que el agente `tester` lo valide.

### tester

Revisa codigo y aplica los tests correspondiente para un correcto funcionamiento

### reviewer

Revisa código buscando errores y malas prácticas, y manda a corregir al agente `coder`.
