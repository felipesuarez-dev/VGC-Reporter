# Frontend — Stores (Zustand)

`frontend/src/stores/`. Sólo estado global de UI. **Nunca** copiar datos del server (esos viven en TanStack Query).

| Store | Estado | Persistencia |
|---|---|---|
| `teamBuilderStore` | `team` (draft), `pendingImport`, `pendingImportMissing` | en memoria |
| `dashboardStore` | `format`, `favoriteFormat`, `tournamentCount` | `favoriteFormat` en `localStorage` |
| `pokedexStore` | `sort` (generation/alphabetical/usage), `selectedPokemonId` (modal target), `scrollY`, filtros | parcial en `localStorage` |
| `filtersStore` | `query`, `typeFilter` | — |
| `uiStore` | `theme` (system/gengar/clefable/incineroar/tyranitar), `sidebarCollapsed` | `localStorage` |
| `navHistoryStore` | `entries[]`, `index` (back/forward) | en memoria |

## Patrón

- Cada store define `selectors` con `useStore((s) => s.field)` para evitar re-renders innecesarios.
- Setters explícitos (`setTheme`, `setFormat`, etc.).
- Persistencia con middleware `persist` cuando la pieza es UX-relevant entre sesiones.
