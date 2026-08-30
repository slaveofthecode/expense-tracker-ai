# Roadmap

Visión general de las versiones planificadas de la app.

Cada versión define:
- **Objetivo**: qué valor aporta.
- **Checklist**: ítems a completar.
- **Cómo implementar**: decisiones técnicas y archivos involucrados.
- **Cuándo**: orden y dependencias con el resto de las versiones.

## v1 — Visual Prototype

TUI funcional con datos hardcodeados que muestra grupos de gastos con sus totales mensuales.

- [x] Definir modelos de datos
- [x] Mock data con grupos y gastos de ejemplo
- [x] Dashboard con lista de grupos y total del mes
- [x] Detalle de grupo con sus gastos
- [x] Persistencia en SQLite

## v2 — Persistencia e Ingreso de Datos

- [x] SQLite como base de datos local
- [x] Formularios TUI para agregar gastos
- [x] CRUD de grupos (crear, editar, eliminar)
- [x] Editar y eliminar gastos
- [x] Soporte para cuotas (tarjetas, préstamos)
- [x] Vigencia mensual al crear gastos: "Alquiler $560.000 durante 4 meses" genera N registros idénticos en meses consecutivos (mismo día, con clamp a fin de mes), excluyente con cuotas y disponible solo en alta (ver `src/utils/fixedMonths.ts`). En el detalle del grupo los registros idénticos se consolidan en UNA fila con el valor en cada mes cubierto (ver `src/utils/detailRows.ts`); las cuotas mantienen su fila propia
- [x] Grupo automático al crear gastos: el campo Grupo es un híbrido (ver `src/utils/autoGroup.ts`) — se puede escribir un nombre nuevo directamente (ej: "Tarjeta de Credito Naranja", respetado tal cual) o ciclar los existentes con `←`/`→`; antes de crear, lo escrito se matchea contra grupos existentes (`findItemForConcept`) para evitar duplicados, con preview en vivo ("Se usará el grupo existente X" / "Se creará el grupo Y (tipo inferido por palabras clave)"). Si el campo queda vacío, el grupo se deriva de la descripción. El Dashboard ya no tiene alta de grupo independiente (la tecla `i` desapareció): los grupos nacen al cargar gastos. La edición nunca auto-crea grupos

## v3 — Búsqueda y Filtros

**Objetivo:** encontrar gastos rápido desde cualquier pantalla y navegar directo al detalle.

- [x] Filtro por tipo en Dashboard (tecla `t`, cicla `credit_card`, `kids`, `car`, `home`, `other`)
- [x] Búsqueda global con resultados en vivo: `SearchPalette` al presionar `/` (directo, sin pasar por lista de comandos)
- [x] Resultados por gasto: cada fila muestra grupo, tipo, persona, monto y fecha; si un grupo matchea sin gastos, se muestra como fila extra
- [x] Enter sobre un resultado navega al detalle del grupo posicionando la fila del gasto que matcheó (ajustando el año)
- [x] Filtro por persona (gastos compartidos según `ownership.person`) a través de la búsqueda
- [x] Estilo visual unificado en las grillas (Dashboard, ItemDetail): celdas grises, header del mes actual blanco bold, compartidos amarillos, fila seleccionada solo en bold sin cambio de color. Todos los grupos (incluidos credit_card) usan la grilla mensual mes a mes; la vista de tarjetas individual fue eliminada

**Cómo implementar:**
- `src/utils/filters.ts`: `searchResults` devuelve filas por gasto (grupo, tipo, persona, monto, fecha) y filas de grupo sin gastos; reutiliza `normalize` (case/accent-insensitive). La misma lógica se reutiliza después en la tool `search_expenses` de v5.
- `src/app/components/SearchPalette.tsx`: input con resultados en vivo (↑↓ para navegar, Enter abre el grupo, Esc cierra), reemplaza a `CommandPalette`.
- El screen `itemDetail` lleva `focusExpenseId` opcional para posicionar el cursor en la fila del gasto origen; `App` ajusta el año antes de navegar.
- Fuera de alcance: búsqueda semántica con IA (se evalúa como mejora post-v5). El filtro por tipo sigue funcionando pero ya no se muestra en el footer.

