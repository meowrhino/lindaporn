# lindaporn

Web de **Linda Iriane** (lindaporn.com) reconstruida en HTML, CSS y JavaScript vainilla,
saliendo de WordPress.

Sin framework ni bundler. Para generar el sitio, Node 22 y una dependencia, `sharp`, que
hace las miniaturas y las imágenes para compartir (sin ella se publica igual y avisa).
Sigue la receta del estudio ([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)),
en su versión para un blog: las entradas son ficheros por fecha, no carpetas de proyecto.

| | Antes (WordPress) | Ahora |
|---|---|---|
| CSS | 2,5 MB (tema Podium + WPBakery) | 23 KB |
| JavaScript | jQuery + Revolution Slider + Swiper + 12 plugins | 6 KB propios |
| Dependencias | ~15 plugins, PHP, MySQL | sharp, al generar |
| Alojamiento | hosting con PHP | Cloudflare Workers (static assets) |
| Imágenes | JPG/PNG sin optimizar | WebP (261 imágenes, 26 MB; las miniaturas, del build) |

111 páginas: 8 fijas, 91 entradas de blog, 8 de paginación, 2 categorías, el editor y un 404.

---

## Cómo funciona

```
data/
  site.json          Textos, menú, tarifas, galerías, contacto. Con su esquema en
                     schema/site.json: VS Code autocompleta y subraya lo que está mal,
                     y el build para con el mismo mensaje.
  pages.json         Cookies y Nota legal, con el HTML que tenían en WordPress.
posts/               Una entrada de blog por fichero. Ver abajo.
  blog-escort/         55 entradas
  uncategorized/       36 entradas

build/
  build.mjs          El generador. Lee data/ + posts/ + css/ + js/ y escribe dist/.
  paginas.mjs        Plantillas HTML. Funciones puras: datos → cadena.
  validar.mjs        Leer un JSON diciendo dónde está la coma, y validarlo (de almarbra).
  check.mjs          Revisa dist/: enlaces rotos, fotos que faltan, restos de WordPress.
  escribir.html      La página del editor de /escribir/.
css/  js/            styles.css y main.js (carrusel, menú, galería, cookies, formulario);
                     transicion.css/.js, la transición entre páginas de la casa
                     (JAMstack, patrones §6c); escribir.css/.js, el editor. No forma
                     parte de la web pública: es la herramienta con la que ella escribe.
                     Se publican en assets/, como antes.

assets/
  img/               Las fotos en WebP, una sola versión. Las miniaturas (640 px) y las
                     de compartir (1200×630) las hace el build en .cache/, fuera de git.
  fonts/             Cormorant y Mrs Saint Delafield alojadas aquí.

worker.js            Lo único que corre en servidor: POST /api/contacto.
wrangler.jsonc       Configuración del Worker de Cloudflare.
manus/wordpress/     Lo de traerse la web del WordPress viejo, de una sola vez: los
                     scripts (escriben en content/, que ya no existe) y lo que sacaron.
dist/                La web generada. No se versiona: se construye al publicar.
```

`build/build.mjs` genera cada página con rutas **relativas**, así que la web funciona igual en
`lindaporn.com`, en `meowrhino.github.io/lindaporn/` o abriendo `dist/index.html` desde
el disco. Construida en la Action de GitHub lleva `noindex`: la de verdad es lindaporn.com.

## Comandos

```bash
npm run build    # genera dist/
npm run check    # genera y revisa enlaces rotos e imágenes que falten
npm run serve    # genera y sirve en http://localhost:4321
```

Lo de leer del WordPress viejo (`extract`, `images`, `fonts`) ya se hizo y está en
`manus/wordpress/`.

---

## Tareas del día a día

### Cambiar un texto, un precio o el teléfono

Todo está en [`data/site.json`](data/site.json). Edita, `npm run build`, listo.

### Añadir una foto a una galería

1. La foto en WebP (imgToWeb) en `assets/img/AÑO/MES/nombre.webp`
2. Añade `"AÑO/MES/nombre"` (sin extensión) a `photos` de su galería en `site.json`
3. `npm run build`

### Escribir una entrada nueva

Una entrada es **un fichero**. Se crea dentro de la carpeta de su categoría:

```
posts/blog-escort/2026-09-01_titulo-de-la-entrada.html
```

El nombre del fichero lleva los metadatos: la fecha (`AAAA-MM-DD`) y el slug,
que juntos forman la URL `/2026/09/01/titulo-de-la-entrada/`. La carpeta es la
categoría. Dentro, el primer `<h1>` es el título y el resto es el texto:

```html
<h1>Título de la entrada</h1>

<p>El primer párrafo, que además sale como resumen en el listado.</p>
<p>Y el resto.</p>
```

Nada más. Ni fechas repetidas, ni JSON, ni ids. La miniatura del listado es la
primera imagen que aparezca en el texto; si se quiere otra, se declara arriba
del todo con `<!-- portada: 2018/10/foto -->`.

`npm run build` y la entrada ya está en el blog, en la portada, en el feed RSS
y en el sitemap.

### …o escribirla desde el navegador

En `/escribir/` hay un editor que hace todo eso solo: título, fecha, categoría,
texto con negrita/cursiva/enlaces y fotos. Al darle a Publicar hace **un único
commit** con la entrada y sus imágenes, y el Action reconstruye la web.

Las fotos se convierten a WebP **en el propio navegador** (`canvas.toBlob`), a
1800 px; la miniatura la hace el build. Funciona igual desde el móvil.

No hay servidor detrás. La página habla directamente con la API de GitHub usando
un *fine-grained token* que se guarda en el navegador de quien escribe. La página
está en `noindex`, fuera del sitemap y no se enlaza desde ningún sitio.

