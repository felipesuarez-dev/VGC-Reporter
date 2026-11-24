# Ajustes

Ajustes reúne las preferencias de la app. Todas las secciones y subsecciones
son **colapsables**; la barra superior permite **Expandir todo** / **Contraer
todo** y el estado se recuerda entre sesiones.

## Grupos

- **General**: idioma, tamaño de fuente, zona horaria y país local. El país local preselecciona los filtros de país de próximos torneos, calendario, torneos recientes, Top Equipos y detalles.
- **Widgets y navegación**: widgets flotantes, calendario, tablas rápidas y
  navegación mobile.
- **Directos y pantallas**: reproducción al cambiar de página y lista editable de
  pantallas de YouTube (máximo 12).
- **Datos y fuentes**: formato/regulación preferida, sincronización del catálogo,
  auto-seguir la regulación activa y overrides avanzados por fuente.
- **Sincronización**: QR/código, envío y recepción selectiva.
- **Avanzado**: enlaces externos, diagnóstico, logs y disclaimer.

**Otras fuentes** incluye Labmaus, Pikalytics, PokéBase, Pokémon Zone, PokéData,
Porygon Labs, Champions Lab y Limitless. Debajo de la lista aparece el aviso
legal: son sitios externos no afiliados, patrocinados ni respaldados por The
Pokémon Company International, Nintendo, Creatures Inc. ni GAME FREAK Inc.

## Widgets flotantes

- **Agrupar widgets flotantes** está activo por defecto. Las tablas, el
  calendario y la flecha de volver arriba comparten un **único rail vertical**
  con el mismo tamaño, borde y separador.
- El botón de **3 puntos** despliega los widgets con animación y se transforma en
  **X**; al cerrarlo bajan y se desvanecen.
- **Esquina del rail**: abajo a la derecha (por defecto) o abajo a la izquierda.
- En mobile el rail se coloca **por encima del dock de navegación** para que
  ambos convivan sin taparse.
- Desactivar la agrupación muestra cada widget en su propio botón, sin cambiar
  el rail ni la flecha.

## Calendario

- **Anclado en barra de título**: el botón del calendario aparece en el titlebar
  de escritorio y abre el panel desde ahí.
- **Widget flotante**: se une al rail de widgets; no tiene esquina ni posición
  independiente.

## Tablas rápidas

- **Anclado en barra de título**: muestra el botón de Tablas en el titlebar; el
  atajo sigue disponible.
- **Widget flotante** (por defecto): las tablas se unen al rail de widgets.
- **Pestaña inicial**: Tipos o Naturalezas.
- **Atajo de teclado**: haz clic en el grabador y pulsa la combinación. `Ctrl+T`
  abre y cierra; `Esc` cancela y `Retroceso` restaura `Ctrl+T`.
- El modo **Pantalla grande / Landscape** amplía las celdas para uso táctil.

## Navegación mobile

- **Activar navegación flotante**: activo por defecto en la app Android. Sustituye los
  botones de atrás/adelante/lupa del topbar; el topbar conserva menú, título,
  tema e idioma. En escritorio no se monta.
- **Posición**: fija abajo centrada (por defecto) o libre arrastrable con el
  asa de la derecha. No hay opción de esquina.
- **Restablecer posición**: devuelve el dock libre al centro inferior.
- El dock incluye historial, búsqueda y la hoja de **vistas abiertas** con
  accesos a todas las secciones. En escritorio no se muestra.

## Reproducción

- **Reproducción al cambiar de página**: **Detener el video** cierra el directo
  al salir de Novedades dentro de la misma pestaña; **Mini-reproductor en la
  esquina** (por defecto) lo mantiene visible mientras navegas. La elección se
  guarda y se aplica a cada pestaña.
- Cada pestaña conserva sus propios reproductores: un directo encendido en una
  pestaña no se reutiliza en otra. Al cerrar la pestaña se cierran sus videos.
- Puedes encender varios tiles en la misma pestaña; cada uno tiene su propio
  reproductor, su botón **Detener** y su mini si sales de la página.
- El mini se coloca a la izquierda del rail de widgets (encima del dock en
  mobile) y permite cerrar el video o abrirlo en YouTube.
- Los reproductores se cargan de forma diferida y muestran un spinner grande;
  así entrar a Novedades no bloquea la interfaz.

## Coherencia visual

Ajustes usa un solo lenguaje de controles en toda la app:

- **Switch** para preferencias on/off.
- **Control segmentado** para elegir entre opciones excluyentes (posición,
  pestaña inicial, reproducción, conflictos de sync).
- **Checkbox** solo para listas de selección múltiple o confirmaciones.
- **Select** de 36 px para listas largas.

Los ajustes que se comparten por sincronización muestran nombres humanos
(“Labmaus · Regulación M-C”), nunca claves técnicas. El slider de tamaño de
fuente tiene pista de progreso y anillo de contraste en todos los temas. Dentro
de cada card, una línea fina separa las opciones; no se dibuja sobre acciones
como “Abrir tablas rápidas”.

## Sincronización

El emisor elige equipos, grupos de ajustes y preferencias de UI antes de crear
la sesión. El receptor elige qué importar del subconjunto recibido. Los
conflictos de nombre se resuelven solo sobre los equipos marcados.
