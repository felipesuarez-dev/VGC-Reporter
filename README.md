<div align="center">

<img src="assets/logo.png" alt="VGC Reporter" width="180" />

# VGC Reporter

**Estadísticas competitivas de Pokémon Champions y constructor de equipos, en desktop y Android.**

**Beta pública. Hecha con cariño, datos reales y mucho café. Si algo falla, repórtalo para iterar rápido.**

[![Versión][version-badge]][version-link]
[![Beta][beta-badge]](#descarga)
[![Tauri][tauri-badge]][tauri-link]
[![Rust][rust-badge]][rust-link]
[![React][react-badge]][react-link]
[![Licencia][license-badge]](LICENSE)
[![PumaSoft][pumasoft-badge]][pumasoft-link]

[English](README.en.md) · [Descarga](#descarga) · [Capturas](#capturas) · [Funciones](#funciones) · [Aprender](#aprender) · [Fuentes](#fuentes-de-datos) · [Arquitectura](#arquitectura) · [Desarrollo](#desarrollo)

</div>

---

## El problema

Pokémon Champions llegó el 8 de abril de 2026 y se convirtió en la plataforma oficial de VGC 2026 / Worlds. Los datos están repartidos entre Pikalytics, Pokemon-Zone, Porygon Labs, Champions Lab, Smogon, Limitless, PokéBase y los avisos de Pokémon HOME. Ninguna fuente tiene una API unificada ni una experiencia offline para mirar el meta **y** armar un equipo en el mismo lugar.

VGC Reporter es la herramienta que quería mientras construía equipos para Champions: una ventana, datos reales de torneo, calendario de regulaciones, cobertura de tipos, guías y todo cacheado localmente.

## Qué trae

- **Panel Principal** con cuatro vistas: **Novedades**, **Torneos**, **Métricas** y **Regulación**.
- **Pestañas de escritorio** en el navbar: `+` junto a la lupa. Cada pestaña conserva ruta, scroll y **su propia sesión de reproducción**; los directos de una pestaña no se mezclan con los de otra. Dentro de la misma pestaña, el ajuste de reproducción decide entre detener el video o pasarlo al mini-reproductor.
- **Aprender 2.0**: 12 guías de 9 secciones con fuentes y fecha de revisión, práctica de 10 preguntas/día, trivia, glosario de 80+ términos con ejemplos en 5 idiomas, 11 arquetipos de cores e insights con muestra y confianza.
- **Constructor Champions y Showdown**: 66 Stat Points o EVs/IVs con conversión automática al cambiar de modo.
- **Top Equipos** de Labmaus, Limitless, la comunidad de PokéBase y los **Top 8 de torneos oficiales** recientes, con insignia **Torneo oficial**.
- **En Vivo** con hasta 9 TVs en la Vitrina, la **última transmisión real** con “hace X” y duración, carga diferida con spinner grande y reproductores independientes por pestaña. Cada tile se inicia con play y el mini-reproductor se configura en Ajustes.
- **Tablas rápidas** de Tipos y Naturalezas con selección, ancladas en la barra de título o como widget flotante en el rail, atajo configurable y modo landscape.
- **Sincronización LAN dinámica** entre desktop y Android: el emisor elige qué enviar y el receptor qué importar; QR/ticket y código, estados, expiración y cierre tras una transferencia.
- **Updater Android interno** con progreso, cancelación, SHA-256/firma y FileProvider.
- **Torneos** con próximos eventos paginados por grupo, torneos recientes y calendario en una pestaña propia; filtros y paginación separados, modal de resultados/standings, **Top Cut con líneas de llaves**, rondas y equipos de oficiales.
- **Navegación mobile** híbrida: dock flotante con historial, búsqueda, `+` junto a la lupa, vistas abiertas y accesos, fijo o arrastrable, activable desde Ajustes.
- **Offline-friendly**: SQLite para caché y equipos, todas las llamadas de red en Rust.

## Capturas

<div align="center">
  <img src="assets/screen-torneos-0.7.0.png" alt="Pestaña Torneos con Próximos torneos, 10 por página y filtros país/ciudad" width="92%" />
  <br/>
  <img src="assets/screen-feed-0.7.0.png" alt="Novedades con resumen de regulación y En vivo" width="46%" />
  <img src="assets/screen-pokedex-0.7.0.png" alt="Pokédex rediseñada con uso, tipos y filtros" width="46%" />
  <br/>
  <img src="assets/screen-live-collapsible-0.6.3.png" alt="Últimas transmisiones colapsables dentro de En vivo" width="92%" />
  <br/>
  <img src="assets/screen-official-topcut-0.7.0.png" alt="Top Cut colapsable de un torneo oficial" width="46%" />
  <img src="assets/screen-official-rounds-0.7.0.png" alt="Historial por rondas con victorias y derrotas" width="46%" />
  <br/>
  <img src="assets/screen-tables-0.7.0.png" alt="Tablas rápidas rediseñadas con matriz de tipos" width="46%" />
  <img src="assets/screen-learn-0.7.0.png" alt="Aprender con botón de recarga de datos" width="46%" />
  <br/>
  <img src="assets/screen-glossary-0.7.0.png" alt="Glosario con definición, ejemplo y fuente" width="46%" />
  <img src="assets/screen-settings-collapsible-0.7.0.png" alt="Ajustes con todos los grupos colapsados y Expandir todo" width="46%" />
  <br/>
  <img src="assets/screen-settings-quick-tables-0.7.0.png" alt="Tablas rápidas con select y control segmentado del mismo alto" width="92%" />
  <br/>
  <img src="assets/screen-settings-sync-labels-0.7.0.png" alt="Sincronización con etiquetas humanas, sin claves técnicas" width="92%" />
  <br/>
  <img src="assets/screen-tabs-desktop-0.7.0.png" alt="Pestañas de escritorio en el navbar con + junto a la lupa" width="92%" />
  <br/>
  <img src="assets/screen-tabs-mobile-0.7.0.png" alt="Dock mobile con + junto a la lupa y vistas abiertas" width="46%" />
  <img src="assets/screen-tabs-mobile-views-0.7.0.png" alt="Hoja de vistas abiertas y accesos en mobile" width="46%" />
  <br/>
  <img src="assets/screen-sync-select-0.7.0.png" alt="Sincronización con selección de equipos, ajustes y UI" width="46%" />
  <img src="assets/screen-qr-0.6.2.png" alt="QR de sincronización y código de 8 caracteres" width="46%" />
  <br/>
  <img src="assets/screen-treemap-0.6.2.png" alt="Treemap de uso del meta" width="46%" />
  <img src="assets/screen-mobile-nav-0.7.0.png" alt="Dock de navegación mobile con vistas abiertas" width="46%" />
</div>

> Capturas de referencia de la beta. La 0.7.0 añade la pestaña **Torneos**, layouts Separados/Juntos en las cuatro vistas, Ajustes colapsables y reorganizados con controles coherentes y divisores sutiles, sync selectivo y etiquetas humanas, rail de widgets, **pestañas de escritorio en el navbar**, dock de navegación mobile con `+` junto a la lupa, filtros y paginación independientes en recientes/calendario, **Top Cut con líneas de llaves**, equipos/divisiones de PokéData, reproducción independiente por pestaña con mini configurable, guías con fuentes y glosario con ejemplos en cinco idiomas.

## Descarga

Instaladores de **`v0.7.0.20261123-beta`**:

| Plataforma | Instalador | Notas |
|---|---|---|
| Windows 10/11 | `VGC.Reporter_0.7.0_x64_en-US.msi` | MSI sin firma Authenticode; SmartScreen → Más información → Ejecutar de todas formas |
| Android 7+ (arm64) | `VGC.Reporter_v0.7.0.20261123-beta_android.apk` | Sideload o updater interno; activa “Instalar apps desconocidas” |

**[Descargar desde el último release de GitHub](https://github.com/felipesuarez-dev/VGC-Reporter/releases/latest)**

> **Firma:** esta versión usa la llave de updater nueva de 0.5.0. Si una instalación anterior no ofrece la actualización automática, instala el MSI o APK manualmente. En Android, desinstala la versión previa si la firma no coincide.

En el primer arranque se descargan y cachean Pokédex, movimientos, objetos y habilidades. Después funciona offline hasta que expiren las cachés.

## Inicio rápido

```bash
bun install
bun run tauri:dev
```

## Funciones

| Área | Qué hace |
|---|---|
| **Panel Principal** | Novedades (inicio), **Torneos**, Métricas y Regulación. Selector dinámico de regulación/temporada, rango de fechas compartido, drag & drop, colapsables y layouts Separados/Juntos en las cuatro vistas. **Pestañas de escritorio en el navbar** con `+` junto a la lupa; cada pestaña conserva ruta, scroll y su propia sesión de reproducción, sin reutilizar el reproductor de otra. |
| **Torneos** | Nueva pestaña con **Próximos torneos**, **Torneos recientes** y **Calendario**. Próximos pagina **10 eventos por grupo** con paginador independiente en Campeonatos, Locales y Limitless, filtros país/ciudad y grupos colapsables. Sin “Ver más/menos”. |
| **Métricas** | Top Pokémon en barras, grid, treemap con foreignObject/ellipsis y tooltip, o tiers. Top objetos/movimientos/habilidades con los Pokémon que más los usan. Sin Próximos torneos: viven en Torneos. |
| **Regulación** | Roster elegible, Megas, objetos permitidos con búsqueda, sprites, descripciones y porcentaje del total de equipos. Procedencia y confianza de cada fuente. |
| **Novedades** | Resumen de temporada → **En vivo** → **Noticias oficiales**. Las **últimas transmisiones** dentro de En vivo se colapsan y paginan 6 por página. Cada panel carga con su propio skeleton; se arrastran, agrupan y colapsan, y el layout se recuerda. |
| **En Vivo** | Pantallas de YouTube (YukS, Play! Pokémon, Wolfey, Cybertron, James Baek, PokeAlex, Moxie2D, MoxieBoosted, BlackStormGamesVGC, Pokémon Champions, Sekiam, THATSAplusONE). Hasta 9 en Vitrina 3×3. Solo se marca **en vivo** con señales fuertes de YouTube; estrenos, programados y “Live in…” se rechazan. Los canales offline muestran su **última transmisión real** con badge **No está en vivo**, “hace X” y duración. Cada tile se inicia con play (autoplay al primer click) y cada pestaña mantiene sus propios reproductores; al salir de Novedades, el ajuste de reproducción decide entre detenerlos o mostrarlos en el mini-reproductor. |
| **Próximos torneos** | Pestañas **Oficiales** (Play! Pokémon presencial + campeonatos de la temporada) y **Comunidad Limitless** (online, no oficiales). Los oficiales incluyen **LAIC, NAIC, EUIC, Regionales, Especiales y Worlds** con badge de nivel, rango de fechas, premio en efectivo, campeón si ya hay resultados y `.ics` multi-día. País y ciudad son **múltiples**; el país local de Ajustes preselecciona el filtro, la ciudad solo lista los países elegidos y agrupa por país. Los majors no se ocultan por el filtro local. **Paginador independiente de 10 por grupo** y grupos colapsables. |
| **Torneos recientes** | El mismo componente en **Panel → Torneos** y **Top Equipos**: toda la fila abre el detalle, “Ver resultados” es igual para oficiales y comunidad, y cada grupo tiene búsqueda, filtro de país y paginación de 10 en 10. Oficiales con modal de resumen, fecha, sede, premio, campeón, standings (oficiales con respaldo de PokéData), **Top Cut con líneas de llaves**, historial completo por rondas con victorias en verde y derrotas en rojo, divisiones del evento y **equipos Top 8 de PokéBase** con respaldo de PokéData. |
| **Calendario** | Vive en **Torneos** o anclado en la barra de título. Día actual siempre marcado, dots por categoría, agrupación **Campeonatos oficiales / Torneos de la comunidad / Personales**, botón Hoy, filtro de ciudad solo para oficiales locales, multi-día, zona horaria y `.ics`. Cada grupo del día pagina 6 eventos. |
| **Noticias** | Avisos oficiales paginados, preview dentro de la app, skeleton/shimmer y “Abrir en el navegador”. |
| **Aprender** | Progreso, 12 guías de 9 secciones con fuentes y fecha de revisión, práctica de **10 preguntas/día** (tipos, velocidad, lead, naturaleza, Stat Points, cláusulas), trivia ampliada, **11 arquetipos con “Probar core”**, equipos iniciales, glosario de 80+ términos con **ejemplo en 5 idiomas y fuentes**, botón de recarga de datos y 6 insights con muestra/confianza. |
| **Tablas rápidas** | Atajo configurable (`Ctrl+T` por defecto) y ubicación **anclada en la barra de título** o **widget flotante** en el rail; ya no existe la card fijada en una página. Tipos con selección atacante/defensor; naturalezas en grid × stats con +10%/−10%; modo **Pantalla grande / Landscape**. |
| **Top Equipos** | Equipos de torneo de Labmaus/Limitless, equipos de comunidad/torneo de PokéBase y **Top 8 de torneos oficiales recientes** con insignia **Torneo oficial**; **Oficial** aparece en la línea de Fuentes. Filtros por rango de fechas, fuente, país, jugador y Pokémon. Las métricas de uso no mezclan los equipos oficiales parciales. |
| **Constructor** | **Champions** (66 SP, 32 por stat, IVs 31, nivel 50, cláusulas) y **Showdown** (EVs/IVs). Conversión EV↔SP al cambiar de modo. Import/export Showdown. El modo clásico se conserva internamente para equipos antiguos. |
| **Sincronización** | QR versionado + código de 8, sesión de 5 minutos, token obligatorio, un solo uso, estados visibles y fallback manual. El **emisor elige qué equipos/ajustes/UI envía** y el **receptor elige qué importar** de ese subconjunto; conflictos renombrar/reemplazar/omitir sobre lo seleccionado. |
| **Updater** | Desktop con diagnóstico y fallback MSI. Android descarga interna con progreso/cancelación, verificación de tamaño/SHA-256/firma y FileProvider; “Abrir en GitHub” queda como opción secundaria. |
| **Móvil** | Dock de navegación flotante con atrás/adelante, búsqueda, **`+` junto a la lupa**, vistas abiertas y accesos; fijo abajo centrado o libre arrastrable, activable/desactivable. Al activarse, el topbar oculta atrás/adelante/lupa para no duplicar controles. `100dvh` + safe-area en landscape y tablas táctiles. |
| **Mis equipos** | Persistencia SQLite, renombrar, **duplicar con icono**, eliminar con confirmación, importar y exportar varios equipos. |
| **Calculadora** | `@smogon/calc` Gen 9 con buscadores para todos los campos. |
| **Pokédex** | Rediseñada: orden por generación/alfabeto/uso, filtros con chips activos, cards con uso/tipos/BST, ficha con sets, stats, tipos, matchups y Pikalytics. |
| **Ajustes** | Grupos General, Widgets y navegación, Reproducción y directos, Datos y fuentes, Sincronización y Avanzado. **Todas las secciones y cards son colapsables**, con Expandir/Contraer todo. Controles coherentes (switch/segmentado/checkbox/select), divisores sutiles entre opciones, etiquetas humanas en sync, slider de fuente con contraste por tema, navegación mobile y sync QR-first. |
| **5 idiomas** | ES / EN / FR / IT / PT en UI, datos localizados y Learn. |

## Aprender

La página **Aprender** no es un muro de texto. Reúne:

- **Progreso** visual de guías leídas.
- **Equipos iniciales** desde torneos recientes y PokéBase, con “Ver más” y “Cargar en constructor”.
- **Práctica diaria**: **10 preguntas** de tipos, velocidad, leads, naturalezas, Stat Points y cláusulas, con explicación obligatoria, puntaje y racha.
- **Trivia de reglas** diaria con explicación.
- **Cores reales del meta** y **11 arquetipos** con roles, condición de victoria, cómo se juega, variantes y **Probar core** desde datos del meta actual.
- **Datos que importan**: mejor win rate con muestra, mejor top cut, amenaza emergente, respuesta anti-meta, speed control y objeto clave, con muestra/fuentes/confianza.
- **12 guías** de 9 secciones con ejemplos, errores, checklist, fuentes verificables y fecha de revisión.
- **Glosario** de 80+ términos, 6 categorías, buscador por término/definición/ejemplo, chips e índice alfabético, con **ejemplo competitivo en los cinco idiomas y fuentes** en modal.
- **Recarga de datos** en la cabecera para refrescar meta, Pokédex, Top Teams y trending cuando una fuente tarda.
- **Herramientas**: tablas rápidas, constructor, calculadora, regulación, Top Equipos y calendario.

## Fuentes de datos

| Fuente | Uso |
|---|---|
| Pokémon HOME / Champions notices | Calendario, temporada, roster oficial y Megas |
| Labmaus | Equipos de torneo, meta y validación de regulación |
| Limitless VGC | Torneos, standings, decklists y próximos online |
| PokéBase | Equipos de torneo y comunidad de Pokémon Champions; equipos Top 8 de oficiales |
| Calendario oficial Championship Series | LAIC, NAIC, EUIC, Regionales, Especiales y Worlds; fechas, sede, premios y resultados |
| PokéData | Eventos presenciales, dirección, contacto y precio; standings de respaldo, equipos de todos los jugadores, divisiones `Masters`/`Master` y Top Cut derivado del historial cuando falta el HTML |
| Pokémon Zone | Agregador externo de torneos y equipos de Pokémon Champions (enlace, sin scraping) |
| Smogon | Fallback de ladder |
| Pokepaste | Pastes de equipos |
| Pikalytics | Breakdown por Pokémon |
| Showdown / PokéAPI | Pokédex, movimientos, objetos, habilidades y traducciones |
| YouTube | Directos VGC |
| pokebase.app | Sprites de Megas inventadas por Champions |

**Sin scraping de APIs prohibidas:** PokéBase se lee de su página pública de equipos, respetando `robots.txt`, con caché de 12 h. Si PokéBase atribuye un equipo a otra fuente, se conserva y muestra esa atribución.

**Aviso legal:** PokéBase, PokéData y Pokémon Zone son sitios externos no afiliados, patrocinados ni respaldados por The Pokémon Company International Inc., Nintendo, Creatures Inc. ni GAME FREAK Inc., ni asociados de ninguna forma con ellos. Sus datos pueden ser no oficiales.

## Arquitectura

```mermaid
flowchart TD
  subgraph FE["React 19 · TypeScript · Vite · Tailwind"]
    Pages[Páginas] --> Hooks[Hooks]
    Hooks --> Stores[Zustand]
    Hooks --> IPC["ipc.ts tipado (ts-rs)"]
    I18n["i18next · 5 idiomas"] -.-> Pages
    Learn[Aprender] --> Content[Contenido 5 idiomas]
    TypeLab[TypeLab] --> TypeChart[typeChart.ts]
  end

  IPC -->|invoke| CMD
  subgraph BE["Rust · Tauri 2 · clean architecture"]
    CMD[commands/] --> SVC[services/]
    SVC --> DOM[domain/]
    SVC --> ADP[adapters/]
    SVC --> STO[storage/ SQLite]
    ADP --> HTTP[HttpClient + caché]
  end

  HTTP -.-> EXT["Labmaus · Limitless · PokéBase<br/>Pokémon HOME · Championships · Pokedata · Showdown · PokéAPI"]
```

Las dependencias apuntan siempre hacia dentro. `domain/` no conoce I/O; todo el HTTP pasa por `adapters/http_client.rs` y su caché SQLite.

## Sincronización

```mermaid
sequenceDiagram
  participant D as Desktop
  participant M as Móvil
  participant S as Sesión LAN temporal
  D->>S: inicia sesión (token, puerto)
  D-->>M: QR con URL + token
  M->>S: descarga bundle por Rust/reqwest
  M->>M: preview + conflictos
  M->>S: sesión de envío
  M-->>D: QR + código de 8
  D->>S: descubre por UDP y descarga
```

- Misma Wi-Fi; sin nube.
- QR para ambos sentidos; código de 8 para desktop, que no tiene cámara. El enlace manual queda en opciones avanzadas.
- **Emisor:** elige equipos, grupos de ajustes y preferencias de UI antes de crear la sesión.
- **Receptor:** elige qué importar del subconjunto recibido.
- Conflictos: renombrar, reemplazar u omitir solo los equipos seleccionados.
- Si la red bloquea la transferencia, se puede exportar/importar un archivo.

## Desarrollo

```bash
bun install
bun run tauri:dev
bun run --cwd frontend test
cd src-tauri && cargo test
```

Calidad antes de release:

```bash
bun scripts/check-locales.ts
bun scripts/bump-version.ts --check --tag v0.7.0.20261123-beta
cd src-tauri && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
bun run --cwd frontend build && bun run --cwd frontend test
```

## Stack

| Frontend | Backend | Build |
|---|---|---|
| React 19 | Rust 2021 | Tauri 2 |
| TypeScript | tokio | Vite |
| TailwindCSS | reqwest + rustls | Bun |
| TanStack Query | rusqlite + r2d2 | MSI / APK |
| Zustand | serde / thiserror | GitHub Releases |
| React Router | ts-rs | |
| Recharts | | |
| `@smogon/calc` | | |

## Licencia

MIT. VGC Reporter es un proyecto no oficial y sin fines de lucro. No está afiliado a Nintendo, The Pokémon Company, Game Freak ni Creatures Inc. Pokémon y sus nombres son marcas de sus respectivos dueños. Consulta `DISCLAIMER.txt`.

[version-badge]: https://img.shields.io/badge/version-0.7.0.20261123--beta-8b5cf6
[version-link]: https://github.com/felipesuarez-dev/VGC-Reporter/releases
[beta-badge]: https://img.shields.io/badge/status-beta-f59e0b
[tauri-badge]: https://img.shields.io/badge/Tauri-2-24C8DB
[tauri-link]: https://tauri.app
[rust-badge]: https://img.shields.io/badge/Rust-2021-000000
[rust-link]: https://www.rust-lang.org
[react-badge]: https://img.shields.io/badge/React-19-61DAFB
[react-link]: https://react.dev
[license-badge]: https://img.shields.io/badge/license-MIT-green
[pumasoft-badge]: https://img.shields.io/badge/by-PumaSoft-2b86ff
[pumasoft-link]: https://github.com/felipesuarez-dev
