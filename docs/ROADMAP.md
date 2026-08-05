# Roadmap

Visión general de las versiones planificadas de la app.

Cada versión define:
- **Objetivo**: qué valor aporta.
- **Checklist**: ítems a completar.
- **Cómo implementar**: decisiones técnicas y archivos involucrados.
- **Cuándo**: orden y dependencias con el resto de las versiones.

## v1 — Visual Prototype

TUI funcional con datos hardcodeados que muestra items de gastos con sus totales mensuales.

- [x] Definir modelos de datos
- [x] Mock data con items y gastos de ejemplo
- [x] Dashboard con lista de items y total del mes
- [x] Detalle de item con sus gastos
- [x] Persistencia en SQLite

## v2 — Persistencia e Ingreso de Datos

- [x] SQLite como base de datos local
- [x] Formularios TUI para agregar gastos
- [x] CRUD de items (crear, editar, eliminar)
- [x] Editar y eliminar gastos
- [x] Soporte para cuotas (tarjetas, préstamos)

## v3 — Búsqueda y Filtros

**Objetivo:** acotar qué gastos se ven en las pantallas existentes (Dashboard, ItemDetail).

- [ ] Filtrar por item o categoría (tipo: `credit_card`, `loan`, `recurring`, `insurance`, `other`)
- [ ] Filtrar por persona (gastos compartidos según `ownership.person`)
- [ ] Búsqueda textual clásica por descripción e item (filtro en código/DB, sin IA)

**Cómo implementar:**
- Filtros y búsqueda como filtros en memoria sobre los datos ya cargados por `listItems`/`listExpenses` (`src/db/repository.ts`), o con `LIKE` en SQL si hace falta.
- La búsqueda se reutiliza después en la tool `search_expenses` de v5.
- Fuera de alcance: filtrar por mes (la grilla anual ya muestra los 12 meses) y búsqueda semántica con IA (se evalúa como mejora post-v5).

**Cuándo:** primera entrega analítica; habilita reportes útiles (v4).

## v4 — Reportes

**Objetivo:** consolidar los datos en resúmenes y salidas portables.

- [ ] Resumen mensual por item (base ya existe en `calcMonthlySummaries`)
- [ ] Gráficos en terminal (barras, torta) con caracteres Unicode en Ink
- [ ] Exportación a CSV/JSON (código plano + `fs`, sin dependencias externas)

**Cómo implementar:**
- El cálculo vive en `src/utils/summaries.ts`; los gráficos se renderizan con `Text` de Ink (ej: barras con `█`).
- La exportación lee del repository y escribe con `fs` (ej: `.data/export/`). **No usar MCP**: MCP es un protocolo para que agentes AI accedan a datos, no un mecanismo de exportación.

**Cuándo:** después de v3 (los reportes se filtran), antes de v5 (la IA necesita datos consolidados).

## v5 — AI Analysis

**Objetivo:** análisis de gastos en lenguaje natural con asistencia de IA. La app consulta un LLM con tools (function calling): la IA decide qué consultar, la app ejecuta contra SQLite y la IA explica los resultados. La DB local es siempre la fuente de verdad; el LLM solo ve resultados de tools, nunca la DB directa.

- [ ] Módulo `src/ai/` con interfaz de proveedor intercambiable (Ollama local por defecto; cloud OpenAI/Anthropic/Gemini opcional por env var)
- [ ] Chat AI en la TUI: consultas en lenguaje natural (ej: "¿cuánto gasté en marzo?") con respuestas basadas en datos reales
- [ ] Tools de consulta (solo lectura): `list_items`, `list_expenses`, `get_monthly_summary`, `get_yearly_summary`, `search_expenses`
- [ ] Categorización automática por sugerencia al ingresar (la IA propone el item y el humano confirma)
- [ ] Detección de patrones de gasto (cálculo numérico en `summaries.ts` + insights en lenguaje natural por LLM)
- [ ] Recomendaciones (reglas determinísticas + redacción y jerarquía por LLM)
- [ ] MCP server (`src/mcp/`) exponiendo las tools de lectura para cualquier agente externo (opencode, Claude Desktop, etc.)

**Cómo implementar (orden sugerido):**
1. `src/ai/tools.ts`: registry único de tools de lectura construidas sobre `repository.ts` y `summaries.ts`. Clasificar siempre READ/WRITE; el MCP y el chat de la TUI usan las mismas tools.
2. `src/ai/provider.ts`: interfaz LLM + implementación Ollama con `fetch` nativo a `localhost:11434`. Config por env (`AI_MODEL`, `OLLAMA_HOST`). Health-check si Ollama no está corriendo.
3. `src/ai/agent.ts`: loop de tool-calling con system prompt de dominio (tipos de item, semántica de cuotas y prorrateo, ownership/`myShare`, formato es-AR). Máximo N iteraciones como guard contra loops.
4. Screen `Chat` en Ink + tecla `c`. Primera versión: solo lectura, sin streaming.
5. Recién después: categorización (sugerencia al ingresar), patrones, recomendaciones.
6. MCP server al final: expone las MISMAS tools de lectura vía stdio y se registra en `opencode.json`. Así cualquier agente consulta los gastos con el mismo comportamiento que el chat de la TUI.

**Decisiones tomadas:**
- El chat es **solo lectura**; crear/editar/borrar queda en los formularios de la TUI.
- El MCP server expone **solo tools de lectura**: agentes externos pueden consultar, nunca modificar.
- Proveedor por defecto: **Ollama local** (los datos financieros no salen de la máquina). El cloud solo cambia dónde corre el modelo, no la fuente de datos.
- Categorización por **sugerencia** (el humano confirma), no automática.

**Cuándo:** después de v4. Orden interno de v5: chat → categorización → patrones → recomendaciones → MCP server.
