# Documentación técnica

Estructura:

- [`data-sources.md`](./data-sources.md) — fuentes externas, endpoints, TTLs, headers.
- [`release.md`](./release.md) — versionado, puertas de calidad, assets, firma y latest.json.
- [`sync.md`](./sync.md) — ticket QR, sesión LAN, estados y tests.
- [`updater.md`](./updater.md) — updater desktop, descarga/verificación/instalación Android.
- [`backend/`](./backend/) — capas Rust (architecture, commands, services, adapters, storage, domain).
- [`frontend/`](./frontend/) — React (architecture, pages, components, stores, ipc, aprender).
- [`pipelines/`](./pipelines/) — flujos de datos end-to-end (top-pokemon, top-teams, trending, champions-tournaments, official-tournaments, regulaciones dinámicas).

Convenciones:

- Rutas con formato `archivo:linea` cuando aplica.
- Funciones clave nombradas explícitamente.
- Sin emojis.
