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
| `↑`/`↓` | Navegar listas                               |
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

## Documentación

- [Arquitectura y decisiones técnicas](docs/ARCHITECTURE.md)
- [Roadmap de versiones](docs/ROADMAP.md)
- [Convención de branches](.harness/memory/conventions/branch-naming.md)
