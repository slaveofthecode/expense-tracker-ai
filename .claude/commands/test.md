---
description: Valida TypeScript, calidad de código contra code-style.md y ejecuta los tests
---

Actúa como el agente tester. Ejecuta `bunx tsc --noEmit` para validar tipado estricto y `bun test` para correr todos los tests, y valida la calidad del código contra `.harness/memory/conventions/code-style.md`. Reporta fallos con archivo, línea, tipo de error y sugerencia. No hagas git add/commit/push.
