# Frontend — Arquitectura

React 19 + TypeScript + Vite + TailwindCSS sobre Tauri 2.10. El mismo codebase compila para desktop (Windows, macOS, Linux) y Android (API 24+).

## Reglas duras

- **Sin HTTP directo**. Todo I/O vive en Rust. El frontend sólo llama `invoke` vía el wrapper tipado en `lib/ipc.ts`.
- **Tipos generados**. `lib/types.generated.ts` lo produce `ts-rs` desde Rust; nunca editar a mano.
- **Hash router**. `createHashRouter` es obligatorio porque Tauri sirve el bundle desde `file://` en producción.
- **i18n en ambos locales**. Cada clave en `es.json` y `en.json`. Nunca hardcodear strings.
- **Recharts requiere `ResponsiveContainer` con `height` explícito**.
- **Sprites por `<PokemonSprite>`** (setea `data-sprite="true"` para `image-rendering: pixelated`).
- **Links externos** vía `tauri-plugin-opener` (`openUrl`), no `window.open`.

## Estado

- **Server state** → TanStack Query (cache + invalidación). Nunca copiar datos del server a Zustand.
- **Form state** → `useState` o React Hook Form.
- **UI global** → Zustand stores (`stores/`). `uiStore` gestiona colapso del sidebar, tema, font size y flags de opt-out.

## Stack puntual

- `@tauri-apps/api/core` exporta `invoke` (no la ruta v1).
- `@smogon/calc` para Damage Calc — usar `Generations.get(9)`. Importar `Pokemon as CalcPokemon` para evitar choque con el dominio.
- `cmdk` para multiselects con teclado.
- `Intl.DisplayNames` para nombres de país localizados.

## Layout (`src/`)

```
main.tsx              QueryClientProvider + RouterProvider + i18n
router.tsx            hash router
i18n.ts               i18next, persiste idioma en localStorage
locales/{es,en}.json  traducciones
styles.css            tailwind base + clases (card/btn/input/label)
lib/                  ipc, queryKeys, types.generated, helpers
stores/               Zustand
pages/                una por ruta, named export
components/           layout, pokemon, charts, team, tournament, dashboard, filters, info, ui
hooks/                useTranslations, useModalBack, useAutoUpdate, useNavHistorySync
```

## Mobile (Android)

El mismo codebase corre en Android sin bifurcación de rutas. Convenciones:

### Detección de plataforma
`isMobile` se calcula con `window.matchMedia("(max-width: 767px)")` en `AppShell.tsx`. Se pasa como prop o se recalcula localmente. No usar `navigator.userAgent`.

### Layout mobile
- `AppShell` renderiza `<MobileTopbar>` en lugar de `<Titlebar>` cuando `isMobile`.
- El sidebar es `fixed inset-y-0 left-0 z-40` (overlay drawer). Por defecto colapsado; se abre con el hamburguesa y se cierra con la X o tocando el backdrop semitransparente.
- Resize handle del sidebar está oculto en mobile (sólo visible en desktop con `!collapsed && !isMobile`).

### Safe-area insets
Las zonas de la pantalla ocupadas por la barra de estado (top) y la barra de navegación (bottom) del sistema Android requieren padding explícito. Usar `env(safe-area-inset-top)` / `env(safe-area-inset-bottom)` en **inline styles**, no en clases Tailwind, ya que `viewport-fit=cover` sólo activa las variables en estilos inline dentro del WebView de Android. Puntos donde aplica:
- Sidebar header (`paddingTop: isMobile ? "max(env(safe-area-inset-top, 0px), 1rem)" : undefined`)
- Sidebar footer / versión (`paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : undefined`)
- `<main>` del contenido principal (`paddingBottom: isMobile ? "env(safe-area-inset-bottom, 0px)" : undefined`)
- `MobileTopbar` (`paddingTop: "env(safe-area-inset-top, 0px)"`)

### Botón Atrás de Android (`useModalBack`)
`hooks/useModalBack.ts` — hook para todos los modals/cajones. Al abrirse el modal empuja `window.history.pushState({ modal: true }, "")`. El botón Atrás del sistema dispara `popstate` → el hook llama `onClose()`. Si el modal se cierra por otro medio (X, backdrop), el cleanup llama `window.history.back()` para limpiar la entrada fantasma. Sin este hook, Atrás navega detrás del modal o cierra la app.

Usar en todo modal/dialog:
```tsx
useModalBack(Boolean(isOpen), closeCallback);
```

### Features desktop-only
Proteger con `!isMobile` o con `#[cfg(desktop)]` en Rust:
- `UpdaterModal`, `UpdaterErrorBanner` — `tauri-plugin-updater` no existe en Android.
- Bloque "Buscar actualizaciones" en `AboutModal`.
- `useAutoUpdate` se llama como `useAutoUpdate(!isMobile)` — no intenta llamar al plugin en Android.

### Tooltip en pantallas estrechas
`Tooltip.tsx` usa un segundo `useLayoutEffect` para medir el rect real del tooltip después del primer render y desplazar `left` (el centro del tooltip) para que ambos bordes queden a ≥ 8 px del borde de la pantalla. El tooltip sigue centrado sobre el trigger cuando cabe; sólo se desplaza cuando se saldría del viewport.

## Comandos

- `npm run tauri:dev` — dev hot reload desktop.
- `npm run tauri:build` — bundle de producción desktop.
- `npx tauri android dev` — dev hot reload en emulador/dispositivo Android (requiere Android Studio + NDK r25c + `ANDROID_HOME` / `NDK_HOME`).
- `npx tauri android build --apk` — APK de producción.
- `cd frontend && npx tsc --noEmit` — type-check.
