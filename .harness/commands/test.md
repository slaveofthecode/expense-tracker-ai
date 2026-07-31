---
description: Ejecuta todos los tests del proyecto y valida calidad
agent: tester
---

# Comando: Test

Valida TypeScript, calidad de código y ejecuta tests unitarios.

## Instrucciones

1. Lee las convenciones en `.harness/memory/conventions/code-style.md`
2. Valida calidad del código contra code-style.md (busca `!`, `useCallback`/`useMemo` sin deps, `any`, etc.)
3. Ejecuta `bunx tsc --noEmit` para validar tipado
4. Ejecuta `bun test` para correr tests unitarios
5. Si hay fallas, analiza el error y sugiere fixes
6. Reporta:
   - Violaciones de code-style.md (archivo, línea, regla violada)
   - Errores de compilación (archivo, línea, tipo)
   - Tests pasados/fallidos/totales
   - Cobertura de casos edge no cubiertos
