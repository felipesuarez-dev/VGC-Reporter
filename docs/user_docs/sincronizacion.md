# Sincronización desktop ↔ Android

Ajustes → **Sincronizar datos** permite pasar equipos, configuración y preferencias entre dos dispositivos en la **misma red Wi-Fi**. No se sube nada a la nube.

## Enviar

1. Pulsa **Enviar a otro dispositivo**.
2. Se crea una sesión temporal de 2 minutos con un QR, una URL y un código de 8 caracteres.
3. En el otro dispositivo, escanea el QR (Android) o escribe el código.

## Recibir con el código

1. Escribe el código de 8 caracteres que muestra el otro dispositivo y pulsa **Buscar en la red**.
2. La app hace un descubrimiento UDP en la LAN; el emisor responde con su URL temporal.
3. Si la red bloquea el broadcast, pega la URL del QR en el campo de al lado.

## Conflictos

Antes de importar se muestra una vista previa. Si un equipo entrante ya existe con el mismo nombre, la app avisa y ofrece tres salidas:

- **Renombrar** (por defecto): añade la fecha al nombre importado.
- **Reemplazar**: elimina el equipo local con ese nombre y guarda el nuevo.
- **Omitir**: conserva el equipo local y descarta el entrante.

Nunca se sobrescribe nada sin que elijas una de esas opciones.

## Notas

- Los equipos viajan con su modo Clásico/Champions y sus stats convertidos.
- La sesión caduca en 2 minutos y solo sirve una vez.
- Si la red bloquea la conexión (Wi-Fi de invitados o aislamiento de clientes), exporta/importa un archivo o usa una red sin aislamiento.
