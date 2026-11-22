# Release

## Versionado

La versión visible es `MAJOR.MINOR.PATCH.YYYYMMDD-beta` (por ejemplo
`0.6.0.20261122-beta`). Tauri, Cargo y los `package.json` usan el semver
`0.6.0`; el sufijo con fecha vive en `frontend/src/lib/version.ts` y en el tag.

```bash
bun scripts/bump-version.ts 0.6.0.20261122-beta
bun scripts/bump-version.ts --check --tag v0.6.0.20261122-beta
```

`--check --tag` falla si el tag no coincide con la versión de la app. El
workflow de release ejecuta esta comprobación antes de crear el draft.

## Puertas de calidad

`.github/workflows/release.yml` ejecuta el job `verify` antes de compilar:

- `cargo fmt --check`
- `cargo clippy --all-targets -- -D warnings`
- `cargo test` (incluye la exportación de tipos ts-rs)
- el diff de `frontend/src/lib/types.generated.ts` debe estar limpio
- `bun run --cwd frontend build` y `bun run --cwd frontend test`
- paridad de claves de los 5 locales
- tests de scripts (`bun run test:scripts`) y de `latest.json` (Python)

En CI, el draft solo se crea si `verify` pasa; `build` y `android` dependen
de él. El harness local ejecuta la comprobación de versión y compila los assets
por su cuenta.

## Assets

| Plataforma | Nombre |
|---|---|
| Windows MSI (en-US) | `VGC.Reporter_0.6.0_x64_en-US.msi` |
| Windows MSI (es-ES) | `VGC.Reporter_0.6.0_x64_es-ES.msi` |
| Android arm64 | `VGC.Reporter_v0.6.0.20261122-beta_android.apk` |

El APK publicado es **arm64** (Android 7+, `minSdk 24`). En Windows se publican ambos idiomas del MSI; `latest.json` apunta al `en-US` porque el updater usa un único asset por plataforma. macOS y Linux ya no se compilan: el
objetivo es Windows + Android y no gastar minutos de Actions en plataformas que
no se distribuyen.

## Instaladores

- WiX: banner y dialog PumaSoft; idiomas `en-US` y `es-ES`.
- Los bitmaps se regeneran con `python scripts/generate_installer_assets.py` y
  se versionan en `src-tauri/icons/`.

## Firma

- **Updater**: `TAURI_SIGNING_PRIVATE_KEY` y
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Cada bundle produce un `.sig`. La llave
  pública correspondiente vive en `plugins.updater.pubkey` de
  `src-tauri/tauri.conf.json`; si se rota la llave, hay que actualizar ese valor
  y reconstruir los instaladores. Las instalaciones firmadas con la llave
  anterior no aceptan el `latest.json` nuevo y requieren reinstalación manual.
- **Windows Authenticode**: `WINDOWS_CERT_PFX_BASE64` y
  `WINDOWS_CERT_PASSWORD` (certificado self-signed PumaSoft, vigente hasta
  2029-11-21). El workflow importa el PFX en el runner y pasa un `--config`
  con el thumbprint para que Tauri firme **antes** de calcular los `.sig`.
  Sin los secretos el build continúa sin firmar.
- Un certificado self-signed identifica al publisher, pero no elimina
  SmartScreen; solo un certificado de CA pago lo hace.
- El harness local no aplica Authenticode: el MSI sale **unsigned**. La firma
  del updater sí se genera con la llave local.
- Si se vuelve a usar GitHub Actions después de rotar llaves, hay que
  actualizar los secrets `TAURI_SIGNING_PRIVATE_KEY`,
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, `ANDROID_KEYSTORE_BASE64`,
  `ANDROID_KEY_ALIAS`, `ANDROID_KEYSTORE_PASSWORD` y `ANDROID_KEY_PASSWORD`
  con las llaves nuevas. El workflow no puede leer las llaves locales.

## latest.json

`scripts/build_latest_json.py` es la única fuente de verdad. Descarga todos los
`.sig` del release y genera las claves de plataforma:

- `windows-x86_64` y `windows-x86_64-msi` (MSI)
- `android` (APK)

El script conserva el mapeo `darwin-*` por compatibilidad con releases
antiguos, pero el workflow actual no genera assets de macOS.

El job `finalize-latest-json` corre solo si `build` y `android` terminaron
bien, y `publish-release` solo si el manifest se generó. Si algo falla, el
release queda en draft.

## Release manual / recuperación

- `workflow_dispatch` acepta un tag existente.
- `.github/workflows/regenerate-latest-json.yml` reconstruye `latest.json` a
  partir de los assets de un release ya publicado.
- Si Actions no está disponible (por ejemplo, bloqueo de facturación de la
  cuenta), el release se publica desde Windows con el harness local
  `scripts/release-local.ps1`: compila el MSI y el APK, firma los assets, crea
  el draft, sube todo, genera `latest.json` y publica.
- El harness necesita JDK 21, Android SDK/NDK 25, los targets Rust de Android y
  las llaves de firma locales. Linux no se compila en Windows, por eso queda
  fuera del release.

### Harness local

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-local.ps1 `
  -Tag v0.6.0.20261122-beta -NoPublish
```

Sin `-NoPublish` publica el release al terminar. El script:

1. Verifica que el tag coincida con la versión de la app.
2. Compila el frontend y el MSI con firma de updater.
3. Compila el APK universal, lo firma con el keystore y le agrega la firma de
   updater.
4. Reúne los assets, genera `latest.json` y crea o actualiza el draft.
5. Sube todo y publica si no se pasó `-NoPublish`.

Las llaves viven fuera del repo, en `%LOCALAPPDATA%\vgc-reporter`:
`updater.key`, `updater-password.txt` y `android-keystore.txt`. El keystore
Android está en la raíz del repo y está cubierto por `*.keystore` en
`.gitignore`; nunca se versiona.

## Checklist antes de taggear

1. `bun scripts/bump-version.ts --check --tag vX.Y.Z.FECHA-beta`
2. `bun scripts/check-locales.ts`
3. `bun scripts/probe-sources.ts` (identificadores vivos)
4. `cargo fmt --check`, `cargo clippy`, `cargo test`
5. `bun run --cwd frontend build && bun run --cwd frontend test`
6. `bun run tauri:build -- --bundles msi` y validación local del instalador
7. `bun x tauri android build --apk`, firmar y verificar el APK
8. Capturas del README actualizadas
9. Confirmación de Felipe; recién entonces commit `[release] ...`, tag y push


## Instalador 0.6.0

- src-tauri/windows/main.wxs es una copia de la plantilla de Tauri 2.10 con el shortcut de escritorio usando Icon=ProductIcon. Cualquier actualización de Tauri debe re-diffearse contra esta plantilla.
- DISCLAIMER.txt se pasa como bundle.licenseFile; el MSI muestra la página de licencia y el descargo bilingüe.
- bundle.homepage apunta al repositorio.
