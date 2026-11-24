# Design system — controles y coherencia visual

Reglas permanentes para que la app se sienta como un solo producto, no como una
colección de widgets nativos. Aplican a Ajustes, Sincronización, modales,
constructor, filtros y cualquier superficie nueva.

## Un solo lenguaje de controles

| Necesidad | Componente | Semántica |
|---|---|---|
| Preferencia on/off | `ToggleSwitch` (`components/ui/FormControls.tsx`) | Un switch, no un checkbox suelto |
| Elección exclusiva (2–3 opciones) | `SegmentedControl` | `role="radiogroup"`; nunca radios nativos |
| Lista multi-selección o confirmación explícita | `CheckboxField` | Checkbox cuadrado con acento |
| Lista larga de opciones | `SelectField` | Select de 36 px con label consistente |

- **No** se usan `input[type="radio"]` nativos en la UI.
- **No** se mezclan checkboxes para preferencias on/off: para eso está el switch.
- Los checkboxes quedan reservados a selección múltiple (equipos/ajustes de sync)
  y acknowledgements (“no volver a preguntar”).
- Los selects solo se usan cuando hay muchas opciones; si son 2–3, segmented.

## Anatomía

- Altura de control: **36 px** (`h-9`) para selects y segmented.
- Label: 10 px, mayúsculas, `--text-dim`, `mb-1`.
- Hint: 11 px, `--text-muted`, debajo del control o del switch.
- Cards: `rounded-xl border`, icono + título + hint + chevron, contenido
  `px-4 pb-4 space-y-3`.
- Separadores entre opciones de una card: 1 px,
  `color-mix(in srgb, var(--border) 58%, transparent)`, degradado transparente
  en los extremos, centrado en el espacio existente (`space-y-3`) para no
  cambiar la altura. **Aplicado en Ajustes, nunca sobre acciones.**
- Los controles usan solo variables de tema (`--accent`, `--border`, `--bg-elev`,
  `--text-*`). Nunca colores hardcodeados.

## Ajustes y Sincronización

- Los grupos y cards son colapsables; el estado se guarda en `uiStore`.
- Sincronización **no muestra claves de almacenamiento** (`live_stream_urls`,
  `labmaus_name::…`). `lib/syncLabels.ts` traduce cada clave a una etiqueta
  humana con fuente y regulación, más un hint corto.
- Los overrides se leen como “Labmaus · Regulación M-C”, no como un slug.
- Los paneles de envío/recepción usan `CheckboxField` para listas y
  `ToggleSwitch` para incluir preferencias de UI; el conflicto usa
  `SegmentedControl`.
- La estética del slider de tamaño de fuente usa pista con progreso de acento,
  track mezclado con `--text` y anillo de contraste; debe verse en los cinco
  temas (Umbreon, Zekrom, Reshiram, claros y oscuros).

## Pestañas de escritorio (implementado)

Mockup de referencia: `C:\Users\felip\.opencode\plan\vgc-tabs-navbar-mockup.html`.

- Las pestañas viven **dentro del titlebar/navbar**, en la misma fila que logo,
  historial, búsqueda y controles de ventana. No hay una segunda fila.
- `+` **junto a la lupa**, en el grupo izquierdo del navbar; crea una pestaña
  nueva en **Panel Principal**.
- La tira mide 30 px dentro de un titlebar fijo de 44 px; scroll horizontal si
  hay más de 8 y el `+` queda fijo.
- Cada pestaña guarda ruta, scroll y su propia sesión de reproducción. La activa
  usa acento; el cierre aparece en hover/activo.
- Cerrar activa la vecina; cerrar la última crea un Panel Principal nuevo. Al
  cerrar una pestaña se eliminan sus reproductores.
- Cada pestaña conserva sus vivos: cambiar de pestaña los oculta, pero no los
  detiene ni reutiliza el reproductor de otra. Dentro de la misma pestaña, al
  salir de Novedades el ajuste `stop`/`mini` decide si se detiene o pasa al
  mini-reproductor. El rail queda a la derecha del mini sin taparse.
- Mobile: no cabe una tira horizontal en el topbar. El equivalente es el dock
  inferior + hoja de vistas (vistas abiertas + accesos). El `+` va en el dock
  **junto a la lupa** y crea una vista nueva en Panel Principal.
- Atajos: `Ctrl+Alt+T` nueva pestaña, `Ctrl+Alt+W` cerrar (propuestos; no chocan
  con `Ctrl+T` de Tablas ni `Ctrl+W` de ventana).
- Implementación: `viewTabsStore` con `id/activeId/scrollY`, `useViewTabActions`
  con guardado/restauración de scroll, `DesktopTabStrip` dentro de `Titlebar`,
  `MobileNavDock` usando el mismo store.

## Divisores de opciones (implementado)

Preview: `C:\Users\felip\.opencode\plan\vgc-settings-dividers-preview.html`.

- 1 px, `color-mix(in srgb, var(--border) 58%, transparent)`, degradado
  transparente en los extremos.
- Centrado en el espacio existente (`space-y-3`), sin layout shift.
- Solo entre **opciones**; nunca sobre acciones como “Abrir tablas rápidas”
  (`settings-card-body > button::before { display: none; }`).
- Aplicado al cuerpo de las cards de Ajustes (`SettingsCard`).

## Responsive

