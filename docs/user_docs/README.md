# Guía del usuario

Bienvenido a **VGC-Reporter**, una aplicación nativa (desktop y Android) para seguir estadísticas de torneos Pokémon VGC Champions (Regulation M-A) y armar tus propios equipos competitivos.

## Qué puedes hacer

- **Panel**: ver el meta actual de un vistazo — top Pokémon, items, moves, abilities, Tera, trending y próximos torneos.
- **Pokédex**: buscar y filtrar cualquier Pokémon, con stats, moves por tier de uso, sets competitivos y datos de Pikalytics.
- **Constructor de equipos**: armar equipos con validación automática, importar/exportar en formato Showdown.
- **Mis equipos**: guardar equipos localmente y volver a editarlos.
- **Top Equipos**: ver equipos campeones reales de torneos Champions recientes, filtrables por Pokémon, torneo o país.
- **Calculador de daño**: calcular daños con el motor oficial de la comunidad (`@smogon/calc`).

## Guías por módulo

- [Panel](./panel.md)
- [Pokédex](./pokedex.md)
- [Constructor de equipos](./constructor-equipos.md)
- [Mis equipos](./mis-equipos.md)
- [Top Equipos](./top-equipos.md)
- [Calculador de daño](./calculador-danio.md)

## Primer uso

1. Abre la aplicación — tarda unos segundos la primera vez porque descarga la Pokédex de Showdown y la cachea localmente.
2. Ve al **Panel** para ver el estado actual del meta.
3. Si quieres armar un equipo, entra al **Constructor**. Si tienes uno en formato Showdown, pégalo en "Importar".

## Idioma y tema

**Desktop** — en el titlebar tienes el selector de idioma (ES/EN) y el selector de tema (System, Gengar, Clefable, Incineroar, Tyranitar).

**Android** — en la barra superior (topbar) tienes los mismos botones de idioma y tema, más el botón de hamburguesa para abrir el menú lateral.

## Navegación en Android

- El menú lateral se abre con el botón de hamburguesa (☰) en la barra superior y se cierra con la X o tocando fuera.
- El **botón Atrás** del sistema cierra el modal o cajón abierto en ese momento. Si no hay ninguno abierto, navega hacia la pantalla anterior.
- Los tooltips de movimientos, objetos y habilidades se ajustan automáticamente para no salirse de los bordes de la pantalla.

## Privacidad

- Tus **equipos guardados** viven sólo en tu dispositivo (SQLite local). No se suben a ningún servidor.
- La app consulta fuentes públicas (Labmaus, Limitless, Pikalytics, Showdown, Smogon, PokéAPI, Pokepaste) para obtener estadísticas. No se envía información personal.
