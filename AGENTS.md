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
- **Después de crear un PR, mover a `main` actualizada** (`git checkout main && git pull origin main`) para quedar posicionado en la próxima tarea. Es solo posicionarse: nunca hacer cambios directamente desde `main`.
- **Sincronización del harness:** al cambiar un agent, skill o command: 1) editar la fuente canónica en `.harness/`, 2) replicar el cambio en las 4 carpetas nativas (`.opencode/`, `.claude/`, `.github/`, `.cursor/`) adaptando el frontmatter al schema de cada tool, 3) actualizar `.harness/memory/memory.md` con la entrada de sesión, 4) validar (frontmatter, JSON válido, `bunx tsc --noEmit` y `bun test`). Nunca dejar un cambio solo en `.harness/` ni solo en una tool (evitar drift).

## Referencias

- `docs/ARCHITECTURE.md`: Decisiones técnicas y modelo de datos
- `docs/ROADMAP.md`: Visión de versiones

## Agentes

### orchestrator (rol del agente principal)

Es el agente con el que interactúa el humano (la sesión de chat). Coordina tareas complejas delegando a los subagentes `developer`, `tester` y `reviewer`. **NO se registra como subagente**: los subagentes no pueden lanzar subagentes (jerarquía plana en Claude Code y `subagent_depth: 1` en opencode), así que la delegación siempre la hace la sesión principal.

### developer, tester, reviewer (subagentes registrados)

Se registran como subagentes reales en las 4 herramientas, con **contexto aislado** y **permisos forzados**:

| Rol         | Permisos                   | opencode                       | Claude Code                   | GitHub Copilot                      | Cursor                        |
| ----------- | -------------------------- | ------------------------------ | ----------------------------- | ----------------------------------- | ----------------------------- |
| `developer` | lee + escribe + bash       | `.opencode/agent/developer.md` | `.claude/agents/developer.md` | `.github/agents/developer.agent.md` | `.cursor/agents/developer.md` |
| `tester`    | lee + escribe tests + bash | `.opencode/agent/tester.md`    | `.claude/agents/tester.md`    | `.github/agents/tester.agent.md`    | `.cursor/agents/tester.md`    |
| `reviewer`  | solo lectura               | `.opencode/agent/reviewer.md`  | `.claude/agents/reviewer.md`  | `.github/agents/reviewer.agent.md`  | `.cursor/agents/reviewer.md`  |

- **developer**: escribe código siguiendo las convenciones del proyecto, dejando listo para que `tester` lo valide.
- **tester**: valida funcionamiento y calidad contra `.harness/memory/conventions/code-style.md`, ejecuta `bunx tsc --noEmit` y `bun test`, y manda la revisión al agente `reviewer`.
- **reviewer**: revisa código buscando errores y malas prácticas, con permisos de solo lectura (reporta fixes, no los aplica; los aplica `developer`).

La fuente canónica de los prompts está en `.harness/agents/`; las copias nativas por tool se mantienen en sincronía manual (ver `.harness/memory/memory.md`).

### Commands y Skills por tool

Los commands `test`/`pr` y el skill `code-review` también se registran por tool:

| Artifact             | opencode                               | Claude Code                           | GitHub Copilot                        | Cursor                                |
| -------------------- | -------------------------------------- | ------------------------------------- | ------------------------------------- | ------------------------------------- |
| Commands `test`/`pr` | `opencode.json` → `command`            | `.claude/commands/*.md`               | `.github/prompts/*.prompt.md`         | `.cursor/commands/*.md`               |
| Skill `code-review`  | `.opencode/skill/code-review/SKILL.md` | `.claude/skills/code-review/SKILL.md` | `.github/skills/code-review/SKILL.md` | `.cursor/skills/code-review/SKILL.md` |