**Cuándo:** primera entrega analítica; habilita reportes útiles (v4).

## v4 — Reportes

**Objetivo:** consolidar los datos en gráficos dentro de la terminal.

- [x] Pantalla `Charts` (tecla `g` en Dashboard, hint en el footer) con 4 gráficos seleccionables con `1`/`2`/`3`/`4`:
  - Gasto mensual del año (12 barras; tu parte en amarillo sobre el total)
  - Gasto por tipo de grupo (barras por `ItemType`, ordenadas desc, con % del total)
  - Top ítems del año (top 5 con monto y %)
  - Distribución por tipo (barra única segmentada por tipo con leyenda)
- [x] Año navegable con `←`/`→`; `Esc` vuelve al Dashboard
- [x] Barras adaptativas al ancho del terminal y colores de la paleta existente

**Cómo implementar:**
- `src/utils/charts.ts`: `computeCharts` arma `ChartsData` (mensual, por tipo, top) a partir de `calcYearlySummaries`; helpers puros de barras (`scaleBlocksMin`, `distributeSegments` con mínimo 1 bloque por valor > 0, `barString`, `annotation`). Todo testeable sin Ink.
- `src/app/components/Charts.tsx`: render con `Text` de Ink (barras con `█`/`░`), pantalla nueva `{ name: "charts" }` en `App.tsx`.
- Fuera de alcance de v4 (se evalúa en el futuro): exportación a CSV/JSON y resumen mensual por ítem en pantalla (la base de cálculo ya existe en `calcMonthlySummaries`).

**Cuándo:** después de v3 (los reportes se filtran), antes de v5 (la IA necesita datos consolidados).

## v5 — AI Analysis

**Objetivo:** análisis de gastos en lenguaje natural con asistencia de IA. La app consulta un LLM con tools (function calling): la IA decide qué consultar, la app ejecuta contra SQLite y la IA explica los resultados. La DB local es siempre la fuente de verdad; el LLM solo ve resultados de tools, nunca la DB directa.

- [x] Módulo `src/ai/` con interfaz de proveedor intercambiable (Ollama local por defecto; cloud OpenAI/Anthropic/Gemini opcional por env var)
- [x] Chat AI en la TUI: consultas en lenguaje natural (ej: "¿cuánto gasté en marzo?") con respuestas basadas en datos reales
- [x] Tools de consulta (solo lectura): `list_items`, `list_expenses`, `get_monthly_summary`, `get_yearly_summary`, `search_expenses`
- [x] Categorización automática por sugerencia al ingresar (la IA propone el grupo y el humano confirma)
- [x] Detección de patrones de gasto (cálculo numérico en `src/utils/patterns.ts` + insights en lenguaje natural por LLM): `analyze_patterns` calcula cambios mes a mes, tendencias (regresión lineal), anomalías (z-score) y grupos recurrentes (estabilidad ≥ 0.7)
- [x] Recomendaciones (reglas determinísticas + redacción y jerarquía por LLM): `src/utils/recommendations.ts` genera recomendaciones ordenadas por severidad (subida >15%, pico de categoría, recurrente nuevo, principal motor de gasto >40%) expuestas vía `get_recommendations`
- [x] MCP server (`src/mcp/server.ts`) exponiendo las tools de lectura para cualquier agente externo (opencode, Claude Desktop, etc.), registrado en `opencode.json` — solo lectura (`readOnlyHint` por tool)

**Cómo implementar (orden sugerido):**
1. `src/ai/tools.ts`: registry único de tools de lectura construidas sobre `repository.ts` y `summaries.ts`. Clasificar siempre READ/WRITE; el MCP y el chat de la TUI usan las mismas tools.
2. `src/ai/provider.ts`: interfaz LLM + implementación Ollama con `fetch` nativo a `localhost:11434`. Config por env (`AI_MODEL`, `OLLAMA_HOST`). Health-check si Ollama no está corriendo.
3. `src/ai/agent.ts`: loop de tool-calling con system prompt de dominio (tipos de grupo, semántica de cuotas y prorrateo, ownership/`myShare`, formato es-AR). Máximo N iteraciones como guard contra loops.
4. Screen `Chat` en Ink + tecla `c`. Primera versión: solo lectura, sin streaming.
5. Recién después: categorización (sugerencia al ingresar), patrones, recomendaciones.
6. MCP server al final: expone las MISMAS tools de lectura vía stdio y se registra en `opencode.json`. Así cualquier agente consulta los gastos con el mismo comportamiento que el chat de la TUI.

