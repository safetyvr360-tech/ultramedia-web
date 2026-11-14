# Web nueva de Ultramedia

Rebranding de ultramedia.com.co con el contenido de Ultramedia (Tech y Drones) y de Estudio FBX, más la línea
nueva de drones industriales (termografía, de dronesbaq.com) y el enlace a SkyDeck para obras. El asistente es el
mismo chat de Neural Frames, adaptado a Ultramedia y puesto como sección dentro de la página.

## Archivos

- `index.html`: la página (una sola, con anclas: servicios, proyectos, drones, skydeck, inmobiliarias, método, equipo, asistente).
- `asistente.js` y `asistente.css`: el chat. Sin servidor responde con los datos guardados en el propio archivo.
- `chat.php`: conecta el chat con Claude (Anthropic). Sin clave, el chat sigue funcionando con las respuestas guardadas.
- `privacidad.html`, `creditos.html`, `favicon.svg`.
- `assets/`: el sistema de diseño, las fotos en WebP (`assets/img`) y los scripts de movimiento.
- `src-img/`: las imágenes originales descargadas. No hace falta subirla.

## Publicar

1. Subir todo menos `src-img/`, `shots/` y `.taste-skill/` a la carpeta pública del hosting (el WordPress actual
   se puede dejar en una subcarpeta o reemplazar).
2. Para que el chat use IA: poner la clave de Anthropic en la variable de entorno `ANTHROPIC_API_KEY` del hosting,
   o en un archivo `anthropic.key` una carpeta ARRIBA de la carpeta pública. Nunca dentro de la carpeta pública.
3. Activar la línea `<link rel="canonical" ...>` del `<head>` cuando el dominio esté confirmado.

## Pendientes

- **WhatsApp**: todos los botones y el chat usan el de Jason (+57 300 624 2963). Para
  cambiarlo, editar `WA_NUMBER` al inicio de `asistente.js` (cambia todos los botones) y el número en los `href`
  de `index.html` que tienen `data-wa` (para quien navega sin JavaScript).
- **Fotos de drones**: las tres fotos de drones son de Wikimedia Commons, de reemplazo. Cambiarlas por fotos
  propias de DronesBaq: un parque solar o techo con termografía, una subestación o planta, y el drone en vuelo
  sobre una obra.
- **Logo**: la página usa el nombre con una marca circular magenta. Si hay un logo nuevo en SVG, va en el `nav__logo`
  y en el pie.
- **Correo**: el pie y la política usan jasonca95@gmail.com, el que tenía la web. Conviene un correo del dominio.
- **share.jpg**: la imagen para compartir en redes es una captura del inicio.

## Pruebas

`node pruebas/run.mjs` corre 17 pruebas: archivos e imágenes que existen, anclas, WhatsApp, datos para Google,
etiquetas de cada página, textos alternativos, carga diferida de imágenes, restos de plantilla, sintaxis del chat,
seguridad de `chat.php`, respuestas del chat sin servidor, archivos de SEO, y los chequeos de textos, diseño en
cinco tamaños de pantalla y rendimiento. `--rapido` corre solo las 14 primeras (sin navegador).

`node pruebas/navegador.mjs` (con la página servida en http://127.0.0.1:5310/) corre 8 pruebas en Chrome real y en
13 tamaños de pantalla, incluidas pantallas bajas y celulares acostados: que ninguna sección se monte sobre la
siguiente, sin scroll lateral, título del inicio dentro de su foto, ningún texto menor de 13 px, la fuente cargada,
el chat (con un servidor lento simulado), los menús y la consola sin errores.
