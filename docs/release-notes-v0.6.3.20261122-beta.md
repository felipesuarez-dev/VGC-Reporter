# VGC Reporter 0.6.3.20261122-beta

Parche de experiencia de **Novedades** sobre 0.6.2.

## Cambios

- **Últimas transmisiones** ahora es un bloque colapsable dentro de **En vivo**, con chevron, contador de estado y el mismo patrón visual que los paneles del Panel Principal.
- Orden por defecto de **Novedades**: resumen de regulación → **En vivo** → **Noticias oficiales** → **Torneos recientes** → **Próximos/Calendario/Tablas**.
- **Torneos recientes** queda por encima de **Próximos torneos**.
- **Noticias oficiales** queda directamente debajo de los videos en vivo.
- Los layouts guardados con el orden anterior se migran una sola vez; los layouts personalizados no se tocan. **Restablecer diseño** aplica el orden nuevo.

## Base 0.6.2

Incluye todo lo publicado en [0.6.2.20261122-beta](https://github.com/felipesuarez-dev/VGC-Reporter/releases/tag/v0.6.2.20261122-beta): Sync/QR, updater Android interno, torneos oficiales con modal, calendario, tablas rápidas, treemap, Aprender 2.0 y la validación del updater de escritorio 0.6.1 → 0.6.2.

## Plataformas

- Windows 10/11: MSI x64 (en-US / es-ES).
- Android 7+ (arm64): APK firmado, updater interno y sideload.

## Artefactos y hashes

| Archivo | SHA-256 |
|---|---|
| `VGC.Reporter_0.6.3_x64_en-US.msi` | `343ADA1746F6BA24CFA245A0D751445CFC4D30857299E1040FDF7C393C97463D` |
| `VGC.Reporter_0.6.3_x64_es-ES.msi` | `A5C916BC54E8E1495A857965744D7BB311514FDFB7389F23F6D5E3E0E0896AE6` |
| `VGC.Reporter_v0.6.3.20261122-beta_android.apk` | `EE0EC54750A10BE041F9615C28A3D212C1E6B19923167239052F42D617772BBB` |

La app release se abrió y validó localmente antes de publicar. El updater de escritorio 0.6.2 → 0.6.3 se probó contra este release: detectó la versión, descargó el MSI, instaló (con el UAC de Windows) y relanzó en 0.6.3. El APK también se probó en un móvil Android. El salto 0.5.0 → 0.6.3 queda pendiente en una instalación administrada.
