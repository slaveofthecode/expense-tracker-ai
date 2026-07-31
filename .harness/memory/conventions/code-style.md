# Convenciones de Código

## TypeScript

- Usar `const` por defecto, `let` solo cuando sea necesario
- Nunca usar `any`
- Tipar explícitamente funciones y variables públicas
- **Evitar non-null assertions (`!`) en código de producción.** Preferir guards (`if (!x) return`) o early returns.
- En tests, `!` está permitido solo si va precedido de `expect(x).toBeDefined()`.

## React

- **No usar `useCallback` ni `useMemo` sin beneficio real.** Solo aplican cuando:
  - La función se pasa a un child con `React.memo`
  - La función es dependencia de un `useEffect`/`useMemo`/`useCallback`
  - Se ha medido un problema de performance
- Preferir funciones planas dentro del componente a hooks de memorización.

## Nombres

- Variables y funciones: camelCase
- Clases y tipos: PascalCase
- Archivos: kebab-case

## Styles

- Usar modo Dark Mode Minimalist / Dark Tech Aesthetic, el cual se caracteriza por fondos oscuros (negro puro o gris muy oscuro #0d0d0d), tipografías limpias y componentes con bordes sutiles.

## Commits

- Mensajes en inglés
- Formato: `tipo: descripción` (ej: `feat: add expense model`)
