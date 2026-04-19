# Frontend — Components

`frontend/src/components/`.

## layout/
- `AppShell.tsx` — wrapper principal, sidebar nav + titlebar + outlet.
- `Titlebar.tsx` — header con branding y controles.
- `LanguageToggle.tsx` — toggle ES/EN.
- `ThemeProvider.tsx` — provee variables CSS según tema.
- `ThemeSelect.tsx` — selector de tema (system, Gengar, Clefable, Incineroar, Tyranitar). Variante `titlebar` muestra Palette + bolita bicolor del tema activo.
- `AboutModal.tsx` — versión, licencia, créditos.
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
- `TournamentStandingsDrawer.tsx` — drawer lateral con standings + decklists.

## dashboard/
- `XCard.tsx` — wrapper de embed de Twitter/X.

## info/
- `EntityChip.tsx` — chip con tooltip para ability/move/item.

## ui/
- `Tooltip.tsx` — tooltip flotante.
- `SearchSelect.tsx` — combo-box con autocompletado.
- `FormatSelector.tsx` — dropdown de regulación.
- `MultiTypeSelect.tsx` — multiselect de tipos.
- `ScrollToTop.tsx` — botón ancla.
