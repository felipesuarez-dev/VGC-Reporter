# VGC-Reporter — Guía raíz

**Producto:** VGC-Reporter
**Versión:** 0.2.2.20260517-beta
**Autor:** PumaSoft

Aplicación Tauri 2 + Rust + React para estadísticas competitivas de Pokémon Champions (VGC 2026, Regulation M-A — season M-2 activa) y construcción de equipos propios.

## ⚠️ Package manager: SOLO Bun

**NUNCA usar `npm`, `npx`, `npm install`, `npm run`, `npm ci`, ni `package-lock.json`.**
El proyecto migró a Bun por motivos de seguridad (incidentes en la cadena de suministro npm). Todos los comandos, scripts en `package.json`, workflows CI y docs deben usar Bun:

| npm | Bun |
|-----|-----|
| `npm install` | `bun install` |
| `npm ci` | `bun install --frozen-lockfile` |
| `npm run <script>` | `bun run <script>` |
| `npm run <script> --workspace X` | `bun run --cwd X <script>` |
| `npx <bin>` | `bunx <bin>` o `bun x <bin>` |
| `npm test` | `bun test` |
| `npm audit` | `bun audit` |
| `npm outdated` | `bun outdated` |
| `npm publish` | `bun publish` |
| `package-lock.json` | `bun.lock` (texto en Bun 1.3+) |

Si encuentras un comando npm en cualquier archivo del repo, repórtalo y reemplázalo.

**GitHub Actions**: nunca usar `actions/setup-node`, `cache: 'npm'`, `npm ci` ni `npx` en workflows. Usar siempre `oven-sh/setup-bun@v2`, `bun install --frozen-lockfile`, `bun run`, `bunx`. Cualquier nuevo workflow debe usar Bun desde el día 1.

## 🛑 Reglas obligatorias (instruidas explícitamente por Felipe)

> Este bloque documenta reglas que el usuario (Felipe) instruyó añadir tras pillar bugs concretos en producción. Cada regla cita el incidente que la originó para que el contexto no se pierda. **No remover ni relajar sin pedirle confirmación**.

### Regla 1 — Build pass ≠ runtime works (verificación visual obligatoria)

`tsc --noEmit && vite build` y `cargo build --release` **solo validan tipos y bundles**. No prueban el render real ni la lógica runtime de los componentes. Antes de hacer `git tag` y push de cualquier release, si el commit toca **componentes UI nuevos o complejos** (charts de Recharts, modales, dialogs, formularios con efectos, hooks nuevos), tengo que:

1. Decir explícitamente a Felipe: "el build pasa pero NO verifiqué el runtime de `<componente>`. Necesitas abrir la app y probar `<flujo>` antes de tagear."
2. Indicar el flujo exacto que debe probar (qué pantalla abrir, qué interacción hacer).
3. **No tagear hasta que Felipe confirme** que probó visualmente y todo funciona.

**Incidente origen:** v0.2.0 introdujo `UsageTreemap`. El build pasaba pero Recharts invocaba el render del nodo root sintético (depth=0, sin datos), y el código accedía `payload.payload.usage_percent` sin guard. Crash inmediato del Dashboard tras auto-update. Costó un retag y un release "pa' nada" (commit `5498ff5`).

### Regla 2 — Migraciones SQLite deben ser idempotentes

`storage/db.rs` corre **todas** las migraciones en cada arranque, **no hay tracker de versión de schema**. Por tanto cada `.sql` debe sobrevivir a re-ejecución:

| Tipo SQL | Idempotente | Patrón |
|---|---|---|
| `CREATE TABLE IF NOT EXISTS` | ✅ | OK como está |
| `CREATE INDEX IF NOT EXISTS` | ✅ | OK como está |
| `INSERT OR IGNORE` | ✅ | OK como está |
| `UPDATE … WHERE` / `DELETE … WHERE` | ✅ | Idempotente por construcción |
| `ALTER TABLE … ADD COLUMN` | ❌ | **SQLite NO soporta `ADD COLUMN IF NOT EXISTS`** |
| `ALTER TABLE … RENAME` | ❌ | Idem |
| `DROP TABLE` | ❌ | Idem (sí soporta `IF EXISTS` pero verificar) |

