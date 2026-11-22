# VGC Reporter 0.6.1.20261122-beta

Versión de validación del updater y del calendario oficial de Championship
Series.

## Campeonatos oficiales

- **LAIC, NAIC, EUIC, Regionales, Especiales y Worlds** ahora aparecen tanto en
  **Próximos torneos** como en **Torneos recientes**.
- Cada evento lleva dos badges: **Oficial** (Play! Pokémon) o **Comunidad
  Limitless**, más el nivel del campeonato (**Mundial**, **Internacional**,
  **Regional**, **Especial** o **Local**).
- Los majors son globales: el filtro de país/ciudad sigue aplicando a los
  eventos locales, pero ya no oculta LAIC/NAIC/EUIC/Regionales/Worlds.
- Los eventos multi-día muestran su rango completo (`20–22 nov 2026`) en la
  lista, la ficha y el calendario.
- Un major en curso aparece en **Torneos recientes** el mismo fin de semana en
  que se juega (por ejemplo, LAIC el domingo), sin esperar a que la organización
  lo mueva a completados.

## Premios y resultados

- Si la página oficial de prizing publica efectivo, la app extrae el **monto y
  la divisa** (`$500,000 USD`, etc.) y los muestra en la fila, la ficha, el
  calendario y el `.ics`.
- El campeón Masters y el número de jugadores se leen del endpoint oficial de
  resultados cuando ya están disponibles.
- El botón **Ver resultados** abre la página oficial del campeonato.
- Si no hay premio en efectivo publicado, no se inventa: simplemente no se
  muestra esa fila.

## Calendario y zona horaria

- El calendario expande los majors a **todos los días** de su rango y los
  destaca con borde/punto dorado.
- Los días con campeonato muestran su nombre en el tooltip.
- La hora de los eventos online y locales sigue la **zona horaria configurada**
  en Ajustes; las fechas de solo día (majors) no se desplazan.
- El `.ics` multi-día reserva el rango completo y añade el premio en efectivo a
  la descripción.

## Correcciones

- Se corrigió la ausencia de campeonatos oficiales en los listados de torneos
  pasados y próximos.
- Se normalizaron los rangos de fecha con guion en vez de guion largo/medio.
- Los **Special Championships** se clasifican como Especiales, no como
  Regionales.
- Se corrigió la lectura de sedes nulas (`Seattle`) sin romper el listado.
- El filtro país/ciudad ya no esconde los majors internacionales.

## Documentación

- README ES/EN actualizados con el calendario oficial, badges, premios,
  capturas nuevas y la fuente Championship Series.
- Documentación técnica de adapters, services, domain, commands, data sources,
  pipeline de torneos y componentes.
- Guía de usuario del Panel actualizada.
- Notas de release y checklist de validación.

## Plataformas

- Windows 10/11: MSI x64 (en-US / es-ES), sin firma Authenticode; SmartScreen
  puede advertir.
- Android 7+ (arm64): APK firmado con la llave de release; sideload con
  "Instalar apps desconocidas".

El updater de escritorio y Android se valida contra esta versión.
