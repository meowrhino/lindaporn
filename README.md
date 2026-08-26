# lindaporn

Web de **Linda Iriane** (lindairiane.com) reconstruida en HTML, CSS y JavaScript vainilla,
saliendo de WordPress.

Sin framework, sin bundler, sin `node_modules`. El único requisito para generar el sitio
es Node 20 o superior, y solo porque el generador está escrito en JavaScript.

| | Antes (WordPress) | Ahora |
|---|---|---|
| CSS | 2,5 MB (tema Podium + WPBakery) | 22 KB |
| JavaScript | jQuery + Revolution Slider + Swiper + 12 plugins | 7 KB propios |
| Dependencias | ~15 plugins, PHP, MySQL | ninguna |
| Alojamiento | hosting con PHP | cualquier servidor de ficheros |
| Imágenes | JPG/PNG sin optimizar | WebP (261 imágenes, 32 MB) |

110 páginas: 8 páginas fijas, 91 entradas de blog, 8 páginas de paginación, 2 categorías y un 404.

---

## Cómo funciona

```
content/           Los datos. Es lo que se edita.
  site.json          Textos, menú, tarifas, galerías, contacto.
  posts.json         Las 91 entradas del blog (extraídas del WordPress).
  images.json        Mapa imagen original → WebP local. Lo genera tools/images.js.
  categories.json    Categorías del blog.
  media.json         Metadatos de las imágenes (alt, medidas).
  pages.json         Volcado crudo de las páginas del WP. Solo como referencia.
  pages-scraped.json Texto de las páginas ya renderizadas. Solo como referencia.

src/
  templates.js       Plantillas HTML. Funciones puras: datos → cadena.
  styles.css         Toda la hoja de estilos.
  main.js            Carrusel, menú, galería, avisos y formulario.

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

Añade un objeto al principio de `content/posts.json`:

```json
{
  "id": 99001,
  "slug": "titulo-de-la-entrada",
  "title": "Título de la entrada",
  "date": "2026-09-01T12:00:00",
  "permalink": "/2026/09/01/titulo-de-la-entrada/",
  "categories": [3],
  "excerpt": "Las primeras líneas, que salen en el listado.",
  "html": "<p>El texto, en HTML.</p>",
  "featured": null
}
```

`npm run build` y aparece en el blog, en el feed y en el sitemap.

---

## Publicación

Cada `push` a `main` dispara [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
que genera el sitio, comprueba que no haya enlaces rotos y lo publica en GitHub Pages.

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

Cosas que cambiaron a propósito, todas reversibles:

- **Aviso de mayoría de edad.** No estaba en la web original; se ha añadido porque es
  contenido para adultos. Para quitarlo: borra la función `avisoEdad` de `src/main.js`
  y el bloque `.edad` de `src/templates.js`.
- **Formulario de contacto.** El original usaba Contact Form 7, que necesita PHP. Aquí
  el formulario abre el correo del visitante con el mensaje ya escrito (`mailto:`).
  Si se prefiere recibirlos en el buzón sin que se abra nada, la opción más simple es
  [Formspree](https://formspree.io): cambia el `<form>` para que apunte a su endpoint y
  borra la función `formularioContacto` de `src/main.js`.
- **Banderas de idioma.** Eran el widget de GTranslate, que traducía la web con Google
  al vuelo. Se ha quitado porque metía un script externo. El navegador ya ofrece traducir.
- **Feed de Instagram del pie.** Llevaba tiempo roto en el original (mostraba
  «Instagram no ha devuelto un 200»). Se ha sustituido por un enlace normal al perfil.
- **Buscador.** El de WordPress necesitaba servidor. Se ha quitado. Si hace falta, se
  puede añadir uno en cliente con un índice JSON generado en el build.
- **Cookies.** La web nueva no instala ninguna cookie ni analítica. El aviso solo guarda
  en `localStorage` que ya lo has visto. La página `/cookies/` se ha reescrito para
  reflejarlo, en vez de copiar el texto genérico del plugin.
- **Nota legal.** La página original estaba prácticamente vacía (una palabra). Se ha
  redactado un texto mínimo en `site.json`; conviene que lo revise la clienta.

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
