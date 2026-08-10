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
- 2026-08-05: Registrados `developer`, `tester` y `reviewer` como subagentes reales en las 4 herramientas (opencode, Claude Code, GitHub Copilot, Cursor) con contexto aislado y permisos forzados, más los commands `test`/`pr` y el skill `code-review` por tool. `orchestrator` queda como rol del agente principal (jerarquía plana: los subagentes no lanzan subagentes). Las copias nativas se mantienen en sincronía manual desde `.harness/`.
- 2026-08-05: Resuelto el hallazgo anterior: el harness ya no es solo documentación — los agentes/commands/skills se registran nativamente por tool (opencode: `.opencode/` + `opencode.json`; Claude: `.claude/`; Copilot: `.github/`; Cursor: `.cursor/`). La AI principal sigue jugando el rol de orchestrator.
- 2026-08-05: Agregada convención de sincronización del harness en AGENTS.md: todo cambio de agent/skill/command se hace en `.harness/` y se replica en las 4 tools nativas, con entrada de sesión en memory.md y validación (checklist anti-drift).
- 2026-08-06: Completada v3 (Búsqueda y Filtros): `src/utils/filters.ts` con `filterItems`/`filterExpenses`/`searchItems`/`searchResults` puros y testeables (reutilizables en la tool `search_expenses` de v5), búsqueda global con `SearchPalette` en Dashboard, ItemDetail e ItemDetailCard, y tecla `t` para ciclar filtro por tipo en Dashboard. Filtros sobre datos en memoria, sin IA. Validado con tsc + 81 tests + smoke test de render.
- 2026-08-10: Unificado el estilo visual de las grillas (Dashboard, ItemDetail, ItemDetailCard): celdas de mes grises, header del mes actual blanco bold (resto blanco sin bold), gastos compartidos amarillos, primera cuota verde, y fila seleccionada solo en bold sin cambio de color. Rediseñada la búsqueda: `SearchPalette` reemplaza a `CommandPalette` (`/` abre input directo con resultados en vivo por gasto: item, tipo, persona, monto y fecha; Enter navega al item), `focusExpenseId` opcional en el screen `itemDetail` posiciona el cursor en la fila del gasto que matcheó (App ajusta el año antes de navegar). Footer actualizado: `/ Buscar`, eliminada la opción `t Tipo` (la tecla `t` sigue funcionando, ya no se muestra). Sincronizados ROADMAP.md e index.html. Validado con tsc + 93 tests.
