# Expense Tracker AI - Harness Documentation

## Qué es esto?

Este directorio `.harness/` contiene la configuración de agentes AI para desarrollar esta aplicación. Es un **harness básico** diseñado para ser legible por múltiples herramientas (Cursor, Claude, OpenCode, etc.).

## Estructura

```
.harness/
├── agents/          # Definiciones de roles de agentes
│   ├── orchestrator.md   # Coordina tareas complejas
│   ├── developer.md      # Escribe código
│   └── tester.md         # Valida código
├── skills/          # Capacidades on-demand (se cargan solo cuando se necesitan)
│   └── code-review/
│       └── skill.md
├── commands/        # Atajos para tareas frecuentes
│   └── test.md
└── memory/          # Memoria persistente entre sesiones
    ├── memory.md
    ├── project/
    │   └── architecture.md
    └── conventions/
        └── code-style.md
```

## Cómo funciona

### Agentes
Cada agente tiene un rol específico. El orquestador coordina, el developer escribe código, el tester valida.

### Skills
Son capacidades que se cargan solo cuando se necesitan. No siempre están activas.

### Commands
Son atajos: cuando el usuario dice "test", se ejecuta el comando definido en `commands/test.md`.

### Memory
Los agentes "olvidan" entre sesiones. La memoria permite recordar decisiones y preferencias.

## Archivos importantes

- `AGENTS.md` (root): Fuente de verdad principal. Todos los tools la leen.
- `opencode.json`: Configuración específica de OpenCode.

## Para aprender más

Cada archivo `.md` tiene comentarios al inicio explicando **por qué** existe. Lee los archivos en orden:
1. `AGENTS.md`
2. `.harness/agents/orchestrator.md`
3. `.harness/skills/code-review/skill.md`
4. `.harness/memory/memory.md`
