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
├── README.md            # Docs para humanos
├── AGENTS.md            # Reglas para la AI
├── opencode.json        # Config OpenCode
├── docs/
│   ├── ROADMAP.md       # Visión de versiones
│   └── ARCHITECTURE.md  # Este archivo
├── .harness/            # Config de agentes AI
│   ├── agents/
│   ├── commands/
│   ├── skills/
│   └── memory/
└── src/                 # Código de la app
    ├── index.tsx        # Entry point: abre DB, seed, render
    ├── app/
    │   ├── App.tsx      # Navegación entre pantallas + handlers
    │   └── components/
    │       ├── Dashboard.tsx
    │       ├── ItemDetail.tsx
    │       ├── ExpenseDetail.tsx
    │       ├── Form.tsx        # Formulario genérico (texto/select)
    │       ├── ItemForm.tsx    # Alta/edición de items
    │       ├── ExpenseForm.tsx # Alta/edición de gastos
    │       └── Confirm.tsx     # Confirmación de borrado
    ├── db/
    │   ├── connection.ts # Abre SQLite (.data/expenses.db)
    │   ├── schema.ts     # Migraciones
    │   ├── seed.ts       # Mock data en DB vacía
    │   └── repository.ts # CRUD tipado contra los tipos de dominio
    ├── data/             # Seed data (mock)
    ├── types/            # Modelos de dominio
    └── utils/            # Formato y summaries
```

## Persistencia

- Base de datos local en `.data/expenses.db` (gitignored).
- `bun:sqlite` (módulo nativo de Bun, sin dependencias extra).
- Las tablas `items` y `expenses` se crean con `runMigrations` al abrir la DB.
- Si la DB está vacía, `seedIfEmpty` inserta el mock de `src/data/`.
- Las pantallas consumen `src/db/repository.ts`; nunca SQL directo en la UI.
