# Expense Tracker AI

App de gastos con interfaz TUI (terminal), diseñada para llevar un control personal de gastos recurrentes, cuotas de tarjetas, préstamos y gastos compartidos.

Funcionalidades: vistas de grilla anual (12 meses por grupo), selector de año, soporte de cuotas con prorrateo mensual, gastos compartidos con porcentaje de propiedad, y CRUD completo de grupos y gastos.

## Stack

| Tecnología      | Uso                               |
| --------------- | --------------------------------- |
| **Bun**         | Runtime + package manager         |
| **TypeScript**  | Lenguaje (strict mode)            |
| **Ink + React** | Interfaz TUI                      |
| **SQLite**      | Persistencia local (`bun:sqlite`) |

## Requisitos

- [Bun](https://bun.sh) >= 1.0
- [Ollama](https://ollama.com) _(opcional)_ — solo para el análisis con IA del chat (v5)

## Cómo empezar

```bash
bun install
bun start
```

## Análisis con IA (opcional)

La app puede analizar tus gastos con un modelo de IA que corre **localmente** vía [Ollama](https://ollama.com): tus datos nunca salen de tu máquina. Esta función se activa con el chat (`c`); el resto de la app funciona sin instalar nada de esto.

1. **Instalar Ollama**

   ```bash
   # macOS (Homebrew)
   brew install ollama
   ```

   O descargar el instalador desde https://ollama.com (en macOS queda corriendo como servicio en segundo plano).

2. **Descargar el modelo**

   ```bash
   ollama pull llama3.2
   ```

   Puede usarse otro modelo cambiando `AI_MODEL` en `.env`.

3. **(Opcional) Configurar `.env`**

   ```bash
   cp .env.example .env
   ```

   El default `OLLAMA_HOST=http://localhost:11434` funciona sin cambios.

Verificación: `curl http://localhost:11434/api/version` debería responder con la versión de Ollama.

## MCP Server

El proyecto incluye un servidor [MCP](https://modelcontextprotocol.io) que expone las herramientas de análisis de gastos para ser consumidas por cualquier cliente MCP compatible (opencode, Claude Desktop, Cursor, etc.).

### Herramientas disponibles

| Tool                | Descripción                                                  |
| ------------------- | ------------------------------------------------------------ |
| `list_items`        | Lista grupos de gasto (filtrable por tipo)                  |
| `list_expenses`     | Lista gastos (filtrable por año o ítem)                     |
| `get_monthly_summary` | Resumen de gastos de un mes                               |
| `get_yearly_summary`  | Resumen anual con prorrateo de cuotas                     |
| `search_expenses`   | Búsqueda por descripción, grupo o persona                   |
| `analyze_patterns`  | Detecta tendencias, anomalías y gastos recurrentes          |
| `get_recommendations` | Genera recomendaciones basadas en patrones de gasto       |

### Configuración incluida en el repo

El servidor MCP usa la misma base de datos que la app (`.data/expenses.db`, ver `DB_PATH`). La configuración nativa por herramienta ya está versionada:

| Herramienta  | Archivo de registro                                                          | Cómo lo toma                                                        |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| opencode     | `opencode.json` → `mcp.expense-tracker` (env `DB_PATH=.data/expenses.db`)    | Automático al iniciar                                               |
| Claude Code  | `.mcp.json` (raíz del proyecto)                                              | Automático al abrir el repo                                         |
| Cursor       | `.cursor/mcp.json`                                                           | Automático al abrir el repo                                         |
| Claude Desktop | Config global del cliente (ver ejemplo abajo)                              | Manual                                                              |
| GitHub Copilot | Config de la extensión (settings de VS Code)                               | Manual                                                              |

Solo necesitás tener la DB generada (correr `bun start` al menos una vez):

```bash
# La DB se crea en .data/expenses.db al iniciar la app
bun start
```

### Uso con Claude Desktop (config global)

Agregá esta configuración en el archivo de config del cliente (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "expense-tracker": {
      "command": "bunx",
      "args": ["tsx", "src/mcp/server.ts"],
      "cwd": "/ruta/a/expense-tracker-ai",
      "env": {
        "DB_PATH": ".data/expenses.db"
      }
    }
  }
}
```

## Comandos

| Comando         | Descripción        |
| --------------- | ------------------ |
| `bun start`     | Iniciar la app TUI |
| `bun test`      | Ejecutar tests     |
| `bun run build` | Compilar           |

## Atajos

| Tecla   | Acción                                               |
| ------- | ---------------------------------------------------- |
| `↑`/`↓` | Navegar listas y campos de formulario                |
| `←`/`→` | Cambiar opción en select de formulario / cambiar mes |
| `Enter` | Seleccionar / avanzar campo en formulario            |
| `Esc`   | Volver / salir                                       |
| `/`     | Buscar gastos, grupos y personas (resultados en vivo)|
| `a`     | Agregar gasto                                        |
| `e`     | Editar (grupo en dashboard, gasto en detalle)        |
| `d`     | Eliminar (con confirmación)                          |
| `g`     | Abrir gráficos (4 tipos de gráfico, 1-4 para cambiar)|
| `c`     | Abrir chat IA (preguntas en lenguaje natural)        |
| `t`     | Ciclar filtro por tipo de grupo en dashboard         |

Los datos se guardan en `.data/expenses.db` (local, gitignored).

## Estructura del proyecto

```
expense-tracker-ai/
├── index.html        # Website público
├── ollama-test.html  # Playground web para testear la API de Ollama
├── README.md         # Este archivo
├── AGENTS.md         # Reglas para AI agents
├── opencode.json     # Config OpenCode
├── .env.example      # Env vars documentadas (OLLAMA_HOST, AI_MODEL)
├── docs/             # Documentación
│   ├── ROADMAP.md    # Visión de versiones
│   └── ARCHITECTURE.md # Decisiones técnicas
├── .harness/         # Fuente canónica de config AI
├── .opencode/        # Registro nativo: opencode
├── .claude/          # Registro nativo: Claude Code
├── .github/          # Registro nativo: GitHub Copilot
├── .cursor/          # Registro nativo: Cursor
└── src/              # Código de la app
```

## Harness (.harness/)

Configuración que guía a los agentes de IA: roles, procedimientos y memoria compartida.

| Componente      | Qué es                                                                                                                    | Quién lo ejecuta                                                          | Cuándo                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| **AGENTS.md**   | Reglas raíz para todos los agentes                                                                                        | Todos los agentes                                                         | Al iniciar cada tarea                       |
| **Agents**      | `orchestrator` (rol del agente principal) · `developer`/`tester`/`reviewer` (subagentes registrados con contexto aislado) | La sesión principal (orchestrator) delega a los subagentes                | Cuando la tarea requiere ese rol            |
| **Skills**      | Capacidades on-demand (ej: `code-review`)                                                                                 | El agente que la necesite                                                 | A demanda, cuando se requiere esa capacidad |
| **Commands**    | Atajos ejecutables (`test`, `pr`)                                                                                         | `tester` (test) · `orchestrator` (pr)                                     | Cuando el humano los invoca                 |
| **Memory**      | Memoria de proyecto/usuario/sesión                                                                                        | Todos los agentes                                                         | Se lee al empezar; se actualiza al aprender |
| **Conventions** | Estándares (code-style, branch-naming)                                                                                    | `developer` + `tester` (code-style) · quien cree branches (branch-naming) | En toda tarea de código / al crear branches |

### Registro nativo por herramienta

El harness se registra nativamente en cada herramienta de AI. Las copias se mantienen en sincronía manual desde `.harness/` (fuente canónica):

| Artifact             | opencode                       | Claude Code                   | GitHub Copilot                | Cursor                        |
| -------------------- | ------------------------------ | ----------------------------- | ----------------------------- | ----------------------------- |
| Agents               | `.opencode/agent/`             | `.claude/agents/`             | `.github/agents/`             | `.cursor/agents/`             |
| Commands `test`/`pr` | `opencode.json` → `command`    | `.claude/commands/`           | `.github/prompts/`            | `.cursor/commands/`           |
| Skill `code-review`  | `.opencode/skill/code-review/` | `.claude/skills/code-review/` | `.github/skills/code-review/` | `.cursor/skills/code-review/` |

Notas de paridad: los modelos no se pinnean por agente (cada tool usa su modelo por defecto); `reviewer` es de solo lectura en todas (en opencode/Claude vía allowlist/deny, en Cursor vía `readonly: true`).

### Skills

- **`code-review`** (`.harness/skills/code-review/skill.md`): procedimiento de revisión de código buscando bugs, problemas de seguridad y malas prácticas.
  - **Quién:** el agente encargado de la revisión (revisión posterior a la validación del `tester`).
  - **Cuándo:** a demanda, cuando se solicita revisar código específico. No se ejecuta automáticamente en cada tarea.

### Commands

- **`test`** (`.harness/commands/test.md`): valida TypeScript (`bunx tsc --noEmit`), calidad contra `code-style.md` y ejecuta todos los tests (`bun test`).
  - **Quién:** el agente `tester`.
  - **Cuándo:** cada vez que el humano lo invoca (por convención, al terminar cualquier tarea de código).

- **`pr`** (`.harness/commands/pr.md`): genera título y descripción del diff, crea un Pull Request en GitHub (`gh pr create`) y lo asigna al usuario (`gh pr edit --add-assignee`).
  - **Quién:** el agente `orchestrator`.
  - **Cuándo:** cuando el humano lo invoca desde una branch de trabajo (nunca desde `main`). Requiere `gh` autenticado y confirmación del humano antes de crear el PR.
  - **Qué pasa después:** el AI vuelve a `main` actualizada (`git checkout main && git pull origin main`) para quedar posicionado en la próxima tarea.

### Memory (`.harness/memory/memory.md`)

Memoria persistente del proyecto (referencias a docs), preferencias del usuario y registro de sesiones.

- **Quién:** todos los agentes.
- **Cuándo:** se lee al comenzar una sesión para mantener consistencia; se actualiza cuando se descubren preferencias o se toman decisiones.

### Conventions (`.harness/memory/conventions/`)

- **`code-style.md`**: estándares de TypeScript y React (tipado estricto, sin `any`, sin `!` en producción, sin `useCallback`/`useMemo` innecesarios, estilo visual).
  - **Quién:** `developer` al escribir código, `tester` al validar calidad.
  - **Cuándo:** en toda tarea de código.
- **`branch-naming.md`**: formato `<tipo>/<número>-<descripción>` para branches.
  - **Quién:** cualquier persona o agente que cree una branch.
  - **Cuándo:** siempre que se crea una branch, partiendo de `main` actualizado (`git pull origin main`).

## Documentación

- [Arquitectura y decisiones técnicas](docs/ARCHITECTURE.md)
- [Roadmap de versiones](docs/ROADMAP.md)
- [Convención de branches](.harness/memory/conventions/branch-naming.md)
