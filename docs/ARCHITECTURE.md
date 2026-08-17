# Arquitectura del Proyecto

## Stack Tecnológico

| Capa         | Tecnología        |
| ------------ | ----------------- |
| Runtime      | Bun               |
| Lenguaje     | TypeScript strict |
| TUI          | Ink + React       |
| Persistencia | SQLite (v2+)      |

## Decisiones Técnicas

### ¿Por qué Ink + React?

- Permite escribir la interfaz de terminal con componentes declarativos tipo React
- Ecosistema maduro y buena experiencia de desarrollo con TypeScript
- Ideal para una app TUI con navegación entre pantallas y estado compartido

### ¿Por qué Bun?

- Todo-en-uno: runtime, package manager, test runner, bundler
- TypeScript nativo sin configuración extra
- Rápido para iterar

### ¿Por qué SQLite (v2)?

- Sin servidor, archivo local, cero setup
- Suficiente para una app personal de gastos
- Fácil de respaldar y portar

## Configuración por Entorno

La app se configura con variables de entorno. Bun carga `.env` automáticamente; el archivo `.env.example` documenta las disponibles (copiar a `.env` y ajustar).

| Variable      | Default                  | Descripción                                                 |
| ------------- | ------------------------ | ----------------------------------------------------------- |
| `OLLAMA_HOST` | `http://localhost:11434` | URL base del servidor Ollama (API en `/api/chat`)           |
| `AI_MODEL`    | `llama3.2`               | Modelo local usado para el análisis (debe estar descargado) |

Los defaults viven en `src/ai/provider.ts` (`DEFAULT_OLLAMA_HOST` / `DEFAULT_AI_MODEL`) y solo aplican si la env var correspondiente no está definida: la prioridad es `env var > default`. `.env` está gitignored; los secretos nunca se commitean.

## Modelo de Datos

```typescript
interface Item {
	id: string;
	name: string;
	type: ItemType;
}

type ItemType = 'credit_card' | 'loan' | 'recurring' | 'insurance' | 'other';

interface Expense {
	id: string;
	itemId: string;
	description: string;
	amount: number;
	date: string; // ISO 8601
	installments?: {
		total: number; // cuotas totales (ej: 12)
		current: number; // cuota actual (ej: 3)
	};
	ownership: {
		percentage: number; // 100 | 50 | otro
		person?: string; // nombre si es compartido
	};
}
```

## Estructura del Proyecto

```
expense-tracker-ai/
├── index.html           # Website público
├── ollama-test.html     # Playground web para testear la API local de Ollama
├── README.md            # Docs para humanos
├── AGENTS.md            # Reglas para la AI
├── opencode.json        # Config OpenCode
├── .env.example         # Env vars documentadas (OLLAMA_HOST, AI_MODEL)
├── docs/
│   ├── ROADMAP.md       # Visión de versiones
│   └── ARCHITECTURE.md  # Este archivo
├── .harness/            # Config de agentes AI
│   ├── agents/
│   ├── commands/
│   ├── skills/
│   └── memory/
└── src/                 # Código de la app
    ├── index.tsx        # Entry point: abre DB, render
    ├── ai/              # Capa de IA: tools de lectura + proveedor LLM + agente
    │   ├── tools.ts     # Registry de tools de solo lectura
    │   ├── provider.ts  # Interfaz LLMProvider + implementación Ollama
    │   ├── agent.ts     # Loop de tool-calling con system prompt de dominio
    │   └── suggest.ts   # Sugerencia de ítem por IA (fallback del matching local)
    ├── app/
    │   ├── App.tsx      # Navegación entre pantallas + handlers
    │   └── components/
    │       ├── Dashboard.tsx
    │       ├── Charts.tsx
    │       ├── Chat.tsx        # Chat con IA (consulta en lenguaje natural)
    │       ├── ItemDetail.tsx
    │       ├── ExpenseDetail.tsx
    │       ├── Form.tsx        # Formulario genérico (texto/select)
    │       ├── ItemForm.tsx    # Alta/edición de items
    │       ├── ExpenseForm.tsx # Alta/edición de gastos (sugerencia de ítem en vivo)
    │       └── Confirm.tsx     # Confirmación de borrado
    ├── db/
    │   ├── connection.ts # Abre SQLite (.data/expenses.db)
    │   ├── schema.ts     # Migraciones
    │   └── repository.ts # CRUD tipado contra los tipos de dominio
    ├── types/            # Modelos de dominio
    └── utils/            # Formato, summaries, filtros, charts y sugerencia de ítem
        └── suggestItem.ts # Matching determinístico (name + historial) para sugerir ítem
```

## Persistencia

- Base de datos local en `.data/expenses.db` (gitignored).
- `bun:sqlite` (módulo nativo de Bun, sin dependencias extra).
- Las tablas `items` y `expenses` se crean con `runMigrations` al abrir la DB.
- Las pantallas consumen `src/db/repository.ts`; nunca SQL directo en la UI.
