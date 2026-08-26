# lindaporn

Web de **Linda Iriane** (lindairiane.com) reconstruida en HTML, CSS y JavaScript vainilla,
saliendo de WordPress.

Sin framework, sin bundler, sin `node_modules`. El único requisito para generar el sitio
es Node 20 o superior, y solo porque el generador está escrito en JavaScript.

| | Antes (WordPress) | Ahora |
|---|---|---|
| CSS | 2,5 MB (tema Podium + WPBakery) | 23 KB |
| JavaScript | jQuery + Revolution Slider + Swiper + 12 plugins | 6 KB propios |
| Dependencias | ~15 plugins, PHP, MySQL | ninguna |
| Alojamiento | hosting con PHP | cualquier servidor de ficheros |
| Imágenes | JPG/PNG sin optimizar | WebP (261 imágenes, 32 MB) |

110 páginas: 8 páginas fijas, 91 entradas de blog, 8 páginas de paginación, 2 categorías y un 404.

---

## Cómo funciona

```
content/           Los datos. Es lo que se edita.
  site.json          Textos, menú, tarifas, galerías, contacto.
  entradas/          Una entrada de blog por fichero. Ver abajo.
    blog-escort/       55 entradas
    uncategorized/     36 entradas
  images.json        Mapa imagen original → WebP local. Lo genera tools/images.js.
  media.json         Metadatos de las imágenes (alt, medidas).
  pages.json         Las páginas tal como estaban en WordPress. De aquí salen
                     Cookies y Nota legal, sin retocar.
  pages-scraped.json Texto de las páginas ya renderizadas. Solo como referencia.

src/
  templates.js       Plantillas HTML. Funciones puras: datos → cadena.
  styles.css         Toda la hoja de estilos.
  main.js            Carrusel, menú, galería, aviso de cookies y formulario.
  escribir.html/.js/.css   El editor de /escribir/. No forma parte de la web
                     pública: es la herramienta con la que ella escribe.

assets/
  img/               Las imágenes en WebP (versión grande + miniatura).
  fonts/             Cormorant y Mrs Saint Delafield alojadas aquí.

tools/               Scripts de una sola vez, para traerse cosas del WordPress.
build.js             El generador. Lee content/ + src/ y escribe docs/.
docs/                La web generada. No se versiona: la construye GitHub Actions.
```

`build.js` no depende de nada externo. Cada página se genera con rutas **relativas**,
así que la web funciona igual en `lindairiane.com`, en `usuario.github.io/lindaporn/`
o abriendo `docs/index.html` a pelo desde el disco.

## Comandos

```bash
npm run build    # genera docs/
npm run check    # genera y revisa enlaces rotos e imágenes que falten
npm run serve    # genera y sirve en http://localhost:4321
```

Y los que solo hacen falta si hay que volver a leer del WordPress viejo:

```bash
npm run extract  # vuelca posts y páginas desde /wp-json a content/
npm run images   # descarga las imágenes y las convierte a WebP (necesita: brew install webp)
npm run fonts    # vuelve a bajar las tipografías de Google Fonts
```

---

## Tareas del día a día

### Cambiar un texto, un precio o el teléfono

Todo está en [`content/site.json`](content/site.json). Edita, `npm run build`, listo.

### Añadir una foto a una galería

1. Deja el archivo en `.cache/originals/AÑO/MES/nombre.jpg`
2. `npm run images`
3. Añade `"AÑO/MES/nombre.jpg"` a la lista de `galerias` en `site.json`
4. `npm run build`

### Escribir una entrada nueva

Una entrada es **un fichero**. Se crea dentro de la carpeta de su categoría:

```
content/entradas/blog-escort/2026-09-01_titulo-de-la-entrada.html
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
del todo con `<!-- portada: 2018/10/foto.jpg -->`.

`npm run build` y la entrada ya está en el blog, en la portada, en el feed RSS
y en el sitemap.

### …o escribirla desde el navegador

En `/escribir/` hay un editor que hace todo eso solo: título, fecha, categoría,
texto con negrita/cursiva/enlaces y fotos. Al darle a Publicar hace **un único
commit** con la entrada y sus imágenes, y el Action reconstruye la web.

Las fotos se convierten a WebP **en el propio navegador** (`canvas.toBlob`), en
las dos medidas que usa el sitio (1800 px y 640 px de miniatura). No hace falta
`cwebp` ni pasar por `npm run images`: funciona igual desde el móvil.

No hay servidor detrás. La página habla directamente con la API de GitHub usando
un *fine-grained token* que se guarda en el navegador de quien escribe. La página
está en `noindex`, fuera del sitemap y no se enlaza desde ningún sitio.

Para el token: GitHub → Settings → Developer settings → Personal access tokens →
Fine-grained tokens. Solo este repositorio, permiso **Contents: Read and write**,
y nada más. Con eso solo se puede escribir en el contenido de esta web.

Instrucciones para la clienta, en cristiano: [PARA-LINDA.md](PARA-LINDA.md).

Si el repositorio cambia de cuenta, se toca **una línea**: `"repo"` en
`content/site.json`.

---

## Publicación

Cada `push` a `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
que genera el sitio, comprueba que no haya enlaces rotos y lo publica en GitHub Pages.

### Traspasar el proyecto a la cuenta de la clienta

Todo está pensado para que el traspaso sea de una tarde:

1. Ella se crea cuenta de GitHub.
2. Settings → *Transfer ownership* del repositorio. Se lleva el historial, las
   issues y las Actions; los enlaces viejos redirigen solos.
3. En su cuenta: Settings → Pages → Source: **GitHub Actions**.
4. Cambiar `"repo"` en `content/site.json` a `sunombre/lindaporn`.
5. Ella se crea el fine-grained token (Contents: Read and write, solo este repo)
   y lo pega una vez en `/escribir/`.

No hay servidores, ni dominios de terceros, ni servicios de pago que traspasar:
el proyecto entero es este repositorio.

### Para poner el dominio propio

1. En `content/site.json`, deja `"url": "https://lindairiane.com"` (ya está así).
   Solo se usa para las URLs canónicas, el sitemap y el feed.
2. Crea un fichero `assets/CNAME` con una línea: `lindairiane.com`
3. En los DNS del dominio, apunta a GitHub Pages:
   - `A` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` para `www` → `meowrhino.github.io`
4. En Settings → Pages del repo, escribe el dominio y marca *Enforce HTTPS*.

Las URLs de las entradas mantienen el formato `/AÑO/MES/DÍA/slug/` del WordPress,
así que los enlaces y el posicionamiento existentes siguen funcionando.

---

## En qué se diferencia del original

El criterio es no inventar nada: los textos, las fotos y la estructura son los que
había. Lo único que falta es lo que dependía de PHP o de un servicio ajeno.

- **Formulario de contacto.** El original usaba Contact Form 7, que necesita PHP. Aquí
  el formulario abre el correo del visitante con el mensaje ya escrito (`mailto:`).
  Si se prefiere recibirlos en el buzón sin que se abra nada, la opción más simple es
  [Formspree](https://formspree.io): cambia el `<form>` para que apunte a su endpoint y
  borra la función `formularioContacto` de `src/main.js`.
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
  Analytics, que esta web ya no usa. Ambas se editan en `content/pages.json`.

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
