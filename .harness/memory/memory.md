# Memoria del Proyecto

## Proyecto

- code-style.md: Estilo de código del equipo
- branch-naming.md: Convención de nomenclatura de branches
- docs/ARCHITECTURE.md: Decisiones técnicas y modelo de datos
- docs/ROADMAP.md: Visión de versiones

## Reglas críticas

- **NUNCA hacer cambios sobre `main`.** Todo cambio se hace en una branch nueva creada desde `main` actualizado (primero `git pull origin main`). Si el AI detecta que está sobre `main`, debe frenar y crear la branch antes de tocar cualquier archivo.
- **Después de crear un PR, mover a `main` actualizada** (`git checkout main && git pull origin main`) para quedar posicionado para la próxima tarea. Solo posicionarse, sin tocar archivos.

## Usuario

- Prefiere que el AI aclare conceptos antes de implementar (MCP, permisos, proveedores AI).
- Decide por opciones simples y seguras: chat solo lectura, local-first (Ollama), sin features inventadas en docs.

## Sesión

- 2026-07-27: Creado harness inicial, definido stack
- 2026-07-29: Creado website público, definida convención de branches
- 2026-07-29: Creada v1 Visual Prototype con Ink + React. Estructura documental definida: README para humanos, AGENTS.md para AI, docs/ para documentación técnica, .harness/ para config AI. Migrado architecture.md de .harness a docs/.
- 2026-07-30: Tester ahora también valida calidad de código contra code-style.md. Eliminado CHANGELOG.md por duplicación con memory.md + README.md. Expandido code-style.md con reglas React (no useCallback sin beneficio, no non-null assertions en producción).
- 2026-08-03: Completadas v1 (persistencia SQLite con `bun:sqlite`) y v2 (ingreso de datos + CRUD completo). Documentado el harness en README e index.html (skills, commands, memory, conventions con quién/cuándo) y agregada sección "Run It Live" en el website.
- 2026-08-03: Reforzada la regla "nunca trabajar sobre main" (explicitar el checkout a una branch nueva antes de cualquier cambio) en AGENTS.md, branch-naming.md y memory.md, tras detectarse cambios aplicados directamente sobre `main`.
- 2026-08-05: Al crear un PR, el AI ahora vuelve a `main` actualizada (`git checkout main && git pull origin main`) para preparar la próxima tarea. Creado el agente `reviewer` que faltaba. Definido alcance de v5 (chat AI con Ollama local, tools solo lectura, MCP server al final) en ROADMAP.md.
- 2026-08-05: Hallazgo — el harness (`.harness/`) es documentación para la AI, no config funcional: opencode solo carga agentes/skills desde `.opencode/` y agents/commands desde `opencode.json`. Los agentes orchestrator/developer/tester/reviewer y los commands test/pr no están registrados como subagentes reales (la AI principal juega todos los roles siguiendo AGENTS.md). Pendiente decisión del humano si registrarlos como subagentes reales (riesgo: config inválida rompe el arranque).