- **Mobile**: dock de navegación fijo/arrastrable con controles de 36 px fijos (no escalan con la fuente), rail de widgets encima del dock, mini-reproductor a la izquierda del rail y por encima del dock. La jerarquía es mini `z-39`, rail `z-40`, dock `z-41`; los modales (`z-50+`) tapan el dock y el rail.
- **Desktop**: rail abajo a la derecha; el mini se coloca a su izquierda, con la misma altura inferior, para no taparlo ni mover el rail.
- **PanelBoard**: `grid-cols-1` + `min-w-0` en cada panel; probar 390×844 sin scroll horizontal en las cuatro vistas.
- Respetar `env(safe-area-inset-*)` y `100dvh`.
- Ajustes: una columna en mobile; grids de dos columnas desde `sm`.
- Probar siempre 390×844 (mobile) y 1440×900 (desktop).

## Video y En vivo

- `PlaybackProvider` mantiene una **sesión independiente por pestaña**: cada
  pestaña tiene sus streams activos, su estado detenido y su mini-reproductor.
  Un iframe por stream activo; el mismo nodo se reposiciona entre el tile y el
  mini con un rect loop, sin reparentarlo.
- Cambiar de pestaña oculta los reproductores de la anterior, pero no los
  detiene ni los mezcla con la nueva. Cerrar la pestaña elimina solo esos
  reproductores.
- Continuidad por defecto: `mini`, configurable en **Ajustes → Directos y
  pantallas**. `stop` detiene el video al salir de Novedades; `mini` lo mantiene
  en una tarjeta apilada a la izquierda del rail (encima del dock en mobile).
- Varios tiles pueden estar reproduciéndose a la vez dentro de la misma pestaña;
  cada uno tiene su propio iframe, su botón Detener y su mini si se abandona la
  página. No se adopta ningún directo automáticamente: cada click inicia el suyo.
- El **calendario de Torneos** y el del widget comparten `FeedCalendar` y los grupos **Campeonatos oficiales** / **Torneos de la comunidad** colapsables con chevron y contador. En Torneos ocupa todo el ancho del panel; el widget mantiene un ancho compacto.
- **PanelBoard** usa `grid-cols-1` + `min-w-0`; ningún panel debe provocar scroll horizontal a 390 px.
- `LazyVideoFrame` (IntersectionObserver + `loading="lazy"`) se usa en la
  Vitrina TV; la vitrina de Novedades crea el iframe solo al pulsar play. Entrar
  a Novedades no debe congelarse. La imagen de respaldo es 1920×1080 PNG (16:9),
  igual que el visor de YouTube.
- La Vitrina TV es la excepción explícita: puede montar hasta 9 tiles.

## Detalle de torneos oficiales

- **Top Cut** y **Equipos Top 8** usan el mismo patrón de card colapsable
  (`rounded-xl border`, icono, título, hint y chevron que rota).
- El bracket usa columnas por ronda, tarjetas `rounded-lg` y los tokens
  `--success` (ganador), `--text-muted` (perdedor) y `--warning` (final).
- El historial por rondas se abre desde el chevron de cada fila de standings;
  agrupa **Suizas** y **Top Cut**, con `R{n}`, rival, país y placement. Verde =
  victoria, rojo = derrota, ámbar = empate, gris = bye.
- El texto de fuentes externas va en 9-10 px, al pie del modal y en Ajustes;
  nunca en un banner que tape contenido.

## Accesibilidad

- Los controles custom mantienen el `input` nativo con `sr-only` para teclado y
  lectores de pantalla.
- `ToggleSwitch`/`CheckboxField`: foco visible con ring de acento.
- `SegmentedControl`: `role="radiogroup"`, `role="radio"` y `aria-checked`.
- La Pokédex muestra un spinner sobre la cuadrícula atenuada al cambiar el orden y no reordena en caliente sin feedback.
- `hooks/useModalBack.ts` mantiene una pila: la ficha de un Pokémon abierta desde el detalle de un torneo se cierra sola y deja el torneo abierto.
- Todo control tiene label textual; no depender solo del color.

## Tests de regresión

- `components/ui/FormControls.test.tsx` — switch, segmented, checkbox, select.
- `components/playback/PlaybackProvider.test.tsx` — un iframe por stream, autoplay
  al primer click, sesiones separadas por pestaña, mini al perder el tile,
  limpieza al cerrar pestaña y modo `stop`.
- `components/ui/LazyVideoFrame.test.tsx` — no monta iframe hasta el viewport y
  oculta el spinner al cargar.
- `lib/syncLabels.test.ts` — etiquetas humanas, nunca claves crudas.
- `lib/learnContent.test.ts` - guías/glosario con fuentes y 5 idiomas.
- `lib/tournamentPlayers.test.ts` - nombres truncados del feed oficial contra PokéData.
- `components/tournament/TopCutBracket.test.tsx` - bracket colapsable y rondas.
- `components/tournament/PlayerMatchHistory.test.tsx` - suizas/Top Cut y verde/rojo.

## Checklist antes de cerrar una UI

- [ ] ¿On/off usa `ToggleSwitch`?
- [ ] ¿Elección exclusiva usa `SegmentedControl`?
- [ ] ¿Multi-selección usa `CheckboxField`?
- [ ] ¿Los controles de una fila miden 36 px y comparten label/hint?
- [ ] ¿Se ve bien en tema claro y oscuro?
- [ ] ¿Se probó en 390×844 y 1440×900?
- [ ] ¿Hay un test puro o de componente para la lógica nueva?
