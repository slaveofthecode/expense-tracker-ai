# Memoria del Proyecto

## Proyecto

- code-style.md: Estilo de código del equipo
- branch-naming.md: Convención de nomenclatura de branches
- docs/ARCHITECTURE.md: Decisiones técnicas y modelo de datos
- docs/ROADMAP.md: Visión de versiones

## Usuario

- [agregar preferencias conforme las descubras]

## Sesión

- 2026-07-27: Creado harness inicial, definido stack
- 2026-07-29: Creado website público, definida convención de branches
- 2026-07-29: Creada v1 Visual Prototype con Ink + React. Estructura documental definida: README para humanos, AGENTS.md para AI, docs/ para documentación técnica, .harness/ para config AI. Migrado architecture.md de .harness a docs/.
- 2026-07-30: Tester ahora también valida calidad de código contra code-style.md. Eliminado CHANGELOG.md por duplicación con memory.md + README.md. Expandido code-style.md con reglas React (no useCallback sin beneficio, no non-null assertions en producción).
- 2026-08-03: Completadas v1 (persistencia SQLite con `bun:sqlite`) y v2 (ingreso de datos + CRUD completo). Documentado el harness en README e index.html (skills, commands, memory, conventions con quién/cuándo) y agregada sección "Run It Live" en el website.