Cuando una migración NO es idempotente nativamente, **guardarla en Rust con `PRAGMA table_info` (o equivalente) en `db.rs`** antes de `execute_batch`. Ver el patrón `column_exists()` para el caso de `ADD COLUMN`. Cualquier migración nueva que añada/renombre columnas DEBE seguir este patrón.

**Incidente origen:** v0.2.0 añadió migración 005 con 10 `ALTER TABLE ADD COLUMN`. Al instalar v0.2.1 (incluso tras desinstalar v0.2.0, porque la DB SQLite persiste en el data dir del usuario), la migración se re-ejecutaba y SQLite tiraba "duplicate column name: level" → `init_pool` retornaba Err → Tauri setup fallaba → app abre y cierra de inmediato sin mensaje (commits `687d65a` y siguiente fix).

### Regla 3 — Documentar problemas como reglas

Cualquier incidente nuevo que descubramos juntos (Felipe + IA) y que pudo prevenirse con una regla **se añade aquí inmediatamente** con:
1. El enunciado de la regla.
2. El incidente que la originó (con commit SHA cuando aplique).
3. Atribución a Felipe.

Esto es metadata viva del repo, no decoración. Si releo este archivo en una sesión futura, debo encontrar **todo** lo que aprendimos sufriendo.

## Documentación por capa

- **Backend (Rust):** `src-tauri/CLAUDE.md` — clean architecture, cómo añadir un command, errores, migraciones.
- **Frontend (React):** `frontend/CLAUDE.md` — rutas, IPC tipado, i18n, stores, shadcn.

## Filosofía

- **Simple, limpio, funcional.** Nada de sobre-ingeniería.
- **Clean architecture** en Rust: `domain` ← `services` ← `adapters` / `storage` ← `commands`. La dependencia apunta hacia el centro.
- **Frontend delgado**: todo fetching HTTP vive en Rust. El frontend solo llama `invoke()`.
- **Tipos sincronizados** automáticamente con `ts-rs` (nunca duplicar manualmente).
- **Multi-formato extensible, Regulation M-A activo**: el enum `Format` queda preparado, pero solo `RegulationMA` es seleccionable en UI.

## Comandos

```bash
# Dev (arranca frontend Vite + ventana Tauri)
bun run tauri:dev

# Build de producción (MSI en src-tauri/target/release/bundle/msi/)
bun run tauri:build

# Tests backend
cd src-tauri && cargo test

# Regenerar tipos TS desde Rust (ts-rs)
cd src-tauri && cargo test export_bindings

# Lint backend
cd src-tauri && cargo fmt && cargo clippy -- -D warnings

# Frontend dev sin Tauri
bun run --cwd frontend dev
```

## Estructura

```
VGC-Reporter/
  CLAUDE.md                 <- este archivo
  README.md
  package.json              <- workspace raíz
  frontend/                 <- React 19 + TS + Vite
    CLAUDE.md
  src-tauri/                <- Rust
    CLAUDE.md
    Cargo.toml
    tauri.conf.json
    src/
      domain/               <- entidades puras
      services/             <- casos de uso
      adapters/             <- HTTP clients
      storage/              <- SQLite
      commands/             <- Tauri IPC
```

## Fuentes de datos externas

Tabla completa en `README.md`. Resumen:

