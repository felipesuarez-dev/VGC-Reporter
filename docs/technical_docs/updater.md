# Updater desktop y Android

## Desktop

El updater de escritorio usa `@tauri-apps/plugin-updater`:

1. `check()` consulta el `latest.json` publicado.
2. `downloadAndInstall()` descarga, verifica la firma minisign y ejecuta el instalador.
3. `relaunch()` reinicia la app.

El modal muestra versión actual, versión remota, URL, firma y error exacto en el bloque **Diagnóstico**. El fallback manual abre el MSI/EXE del release.

## Android

Tauri no instala APKs por sí solo. La app usa un plugin local de Android:

- Rust: `android_installer.rs` registra `com.pumasoft.vgcreporter.AndroidInstallerPlugin` y expone el handle móvil.
- Kotlin: `gen/android/.../AndroidInstallerPlugin.kt`.

Flujo:

1. `check_for_app_update` lee `latest.json` y devuelve `android_url`, `android_size`, `android_sha256` y `android_signature`.
2. `download_android_update(request_id, url, size, sha256)` descarga en streaming a `app_cache_dir/updates/vgc-reporter-update.apk.part`.
3. Emite `android-update-progress` con bytes, total, porcentaje y `done`.
4. `cancel_android_update(request_id)` activa el `AtomicBool` de cancelación.
5. Al terminar valida tamaño y SHA-256; solo entonces renombra el `.part` a `.apk`.
6. `install_android_update(path)` valida que el APK esté dentro de la caché de updates.
7. Kotlin comprueba que la firma del APK coincide con la app instalada.
8. Si falta `REQUEST_INSTALL_PACKAGES`/“instalar apps desconocidas”, abre `Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES`.
9. Lanza `Intent.ACTION_VIEW` con `content://` de FileProvider, `FLAG_GRANT_READ_URI_PERMISSION` y `application/vnd.android.package-archive`.

El manifest ya declara `REQUEST_INSTALL_PACKAGES` y el `FileProvider` con `cache-path`.

## latest.json

`scripts/build_latest_json.py` añade al bloque `android`:

```json
{
  "signature": "...",
  "url": "https://...",
  "size": 12345678,
  "sha256": "..."
}
```

`regenerate-latest-json.yml` descarga el APK del release y pasa `--assets-dir` para calcular ambos campos. Un `latest.json` sin `size` o `sha256` hace que la app rechace la descarga Android en vez de instalar un archivo no verificado.

## Tests y validación

- `updater_service` valida versiones y parseo de plataformas.
- `test_build_latest_json.py` valida que el APK adjunto produzca `size` y `sha256` reales.
- Validación manual: desktop 0.5.0 → 0.6.2; Android 0.6.1 → 0.6.2 sobre la versión instalada, incluyendo “instalar apps desconocidas” y arranque posterior.
