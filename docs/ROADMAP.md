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

**Objetivo:** encontrar gastos rápido desde cualquier pantalla y navegar directo al detalle.

- [x] Filtro por tipo en Dashboard (tecla `t`, cicla `credit_card`, `kids`, `car`, `home`, `other`)
- [x] Búsqueda global con resultados en vivo: `SearchPalette` al presionar `/` (directo, sin pasar por lista de comandos)
- [x] Resultados por gasto: cada fila muestra item, tipo, persona, monto y fecha; si un item matchea sin gastos, se muestra como fila extra
- [x] Enter sobre un resultado navega al detalle del item posicionando la fila del gasto que matcheó (ajustando el año)
- [x] Filtro por persona (gastos compartidos según `ownership.person`) a través de la búsqueda
- [x] Estilo visual unificado en las grillas (Dashboard, ItemDetail, ItemDetailCard): celdas grises, header del mes actual blanco bold, compartidos amarillos, fila seleccionada solo en bold sin cambio de color

**Cómo implementar:**
- `src/utils/filters.ts`: `searchResults` devuelve filas por gasto (item, tipo, persona, monto, fecha) y filas de item sin gastos; reutiliza `normalize` (case/accent-insensitive). La misma lógica se reutiliza después en la tool `search_expenses` de v5.
- `src/app/components/SearchPalette.tsx`: input con resultados en vivo (↑↓ para navegar, Enter abre el item, Esc cierra), reemplaza a `CommandPalette`.
- El screen `itemDetail` lleva `focusExpenseId` opcional para posicionar el cursor en la fila del gasto origen; `App` ajusta el año antes de navegar.
- Fuera de alcance: búsqueda semántica con IA (se evalúa como mejora post-v5). El filtro por tipo sigue funcionando pero ya no se muestra en el footer.

**Cuándo:** primera entrega analítica; habilita reportes útiles (v4).

## v4 — Reportes

**Objetivo:** consolidar los datos en gráficos dentro de la terminal.

- [x] Pantalla `Charts` (tecla `g` en Dashboard, hint en el footer) con 4 gráficos seleccionables con `1`/`2`/`3`/`4`:
  - Gasto mensual del año (12 barras; tu parte en amarillo sobre el total)
  - Gasto por tipo de ítem (barras por `ItemType`, ordenadas desc, con % del total)
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
- [x] Categorización automática por sugerencia al ingresar (la IA propone el item y el humano confirma)
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

## v6 — Ingreso de gastos por chat (NO planificada)

> ⚠️ **Idea a futuro, no se va a implementar.** Queda documentada como visión para no perder el contexto si algún día se evalúa. No hay branch ni trabajo asociado.

**Objetivo:** que el chat pueda crear gastos hablando: el usuario describe la compra en lenguaje natural ("cama sommier $600000 en 6 cuotas"), el modelo aclara lo que falte (medio de pago, tarjeta, persona), el humano confirma y el gasto se guarda y aparece en el Dashboard.

- [ ] Tool de escritura `create_expense` en el registry de tools (hoy todas son `readonly`)
- [ ] Flujo de diálogo guiado: el LLM pide los datos faltantes antes de guardar
- [ ] Confirmación explícita del humano antes de escribir en la DB
- [ ] Refresco del Dashboard/App al crear el gasto desde el chat

**Cómo implementar:**
- Ampliar `src/ai/tools.ts` con herramientas WRITE (ej: `create_expense`) manteniendo la clasificación READ/WRITE.
- Distinguir en el agente cuándo una tool es de escritura y requerir confirmación (revertir la decisión de "chat solo lectura").
- Separar también qué tools ve el MCP server: probablemente se mantienen solo lectura para agentes externos.

**Decisiones pendientes:**
- ¿El chat de la TUI permite escritura pero el MCP queda solo lectura, o ambos? Hoy el roadmap dice que ambos son solo lectura.

**Cuándo:** después de v5, solo si se re-evalúa la decisión de seguridad de "chat solo lectura". Es una candidata a v6, no un compromiso.
