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
├── README.md            # Docs para humanos (también funge como changelog)
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
    ├── index.tsx
    ├── app/
    │   ├── App.tsx
    │   └── components/
    ├── data/
    └── types/
```
