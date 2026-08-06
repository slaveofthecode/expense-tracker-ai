---
name: code-review
description: Revisa código para bugs, seguridad y buenas prácticas
---

# Skill: Code Review

## Proceso

1. Lee el archivo a revisar
2. Ejecuta `bun run lint` si existe (si no, usa `bunx tsc --noEmit` como chequeo base)
3. Busca problemas comunes:
   - Tipos `any` en TypeScript
   - Secrets hardcodeados
   - Manejo de errores faltante
   - Violaciones a `.harness/memory/conventions/code-style.md` (`!` en producción, `useCallback`/`useMemo` innecesarios)
4. Reporta hallazgos con severidad (crítico/advertencia/info)

## Output

Lista numerada con:

- Línea del problema
- Tipo de issue
- Sugerencia de fix
