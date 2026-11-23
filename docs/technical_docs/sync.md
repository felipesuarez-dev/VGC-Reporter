# Sincronización LAN

## Objetivo

Transferir equipos, ajustes y preferencias de UI entre desktop y Android en la misma Wi-Fi sin nube. El QR es un **ticket de emparejamiento**, no el payload: los datos viajan por HTTP temporal entre los dos dispositivos.

## Ticket

```
vgcreporter://sync?v=1&code=AB23CD45&token=<32 hex>&host=192.168.1.20&port=51234
```

- `code`: 8 caracteres del alfabeto `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `I`, `O`, `0`, `1`).
- `token`: 128 bits aleatorios de `OsRng`, 32 caracteres hex.
- `version`: versión del formato de ticket; se valida antes de cualquier request.
- `host`/`port`: servidor temporal del emisor.
- El parser de Rust (`services/sync_service.rs`) y el de TypeScript (`lib/sync.ts`) aplican las mismas reglas.

## Sesión

- Duración: 300 segundos.
- Un solo uso: tras la primera respuesta correcta el servidor se cierra.
- Token obligatorio: token ausente o incorrecto responde `403`.
- Sesión usada: `409`; expirada: `410`; ruta desconocida: `404`.
- Payload máximo: 8 MiB (`SYNC_MAX_PAYLOAD_BYTES`).
- El bundle declara `schema`; un schema distinto se rechaza antes de importar.
- El descubrimiento UDP (`VGCREP1 FIND <code>`) devuelve la URL HTTP del emisor. Es un fallback; el QR sigue siendo el flujo principal.

## Estados

`waiting → connected → transferring → received → imported`

Estados terminales adicionales: `expired`, `cancelled`, `error`.

`SyncManager` guarda las sesiones en memoria, expone `sync_session_status`/`sync_cancel` y emite `sync-state` a la webview. El comando `sync_import` acepta el `code` opcional para marcar la sesión como importada en el emisor.

## Comandos

| Comando | Uso |
|---|---|
| `sync_start_send(ui_json)` | Crea la sesión y devuelve `SyncSession` con ticket, URL y contadores. |
| `sync_session_status(code)` | Estado actual y expiración. |
| `sync_cancel(code)` | Cierra la sesión temporal. |
| `sync_fetch(ticket)` | Acepta ticket versionado o URL HTTP legacy. |
| `sync_fetch_by_code(code)` | Descubre la URL por UDP y descarga. |
| `sync_import(bundle, code?)` | Valida y guarda equipos/ajustes; marca la sesión. |

## UI Android

Antes de `scan()`:

1. `checkPermissions()`.
2. Si el estado es `prompt`, `requestPermissions()`.
3. Solo con `granted` se abre `scan({ windowed: false, formats: [QRCode] })`.
4. Si el permiso quedó denegado/bloqueado, el botón **Abrir Ajustes** llama `openAppSettings()` del plugin de cámara.

El código manual y el ticket/URL avanzada quedan siempre visibles como fallback.

## Tests

- Rust: alfabeto, token 128 bits, ticket round-trip, versión/host/puerto inválidos, límite de payload, schema.
- Integración loopback: servidor temporal + `reqwest`, token incorrecto 403, primera descarga 200, segunda no entrega payload.
- Frontend: parser de ticket, normalización de código, conflictos y orden de estados.
- Hardware: escaneo real, QR vencido, código incorrecto, permiso bloqueado y transferencia en ambos sentidos.
