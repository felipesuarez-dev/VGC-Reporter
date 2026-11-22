# Release

## Versionado

La versión visible es `MAJOR.MINOR.PATCH.YYYYMMDD-beta` (por ejemplo
`0.5.0.20261121-beta`). Tauri, Cargo y los `package.json` usan el semver
`0.5.0`; el sufijo con fecha vive en `frontend/src/lib/version.ts` y en el tag.

```bash
bun scripts/bump-version.ts 0.5.0.20261121-beta
bun scripts/bump-version.ts --check --tag v0.5.0.20261121-beta
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

El draft solo se crea si `verify` pasa. `build` y `android` dependen de él.

## Assets

| Plataforma | Nombre |
|---|---|
| Windows MSI | `VGC.Reporter_0.5.0_x64_en-US.msi` |
| Linux DEB | `VGC.Reporter_0.5.0_amd64.deb` |
| Android | `VGC.Reporter_v0.5.0.20261121-beta_android.apk` |

El release compila solo **MSI** en Windows y solo **DEB** en Linux, además del
APK. macOS ya no se compila: el objetivo es Windows + Linux + Android y no
gastar minutos de Actions en plataformas o formatos que no se distribuyen.

## Instaladores

- WiX: banner y dialog PumaSoft; idiomas `en-US` y `es-ES`.
- Los bitmaps se regeneran con `python scripts/generate_installer_assets.py` y
  se versionan en `src-tauri/icons/`.

## Firma

- **Updater**: `TAURI_SIGNING_PRIVATE_KEY` y
  `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. Cada bundle produce un `.sig`.
- **Windows Authenticode**: `WINDOWS_CERT_PFX_BASE64` y
  `WINDOWS_CERT_PASSWORD` (certificado self-signed PumaSoft, vigente hasta
  2029-11-21). El workflow importa el PFX en el runner y pasa un `--config`
  con el thumbprint para que Tauri firme **antes** de calcular los `.sig`.
  Sin los secretos el build continúa sin firmar.
- Un certificado self-signed identifica al publisher, pero no elimina
  SmartScreen; solo un certificado de CA pago lo hace.

## latest.json

`scripts/build_latest_json.py` es la única fuente de verdad. Descarga todos los
`.sig` del release y genera las claves de plataforma:

- `windows-x86_64` y `windows-x86_64-msi` (MSI)
- `linux-x86_64-deb` (DEB)
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
- GitHub Actions es obligatorio para el release completo: un build local en
  Windows no produce Linux ni el APK de Android.

## Checklist antes de taggear

1. `bun scripts/bump-version.ts --check --tag vX.Y.Z.FECHA-beta`
2. `bun scripts/check-locales.ts`
3. `bun scripts/probe-sources.ts` (identificadores vivos)
4. `cargo fmt --check`, `cargo clippy`, `cargo test`
5. `bun run --cwd frontend build && bun run --cwd frontend test`
6. `bun run tauri:build` y validación local del instalador
7. Capturas del README actualizadas
8. Confirmación de Felipe; recién entonces commit `[release] ...`, tag y push
