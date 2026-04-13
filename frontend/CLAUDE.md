# frontend — Claude notes

React 19 + TypeScript + Vite + TailwindCSS. Talks to the Rust backend via Tauri `invoke()` through a typed wrapper in `src/lib/ipc.ts`. Never makes HTTP calls directly — all network I/O lives on the Rust side (CORS, caching, rate limiting).

## Commands

From repo root:

- `npm run tauri:dev` — dev mode with hot reload (webview + vite)
- `npm run tauri:build` — production bundle (MSI on Windows)
- `npm run lint` (workspace) — `tsc --noEmit` type-check

## Layout

```
src/
  main.tsx             # bootstrap: QueryClientProvider + RouterProvider + i18n
  router.tsx           # hash router (required for Tauri file:// in prod)
  i18n.ts              # i18next, persists lang in localStorage
  locales/{es,en}.json # translations — add a key in BOTH files
  styles.css           # tailwind base + component classes (card/btn/input/label)
  lib/
    ipc.ts             # typed invoke wrappers → use `ipc.*` always
    queryKeys.ts       # central TanStack Query keys
    types.ts           # hand-mirror of Rust domain types (keep in sync)
    cn.ts              # className join helper
  stores/              # Zustand (teamBuilder, filters)
  pages/               # one file per route, named exports
  components/
    layout/            # AppShell, LanguageToggle
    pokemon/           # Card, Sprite, TypeBadge, MiniTeam
    team/              # TeamMemberForm, EVSliders
    charts/            # Recharts wrappers
    ui/                # shadcn primitives
  hooks/               # optional query wrappers
```

## Conventions

- **IPC**: always go through `ipc.*` (never call `invoke()` directly). If you need a new backend call, add the method there first.
- **Query keys**: always use `queryKeys` from `lib/queryKeys.ts`. Don't inline string arrays — invalidation must match exactly.
- **Types**: `lib/types.ts` is the authoritative frontend type surface. It mirrors `src-tauri/src/domain/*.rs`. When a Rust field changes, update it here too. Once ts-rs generation is wired, switch consumers to the generated file and keep `types.ts` as a thin re-export.
- **i18n**: every user-visible string goes through `t('key')`. Add the key to BOTH `es.json` and `en.json`. Never hardcode Spanish/English literals in JSX.
- **Routing**: hash router only (`createHashRouter`). Tauri serves the bundle from `file://` in production and BrowserRouter breaks.
- **Styling**: use the component classes from `styles.css` (`card`, `input`, `btn-primary`, `btn-ghost`, `label`) before reaching for ad-hoc utility soup. Stay on dark palette (`slate-*`, `brand-*`).
- **Sprites**: use `<PokemonSprite>` — it sets `data-sprite="true"` so CSS applies `image-rendering: pixelated`. Don't render `<img>` directly for sprites.

## Adding a new page

1. Create `src/pages/Thing.tsx` with a **named** export (`export function Thing() {}`).
2. Register the route in `router.tsx` under the `AppShell` children.
3. Add a nav item in `components/layout/AppShell.tsx` (icon from `lucide-react`, label via `t('nav.thing')`).
4. Add `nav.thing` to both locale files.

## Adding a new IPC call

1. Add the command on the Rust side (see `src-tauri/CLAUDE.md`).
2. Add the method to `ipc` in `src/lib/ipc.ts` with its typed return.
3. Add a query key entry in `src/lib/queryKeys.ts`.
4. Consume with `useQuery`/`useMutation` in the page.

## State

- **Server state** → TanStack Query (cache, invalidation). Never copy server data into Zustand.
- **Form state** → local `useState` / React Hook Form for complex forms.
- **UI global state** → Zustand (`stores/`). Currently: team builder draft, pokedex filters.

## Gotchas

- `@tauri-apps/api/core` exports `invoke`, not the old v1 path.
- External links must go through `tauri-plugin-opener` (`openUrl`), not `window.open` — plain `open` is blocked by Tauri's webview.
- Recharts needs `ResponsiveContainer` with an explicit `height` or it collapses to 0.
- `@smogon/calc` uses `Generations.get(9)` for Gen 9. Import `Pokemon as CalcPokemon` to avoid clashing with our domain `Pokemon`.