Para el token: GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens. Solo este repositorio, permiso **Contents: Read and write**,
y nada más. Con eso solo se puede escribir en el contenido de esta web.

Instrucciones para Linda, en cristiano: [GUIA.md](GUIA.md).

Publica en el repo de `"repo"` en `data/site.json` (el de Linda); construida en la
Action, en el repo de la Action (la nuestra).

---

## Publicación

La web se sirve desde **Cloudflare Workers con static assets**, en la cuenta de
Linda. Un `git push` dispara Workers Builds, que ejecuta `node build/build.mjs` (y `build/check.mjs`) y
despliega `dist/`.

Los ficheros estáticos no pasan por el Worker: sus peticiones son
[gratis e ilimitadas](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/),
sin coste de almacenamiento. El Worker solo se ejecuta para `/api/contacto`.
El plan gratuito admite 20.000 ficheros por versión; la web tiene unos 650.

`.github/workflows/deploy.yml` corre **solo en nuestra copia** (`meowrhino/lindaporn`):
genera, revisa enlaces e imágenes y publica en `meowrhino.github.io/lindaporn/` con
`noindex`. Si falla, abre un issue con el error y lo cierra al volver a publicar; cómo
arreglarlo, en [CLAUDE.md](CLAUDE.md). En la copia de Linda no corre: publica Workers Builds.

### Poner en marcha el Worker

```bash
npx wrangler login
npm run deploy          # genera, comprueba y despliega
```

Y para que se despliegue solo en cada push: en el panel de Cloudflare, el Worker
→ Settings → Builds → Connect, y se elige el repositorio. El nombre del Worker
en el panel tiene que coincidir con `name` en [`wrangler.jsonc`](wrangler.jsonc).

### El formulario de contacto

Lo atiende [`worker.js`](worker.js) en `POST /api/contacto`: valida, descarta
bots por el campo trampa y manda el mensaje por correo con el binding
`send_email` de Email Routing. El `Reply-To` es el visitante, así que se
contesta dándole a responder.

Enviar a una **dirección verificada** en Email Routing
[no consume cuota en ningún plan](https://developers.cloudflare.com/email-service/platform/limits/),
y el formulario solo escribe a Linda. Sale gratis.

Hace falta, una vez:

1. `lindaporn.com` como zona en Cloudflare.
2. Email Routing activado y `lindairianescort@gmail.com` verificada como
   dirección de destino.
3. Que `destination_address` en `wrangler.jsonc` sea esa misma dirección.

Si el Worker no existe todavía, o el envío falla, el formulario **se cae solo al
`mailto:`** de antes: abre el correo del visitante con el mensaje escrito. Nunca
deja de funcionar.

### Puesta en marcha en la cuenta de Linda

Guion paso a paso en [PUESTA-EN-MARCHA.md](PUESTA-EN-MARCHA.md).

Las URLs de las entradas mantienen el formato `/AÑO/MES/DÍA/slug/` del
WordPress, así que los enlaces y el posicionamiento existentes siguen
funcionando.

Cuando esté todo, bajar el WordPress viejo y cambiar la contraseña de
`wp-admin`, que circuló por WhatsApp en texto plano.

---

## En qué se diferencia del original

El criterio es no inventar nada: los textos, las fotos y la estructura son los que
había. Lo único que falta es lo que dependía de PHP o de un servicio ajeno.

- **Formulario de contacto.** El original usaba Contact Form 7, que necesita PHP. Aquí
  el formulario abre el correo del visitante con el mensaje ya escrito (`mailto:`).
  Si se prefiere recibirlos en el buzón sin que se abra nada, la opción más simple es
  [Formspree](https://formspree.io): cambia el `<form>` para que apunte a su endpoint y
  borra la función `formularioContacto` de `js/main.js`.
- **Banderas de idioma.** Eran el widget de GTranslate, que traducía la web con Google
  al vuelo mediante un script externo. Está pendiente de decidir si se recupera.
- **Feed de Instagram del pie y de la barra lateral.** Llevaba tiempo roto en el
  original (mostraba «Instagram no ha devuelto un 200»). Queda el enlace al perfil.
- **Buscador.** El de WordPress necesitaba servidor. Si hace falta, se puede añadir uno
  en cliente con un índice JSON generado en el build.

Y dos correcciones sobre errores que arrastraba el original:

- **El nombre y el botón del carrusel eran blancos sobre fondo blanco**, es decir,
  invisibles en dos de las tres fotos. Ahora cada foto declara en `site.json` si su
  texto va en oscuro o en claro.
- **La página `/nota-legal/` contiene una sola palabra: «Linda».** Se ha dejado tal cual
  porque es lo que había, pero está vacía a efectos prácticos y debería redactarse.
  Lo mismo con `/cookies/`: el texto es el del plugin de WordPress y menciona Google
  Analytics, que esta web ya no usa. Ambas se editan en `data/pages.json`.

### Imágenes que no se pudieron recuperar

Seis archivos están referenciados en entradas del blog pero ya no existen en el servidor
de WordPress (devuelven 404), así que esas entradas se generan sin ellos:

```
2019/01/LindaPornSanchez1313.jpg
2018/12/LindaPornSanchez1261-retok.jpg
2018/11/LindaPornSanchez1304lllps04firma_resizep2OKpC.jpg
2018/11/IMG-20180907-WA0017.jpg
2018/11/4-1.jpg
2018/10/linda-iriane-porn-escort-bikini.jpg
```

Si aparecen en algún backup, se dejan en `.cache/originals/` con esa misma ruta y
`npm run images && npm run build` las recoloca solas.

---

## Licencia

Los textos y las fotografías son propiedad de Linda Iriane. El código del generador es
libre para reutilizar.