**Decisiones tomadas:**
- El chat es **solo lectura**; crear/editar/borrar queda en los formularios de la TUI.
- El MCP server expone **solo tools de lectura**: agentes externos pueden consultar, nunca modificar.
- Proveedor por defecto: **Ollama local** (los datos financieros no salen de la máquina). El cloud solo cambia dónde corre el modelo, no la fuente de datos.
- Categorización por **sugerencia** (el humano confirma), no automática.

**Cuándo:** después de v4. Orden interno de v5: chat → categorización → patrones → recomendaciones → MCP server.

## v6 — Ingreso de gastos por chat

> Primera versión implementada (branch `feat/031-chat-create-expense`) por decisión del usuario de habilitar escritura con confirmación. El registry de tools sigue siendo **solo lectura**: la creación no pasa por tools sino por extracción de intención + callbacks de la TUI.

**Implementado:**
- `src/ai/expenseIntent.ts`: extracción de intención (`create_expense` | `none`) con borrador tipado (ítem, tipo inferido, descripción, monto total ARS, cuotas) y matching de concepto contra ítems existentes (case/accent-insensitive, substring y subset de tokens).
- Chat de la TUI: al detectar intención muestra el borrador y pide confirmación `s/n`; `s` crea el ítem (si no existe, tipo inferido o `other`) y el gasto vía callbacks de `App` con refresco inmediato; `n` cancela sin escribir.
- Confirmación explícita del humano antes de escribir en la DB: siempre.
- Mejoras de matching al crear por chat: los grupos existentes se pasan como contexto al extractor (`feat/040`); `resolveGroupName` prioriza la referencia de tarjeta de crédito detectada en la pregunta ("con la naranja", "tarjeta T. Cordobesa") antes que el nombre del producto; heurística de override para cuando el usuario nombra una tarjeta distinta a la del grupo (PRs #41–#45).
- El system prompt del agente fuerza el uso de tools para preguntas factuales (`feat/039`).
- Tool de escritura `create_expense` en el registry: `src/ai/tools.ts` clasifica cada tool con `readonly`; `buildTools(ToolsContext)` la incluye solo cuando recibe contexto de escritura (`createItem`/`createExpense`) — `createChatTools(db)` (chat, con escritura + confirmación) vs `createReadTools(db)` (MCP, solo lectura). Parámetros: `itemName`, `description`, `amount`, `itemType`, `installmentsTotal`, `date`, `ownershipPercentage`, `ownershipPerson`. Resuelve grupo existente (`findItemForConcept`) o lo crea automáticamente con tipo inferido; cuotas e ownership se aplican al crear.
- Confirmación humana en el agente: `createAgent` acepta `onWriteCall` — una tool no-`readonly` requiere aprobación (sin handler, la escritura se rechaza y el modelo recibe el error).
- Flujo de diálogo guiado: si faltan `itemName`, `description` o `amount`, el extractor devuelve `create_expense_incomplete` y el chat pregunta campo por campo lo que falta (`applyGuidedAnswer`, `parseAmountFromText` para montos en texto, Esc cancela).
- Ownership compartido desde el chat: el prompt del extractor reconoce "a medias", "mitad y mitad", "compartido con X" y devuelve `ownershipPercentage`/`ownershipPerson` (si hay persona sin reparto, 50%); el borrador y la creación aplican el ownership.

**Decisiones finales:**
- El MCP queda **solo lectura** (hereda `createReadTools`); la escritura con confirmación es exclusiva del chat de la TUI.
- El chat **sí escribe**, siempre con confirmación explícita del humano (`s/n` en el borrador o aprobación de la tool).
