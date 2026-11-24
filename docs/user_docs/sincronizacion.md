# Sincronización desktop ↔ Android

Ajustes → **Sincronización** pasa equipos, configuración y preferencias entre dos dispositivos en la **misma red Wi-Fi**. No se sube nada a la nube.

## Enviar

1. Elige qué enviar: equipos individuales, grupos de ajustes (general, pantallas en vivo, ajustes de regulación) y preferencias de UI. Los ajustes se muestran con nombres humanos (“Labmaus · Regulación M-C”), nunca con claves técnicas.
2. Pulsa **Enviar selección**. La app muestra cuántos equipos, ajustes y preferencias se van a transferir.
3. Se crea una sesión de **5 minutos** con un QR y un código de 8 caracteres.
4. En el otro dispositivo, escanea el QR (Android) o escribe el código (desktop).

El QR es un **ticket de emparejamiento**, no tus equipos: solo abre una conexión temporal. Los datos viajan directamente por tu Wi-Fi y la sesión se cierra después de la primera transferencia.

## Recibir

1. Pulsa **Recibir**.
2. En Android, la app pide permiso de cámara antes de abrir el escáner a pantalla completa. Si el permiso está bloqueado, **Abrir Ajustes** te lleva a la pantalla de permisos de Android.
3. En desktop, escribe el **código de 8 caracteres** y pulsa **Conectar**.
4. Si el QR, la cámara o el código no funcionan, abre **Si el QR o el código no funcionan** y pega el ticket o la URL temporal.
5. Antes de importar, elige **qué equipos, ajustes y preferencias de UI** quieres recibir del subconjunto enviado. Lo que no marques no se escribe.

## Estados

La sesión muestra: **Esperando → Conectado → Transfiriendo → Recibido → Importado**, además de **Expirado**, **Cancelado** o **Error**. El contador indica cuánto queda y **Cancelar sesión** cierra el servidor temporal.

## Conflictos

Antes de importar se muestra una vista previa con selección de equipos/ajustes/UI. Si un equipo seleccionado ya existe con el mismo nombre, la app avisa y ofrece:

- **Renombrar** (por defecto): añade la fecha al nombre importado.
- **Reemplazar**: elimina el equipo local con ese nombre y guarda el nuevo.
- **Omitir**: conserva el equipo local y descarta el entrante.

Nunca se sobrescribe nada sin que elijas una de esas opciones.

## Notas

- Los equipos viajan con su modo Showdown/Champions y sus stats convertidos.
- La sesión caduca en 5 minutos y solo sirve una vez.
- La selección de ajustes usa checkboxes del sistema y los interruptores de UI usan el mismo switch que Ajustes; los conflictos se eligen con un control segmentado.
- Si la red bloquea la conexión (Wi-Fi de invitados o aislamiento de clientes), usa una red sin aislamiento o el ticket/URL avanzada.
- El token de la sesión es obligatorio; un código correcto con token incorrecto no entrega datos.
