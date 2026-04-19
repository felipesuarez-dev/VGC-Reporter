# Frontend — Arquitectura

React 19 + TypeScript + Vite + TailwindCSS sobre Tauri 2.4.

## Reglas duras

- **Sin HTTP directo**. Todo I/O vive en Rust. El frontend sólo llama `invoke` vía el wrapper tipado en `lib/ipc.ts`.
- **Tipos generados**. `lib/types.generated.ts` lo produce `ts-rs` desde Rust; nunca editar a mano.
- **Hash router**. `createHashRouter` es obligatorio porque Tauri sirve el bundle desde `file://` en producción.
- **i18n en ambos locales**. Cada clave en `es.json` y `en.json`. Nunca hardcodear strings.
- **Recharts requiere `ResponsiveContainer` con `height` explícito**.
- **Sprites por `<PokemonSprite>`** (setea `data-sprite="true"` para `image-rendering: pixelated`).
- **Links externos** vía `tauri-plugin-opener` (`openUrl`), no `window.open`.

## Estado

- **Server state** → TanStack Query (cache + invalidación). Nunca copiar datos del server a Zustand.
- **Form state** → `useState` o React Hook Form.
- **UI global** → Zustand stores (`stores/`).

## Stack puntual

- `@tauri-apps/api/core` exporta `invoke` (no la ruta v1).
- `@smogon/calc` para Damage Calc — usar `Generations.get(9)`. Importar `Pokemon as CalcPokemon` para evitar choque con el dominio.
- `cmdk` para multiselects con teclado.
- `Intl.DisplayNames` para nombres de país localizados.

## Layout (`src/`)

```
main.tsx              QueryClientProvider + RouterProvider + i18n
router.tsx            hash router
i18n.ts               i18next, persiste idioma en localStorage
locales/{es,en}.json  traducciones
styles.css            tailwind base + clases (card/btn/input/label)
lib/                  ipc, queryKeys, types.generated, helpers
stores/               Zustand
pages/                una por ruta, named export
components/           layout, pokemon, charts, team, tournament, dashboard, filters, info, ui
hooks/                useTranslations
```

## Comandos

- `npm run tauri:dev` — dev hot reload.
- `npm run tauri:build` — bundle de producción (MSI en Windows).
- `npm run lint` — `tsc --noEmit`.
