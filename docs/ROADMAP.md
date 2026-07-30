# Roadmap

Visión general de las versiones planificadas.

## v1 — Visual Prototype

TUI funcional con datos hardcodeados que muestra items de gastos con sus totales mensuales.

- [x] Definir modelos de datos
- [x] Mock data con items y gastos de ejemplo
- [x] Dashboard con lista de items y total del mes
- [x] Detalle de item con sus gastos
- [ ] Persistencia en SQLite

## v2 — Persistencia e Ingreso de Datos

- SQLite como base de datos local
- Formularios TUI para agregar gastos
- CRUD de items (crear, editar, eliminar)
- Soporte para cuotas (tarjetas, préstamos)

## v3 — Búsqueda y Filtros

- Filtrar gastos por mes
- Filtrar por item o categoría
- Filtrar por persona (gastos compartidos)
- Búsqueda textual

## v4 — Reportes

- Resumen mensual por item
- Gráficos en terminal (barras, torta)
- Exportación a CSV/JSON

## v5 — AI Analysis

- Categorización automática de gastos
- Detección de patrones de gasto
- Recomendaciones