- **Labmaus** — primario para top teams, meta snapshot, trending y próximos torneos (Regulation M-A). Exige `Origin`/`Referer` en cada request; el `HttpClient` los inyecta para que no se filtren a otros hosts.
- **Limitless VGC API** — torneos Champions + standings + decklists inline.
- **Pokémon Showdown** — Pokédex, moves, items, abilities, sprites base.
- **Smogon chaos JSON** — fallback de usage ladder cuando el formato es muy nuevo.
- **pkmn/smogon data** — sets competitivos curados (Doubles + Singles).
- **Pikalytics** — breakdown por especie (items, abilities, moves, Tera, compañeros, EV spreads) dentro del detalle de Pokémon.
- **Pokepaste** — importación de equipos pegados; cache de 30 días (pastes inmutables).
- **PokéAPI CSV** — nombres y flavor text bilingüe (EN/ES).

Todo el fetching pasa por `HttpClient::get_cached` (SQLite TTL). No añadir `reqwest::Client::new()` directo en un service.

## Convenciones

- **Commits:** `[scope] mensaje corto` (ej. `[backend] add limitless_client`).
- **Código:** nada de comentarios que expliquen el *qué*; solo *por qué* cuando no es obvio.
- **Idioma UI:** claves en inglés (ej. `dashboard.top_pokemon`), traducidas vía `i18next` a ES/EN.
- **Errores:** `thiserror` en Rust, `Result<T, AppError>` en commands. El frontend los recibe como objetos serializados.

## Releases

Al crear un release, actualizar la versión en todos los sitios correspondientes (ver tabla abajo), hacer tag con el formato `vX.Y.Z.YYYYMMDD-beta` y push.

El workflow `release.yml` **auto-genera el body del release a partir de los commits entre el tag anterior y el nuevo**:
- Lee `git log <prev_tag>..<new_tag> --pretty=%s` y descarta los commits con scope `[release]` y `[ci]`.
- Si el subject contiene `fix`/`bug`/`hotfix`/`resolve` (case-insensitive) → va a **Fixes**. Cualquier otro commit → **Changes**.
- El body resultante se usa tanto como cuerpo del GitHub Release como en el campo `notes` de `latest.json` (lo que ve el usuario en el modal de actualización).

Si quieres editar el body a mano antes de publicar (o después), `sync-release-notes.yml` se dispara automáticamente en `release: published` y `release: edited`, y vuelve a copiar el body actual del release al `notes` de `latest.json`. También se puede disparar manualmente desde **Actions → Sync Release Notes to latest.json → Run workflow** (sin tag = usa el último release).

Para que la auto-generación produzca un body limpio, los mensajes de commit deben seguir la convención `[scope] verbo en infinitivo descripción`. Idealmente:

### Formato del body (auto-generado o manual)

```markdown
## Changes

- Add <feature nueva>
- Update <mejora existente>
- Improve <enhancement>

## Fixes

- Fix <bug específico>
- Resolve <issue específico>
```

Reglas:
- Cada bullet empieza con un **verbo en infinitivo en inglés** (`Add`, `Update`, `Improve`, `Fix`, `Resolve`, `Refactor`, `Remove`).
- Una línea por cambio, concisa pero específica (no "various fixes" — describir cada uno).
- Si hubo PRs mergeados, mencionar `(#123)` al final del bullet.
- **Omitir** la sección entera si no hay items (no dejar `## Fixes` vacío).
- **Nunca** incluir comentarios HTML placeholder (`<!-- ... -->`), notas de plataforma, instrucciones de descarga ni texto sobre auto-update — todo eso vive en el README.

### Ejemplo válido

```markdown
## Changes

- Add auto-update functionality to the mobile application
- Update and improve documentation

## Fixes

- Fix tag versioning
- Improve version labels and release notes for better user experience when reviewing changes
```

### Dónde actualizar la versión

| Archivo | Campo |
|---------|-------|
| `src-tauri/tauri.conf.json` | `"version"` |
| `src-tauri/Cargo.toml` | `version` (línea 3) |
| `frontend/src/lib/version.ts` | `APP_VERSION` |
| `package.json` (raíz) | `"version"` |
| `frontend/package.json` | `"version"` |
| `README.md` | badge `[version-badge]` + tabla de descarga |
| `CLAUDE.md` (este archivo) | `**Versión:**` en el encabezado |
