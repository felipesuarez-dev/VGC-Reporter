# Frontend — Components

`frontend/src/components/`.

## layout/
- `AppShell.tsx` — wrapper principal. Desktop: sidebar colapsable con resize drag + `Titlebar`. Mobile: sidebar overlay drawer + `MobileTopbar`. Detecta `isMobile` via `matchMedia("(max-width: 767px)")`. Aplica safe-area insets en sidebar header/footer y `<main>`.
- `Titlebar.tsx` — header desktop con branding, búsqueda, tema/idioma y controles de ventana.
- `MobileTopbar.tsx` — barra superior para Android: hamburguesa, logo, título, búsqueda, tema/idioma. Incluye `paddingTop: env(safe-area-inset-top)` para respetar la barra de estado del sistema.
- `LanguageToggle.tsx` — toggle ES/EN.
- `ThemeProvider.tsx` — provee variables CSS según tema.
- `ThemeSelect.tsx` — selector de tema (system, Gengar, Clefable, Incineroar, Tyranitar). Variante `titlebar` muestra Palette + bolita bicolor del tema activo.
- `AboutModal.tsx` — versión, licencia, créditos. El bloque "Buscar actualizaciones" está oculto en mobile (el updater es desktop-only). Usa `useModalBack`.
- `UpdaterModal.tsx` — modal de actualización disponible/descarga. Sólo se renderiza en desktop (`!isMobile`).
- `UpdaterErrorBanner.tsx` — banner de error del updater. Sólo se renderiza en desktop.
- `SourcesChip.tsx` — badge linkable a fuentes externas.

## pokemon/
- `PokemonCard.tsx` — card con sprite, stats, tipo, usage %.
- `PokemonDetailModal.tsx` — modal grande: abilities, moves por tier, sets, Pikalytics, matchups.
- `PokemonSprite.tsx` — sprite pixelado con cadena de fallback (primary → fallback → home).
- `TypeBadge.tsx` — chip tipo.
- `MiniTeam.tsx` — 6 sprites compactos.
- `MovesetTierCard.tsx` — moves agrupados por frecuencia.
- `PikalyticsSection.tsx` — bloque con datos de Pikalytics (items, EVs, teammates, etc.).
- `MoveCategoryIcon.tsx` — Physical/Special/Status.

## team/
- `TeamMemberForm.tsx` — formulario por miembro.
- `EVSliders.tsx` — sliders con validación de tope 252 / 508.
- `TopTeamDetailModal.tsx` — visor de equipo campeón.
- `ImportCompletionModal.tsx` — resolver Pokémon faltantes al importar.

## charts/
- `UsageBarChart.tsx` — barras horizontales con sprite a la izquierda (Recharts + `<foreignObject>`).
- `TopList.tsx` — lista ranked.
- `TrendingCard.tsx` — indicadores up/down.

## filters/
- `PokemonMultiSelect.tsx` — multiselect con sprites (cmdk).
- `SearchTextInput.tsx` — input de texto.
- `CountryFilter.tsx` — dropdown de país (códigos ISO).

## tournament/
- `TournamentStandingsDrawer.tsx` — drawer/modal con standings completos + decklists. Incluye filtros de jugador, país y Pokémon. Usa `useModalBack` para el botón Atrás de Android.

## dashboard/
- `XCard.tsx` — wrapper de embed de Twitter/X.

## info/
- `EntityChip.tsx` — chip con tooltip para ability/move/item.

## ui/
- `Tooltip.tsx` — tooltip flotante via portal. Dos fases: fase 1 calcula posición desde el trigger; fase 2 mide el rect real del tooltip y desplaza `left` para que ambos bordes queden a ≥ 8 px del viewport (crítico en mobile con pantallas estrechas).
- `SearchSelect.tsx` — combo-box con autocompletado.
- `FormatSelector.tsx` — dropdown de regulación.
- `MultiTypeSelect.tsx` — multiselect de tipos.
- `ScrollToTop.tsx` — botón ancla.

## info/
- `EntityChip.tsx` — chip con `Tooltip` para ability/move/item. El tooltip incluye nombre localizado, tipo, categoría (para moves) y descripción de PokéAPI.
- `MoveDetailModal.tsx` — modal de detalle de movimiento (z-[55]). Usa `useModalBack`.
- `ItemDetailModal.tsx` — modal de detalle de objeto. Usa `useModalBack`.
- `AbilityDetailModal.tsx` — modal de detalle de habilidad. Usa `useModalBack`.
