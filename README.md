# Expense Tracker AI

App de gastos con interfaz TUI (terminal), diseñada para llevar un control personal de gastos recurrentes, cuotas de tarjetas, préstamos y gastos compartidos.

## Stack

| Tecnología      | Uso                               |
| --------------- | --------------------------------- |
| **Bun**         | Runtime + package manager         |
| **TypeScript**  | Lenguaje (strict mode)            |
| **Ink + React** | Interfaz TUI                      |
| **SQLite**      | Persistencia local (`bun:sqlite`) |

## Requisitos

- [Bun](https://bun.sh) >= 1.0

## Cómo empezar

```bash
bun install
bun start
```

## Comandos

| Comando         | Descripción        |
| --------------- | ------------------ |
| `bun start`     | Iniciar la app TUI |
| `bun test`      | Ejecutar tests     |
| `bun run build` | Compilar           |

## Atajos

| Tecla   | Acción                                       |
| ------- | -------------------------------------------- |
| `↑`/`↓` | Navegar listas y campos de formulario        |
| `←`/`→` | Cambiar opción en select de formulario       |
| `Enter` | Seleccionar / avanzar campo en formulario    |
| `Esc`   | Volver / salir                               |
| `a`     | Agregar gasto                                |
| `i`     | Agregar item                                 |
| `e`     | Editar (item en dashboard, gasto en detalle) |
| `d`     | Eliminar (con confirmación)                  |

Los datos se guardan en `.data/expenses.db` (local, gitignored).

## Estructura del proyecto

```
expense-tracker-ai/
├── index.html        # Website público
├── README.md         # Este archivo
├── AGENTS.md         # Reglas para AI agents

├── docs/             # Documentación
│   ├── ROADMAP.md    # Visión de versiones
│   └── ARCHITECTURE.md # Decisiones técnicas
├── .harness/         # Config de AI agents
└── src/              # Código de la app
```

## Harness (.harness/)

Configuración que guía a los agentes de IA: roles, procedimientos y memoria compartida.

| Componente      | Qué es                                           | Quién lo ejecuta                                                          | Cuándo                                      |
| --------------- | ------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------- |
| **AGENTS.md**   | Reglas raíz para todos los agentes               | Todos los agentes                                                         | Al iniciar cada tarea                       |
| **Agents**      | Roles: orchestrator, developer, tester, reviewer | El rol que corresponda según la tarea                                     | Cuando la tarea requiere ese rol            |
| **Skills**      | Capacidades on-demand (ej: `code-review`)        | El agente que la necesite                                                 | A demanda, cuando se requiere esa capacidad |
| **Commands**    | Atajos ejecutables (`test`, `pr`)                | `tester` (test) · `orchestrator` (pr)                                     | Cuando el humano los invoca                 |
| **Memory**      | Memoria de proyecto/usuario/sesión               | Todos los agentes                                                         | Se lee al empezar; se actualiza al aprender |
| **Conventions** | Estándares (code-style, branch-naming)           | `developer` + `tester` (code-style) · quien cree branches (branch-naming) | En toda tarea de código / al crear branches |

### Skills

- **`code-review`** (`.harness/skills/code-review/skill.md`): procedimiento de revisión de código buscando bugs, problemas de seguridad y malas prácticas.
  - **Quién:** el agente encargado de la revisión (revisión posterior a la validación del `tester`).
  - **Cuándo:** a demanda, cuando se solicita revisar código específico. No se ejecuta automáticamente en cada tarea.

### Commands

- **`test`** (`.harness/commands/test.md`): valida TypeScript (`bunx tsc --noEmit`), calidad contra `code-style.md` y ejecuta todos los tests (`bun test`).
  - **Quién:** el agente `tester`.
  - **Cuándo:** cada vez que el humano lo invoca (por convención, al terminar cualquier tarea de código).

- **`pr`** (`.harness/commands/pr.md`): genera título y descripción del diff y crea un Pull Request en GitHub (`gh pr create --assignee "@me"`).
  - **Quién:** el agente `orchestrator`.
  - **Cuándo:** cuando el humano lo invoca desde una branch de trabajo (nunca desde `main`). Requiere `gh` autenticado y confirmación del humano antes de crear el PR.

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
