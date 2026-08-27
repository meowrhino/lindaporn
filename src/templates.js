/* Plantillas HTML. Funciones puras: reciben datos, devuelven cadenas.
   `ctx.prefix` es el camino relativo hasta la raíz ('', '../', '../../'…),
   así el sitio funciona igual en un dominio propio, en GitHub Pages
   dentro de un subdirectorio o abierto directamente desde el disco. */

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// '/servicios/' + prefix '../' → '../servicios/'
export function ruta(url, prefix) {
  if (!url) return url;
  if (/^(https?:|mailto:|tel:|#)/.test(url)) return url;
  // En la home el prefijo es '' y '/' se quedaría en href vacío.
  return prefix + url.replace(/^\//, '') || './';
}

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// Se parte la cadena a mano: new Date('2022-02-08') es medianoche UTC y en
// según qué zona horaria mostraría el día anterior.
export function fechaLarga(iso) {
  const [año, mes, dia] = iso.slice(0, 10).split('-');
  return `${Number(dia)} de ${MESES[Number(mes) - 1]} de ${año}`;
}

/* --------------------------------------------------------------- */

function bandas(site, ctx) {
  const social = site.social
    .map((s) => `<a href="${esc(s.url)}" rel="me noopener" target="_blank">${esc(s.nombre)}</a>`)
    .join('');

  return `
      <aside class="banda banda--izq" aria-label="Redes sociales">
        <div class="banda__texto">${social}</div>
      </aside>
      <aside class="banda banda--der" aria-hidden="true">
        <div class="banda__texto">Contacta conmigo · ${esc(site.contacto.telefono)}</div>
      </aside>`;
}

function navegacion(site, ctx) {
  const item = (m) => {
    const activo = m.url === ctx.url ? ' aria-current="page"' : '';
    if (!m.hijos) {
      return `<li class="nav__item"><a class="nav__enlace" href="${ruta(m.url, ctx.prefix)}"${activo}>${esc(m.texto)}</a></li>`;
    }
    const hijos = m.hijos
      .map(
        (h) =>
          `<li><a href="${ruta(h.url, ctx.prefix)}"${h.url === ctx.url ? ' aria-current="page"' : ''}>${esc(h.texto)}</a></li>`,
      )
      .join('');
    return `<li class="nav__item nav__item--desplegable">
              <a class="nav__enlace" href="${ruta(m.url, ctx.prefix)}"${activo}>${esc(m.texto)}</a>
              <ul class="nav__submenu">${hijos}</ul>
            </li>`;
  };

  return `
        <button class="hamburguesa" type="button" aria-expanded="false" aria-controls="nav-principal">
          <span></span><span class="oculto-visual">Menú</span>
        </button>
        <nav class="nav" id="nav-principal" aria-label="Menú principal">
          <ul class="nav__lista">${site.menu.map(item).join('')}</ul>
        </nav>`;
}

function cabecera(site, ctx) {
  return `
    <header class="cabecera">
      <div class="contenedor cabecera__interior">
        <a class="logo" href="${ruta('/', ctx.prefix)}">
          <span class="logo__nombre">${esc(site.titulo)}</span>
          <span class="logo__claim">${esc(site.eslogan)}</span>
        </a>
        ${navegacion(site, ctx)}
      </div>
    </header>
    <p class="telefono-cinta">Teléfono: <a href="tel:${esc(site.contacto.telefonoRaw)}">${esc(site.contacto.telefono)}</a></p>`;
}

function pie(site, ctx) {
  const enlaces = site.menuPie
    .map((m) => `<li><a href="${ruta(m.url, ctx.prefix)}">${esc(m.texto)}</a></li>`)
    .join('');
  const redes = site.social
    .map(
      (s) => `<li><a href="${esc(s.url)}" rel="me noopener" target="_blank">${esc(s.nombre)}</a></li>`,
    )
    .join('');

  return `
    <footer class="pie">
      <div class="contenedor">
        <div class="pie__superior">
          <div>
            <p class="pie__firma">${esc(site.titulo)}</p>
            <p class="pie__titulo" style="margin-top:.75rem">${esc(site.eslogan)}</p>
          </div>
          <div>
            <p class="pie__titulo">Descubre</p>
            <ul class="pie__lista">${enlaces}</ul>
          </div>
          <div>
            <p class="pie__titulo">Sígueme</p>
            <ul class="pie__lista">${redes}</ul>
            <p class="pie__titulo" style="margin-top:1.75rem">Contacto</p>
            <ul class="pie__lista">
              <li><a href="tel:${esc(site.contacto.telefonoRaw)}">${esc(site.contacto.telefono)}</a></li>
              <li><a href="mailto:${esc(site.contacto.email)}">${esc(site.contacto.email)}</a></li>
              <li>${esc(site.contacto.horario)} · ${esc(site.contacto.dias)}</li>
            </ul>
          </div>
        </div>
        <div class="pie__inferior">
          <p>${esc(site.copyright)}</p>
          <p>Solo mayores de 18 años.</p>
        </div>
      </div>
    </footer>`;
}

function avisoCookies(site, ctx) {
  return `
    <div class="cookies-aviso" hidden>
      <p>${esc(site.avisoCookies)} <a href="${ruta('/cookies/', ctx.prefix)}">+ info</a></p>
      <button class="cookies-aviso__aceptar" type="button">Aceptar</button>
    </div>`;
}

/* ---------------------------------------------------------------
   Documento completo
   --------------------------------------------------------------- */
// Google corta el título sobre los 60 caracteres y la descripción sobre los
// 160. Se recortan aquí, en un solo sitio, y no en cada página.
const recortar = (texto, largo) =>
  texto.length > largo ? `${texto.slice(0, largo - 1).trimEnd()}…` : texto;

export function layout({ site, ctx, contenido, titulo, descripcion, imagen }) {
  // Con títulos ya largos, añadir «— Linda Iriane» solo roba sitio.
  const t = !titulo
    ? `${site.titulo} — ${site.eslogan}`
    : recortar(titulo.length > 45 ? titulo : `${titulo} — ${site.titulo}`, 65);
  const d = recortar(descripcion || site.descripcion, 158);
  const canonica = site.url.replace(/\/$/, '') + ctx.url;
  const og = imagen ? site.url.replace(/\/$/, '') + imagen : '';

  return `<!doctype html>
<html lang="${site.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t)}</title>
<meta name="description" content="${esc(d)}">
<link rel="canonical" href="${esc(canonica)}">
<meta name="rating" content="adult">
<meta property="og:type" content="${ctx.tipo || 'website'}">
<meta property="og:site_name" content="${esc(site.titulo)}">
<meta property="og:title" content="${esc(t)}">
<meta property="og:description" content="${esc(d)}">
<meta property="og:url" content="${esc(canonica)}">
${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${ruta(site.faviconUrl, ctx.prefix)}">
<link rel="alternate" type="application/rss+xml" title="${esc(site.titulo)}" href="${ruta('/feed.xml', ctx.prefix)}">
<link rel="preload" as="font" type="font/woff2" href="${ruta('/assets/fonts/cormorant-400-latin.woff2', ctx.prefix)}" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="${ruta('/assets/fonts/mrs-saint-delafield-400-latin.woff2', ctx.prefix)}" crossorigin>
<link rel="stylesheet" href="${ruta('/assets/styles.css', ctx.prefix)}">
</head>
<body>
<a class="saltar" href="#principal">Saltar al contenido</a>
${bandas(site, ctx)}
<div class="marco">
${cabecera(site, ctx)}
<main id="principal">
${contenido}
</main>
${pie(site, ctx)}
</div>
${avisoCookies(site, ctx)}
<script src="${ruta('/assets/main.js', ctx.prefix)}" defer></script>
</body>
</html>
`;
}

/* ---------------------------------------------------------------
   Piezas reutilizables
   --------------------------------------------------------------- */
// El sc_title del tema original ponía el título y debajo el subtítulo
// en versalitas espaciadas. Mismo orden aquí.
export function rotulo({ titulo, subtitulo, nivel = 2 }) {
  return `<div class="rotulo" data-aparece>
    <h${nivel} class="rotulo__titulo">${esc(titulo)}</h${nivel}>
    ${subtitulo ? `<p class="rotulo__sub">${esc(subtitulo)}</p>` : ''}
  </div>`;
}

export function tarjetaEntrada(entrada, ctx, img) {
  const portada = img(entrada.portada);
  const enlace = ruta(entrada.permalink, ctx.prefix);
  return `<article class="entrada-tarjeta" data-aparece>
    ${
      portada
        ? `<a class="entrada-tarjeta__media" href="${enlace}" tabindex="-1" aria-hidden="true">
             <img src="${ruta(portada.thumb, ctx.prefix)}" alt="" loading="lazy" decoding="async">
           </a>`
        : ''
    }
    <p class="entrada-tarjeta__fecha">${fechaLarga(entrada.fecha)}</p>
    <h3 class="entrada-tarjeta__titulo"><a href="${enlace}">${esc(entrada.titulo)}</a></h3>
    <p class="entrada-tarjeta__resumen">${esc(entrada.resumen)}</p>
  </article>`;
}

export function bloquesTarifas(bloques, ctx) {
  const clase = bloques.length >= 3 ? 'tarifas--3' : bloques.length === 2 ? 'tarifas--2' : '';
  return `<div class="tarifas ${clase}">
    ${bloques
      .map(
        (b) => `<section class="tarifa" data-aparece>
      <h2 class="tarifa__nombre">${esc(b.nombre)}</h2>
      <p class="tarifa__unidad">${esc(b.unidad)}</p>
      <ul class="tarifa__lista">
        ${b.tarifas
          .map(
            (t) =>
              `<li class="tarifa__fila"><span>${esc(t.concepto)}</span><span class="tarifa__precio">${esc(t.precio)}</span></li>`,
          )
          .join('')}
      </ul>
    </section>`,
      )
      .join('')}
  </div>`;
}

export function galeria(fotos, ctx, img) {
  const total = fotos.length;
  const items = fotos
    .map((rel, n) => {
      const i = img(rel);
      if (!i) return '';
      // Sin esto un lector de pantalla solo oye «botón» repetido dieciséis veces.
      return `<button class="galeria__item" type="button" data-grande="${ruta(i.big, ctx.prefix)}"
        aria-label="Ampliar la foto ${n + 1} de ${total}">
        <img src="${ruta(i.thumb, ctx.prefix)}" alt="" loading="lazy" decoding="async">
      </button>`;
    })
    .join('');

  return `<div class="galeria">${items}</div>
  <dialog class="visor" aria-label="Visor de fotos">
    <figure class="visor__figura"><img alt=""></figure>
    <button class="visor__boton visor__boton--prev" type="button" aria-label="Anterior">‹</button>
    <button class="visor__boton visor__boton--next" type="button" aria-label="Siguiente">›</button>
    <button class="visor__boton visor__cerrar" type="button" aria-label="Cerrar">×</button>
  </dialog>`;
}

export function paginacion(pagina, total, base, ctx) {
  if (total < 2) return '';
  const url = (n) => (n === 1 ? base : `${base}pagina/${n}/`);
  let salida = '';

  if (pagina > 1) salida += `<a href="${ruta(url(pagina - 1), ctx.prefix)}" rel="prev">‹</a>`;
  for (let n = 1; n <= total; n++) {
    // Primera, última, y una ventana alrededor de la actual.
    if (n !== 1 && n !== total && Math.abs(n - pagina) > 2) {
      if (Math.abs(n - pagina) === 3) salida += `<span aria-hidden="true">…</span>`;
      continue;
    }
    salida +=
      n === pagina
        ? `<span aria-current="page">${n}</span>`
        : `<a href="${ruta(url(n), ctx.prefix)}">${n}</a>`;
  }
  if (pagina < total) salida += `<a href="${ruta(url(pagina + 1), ctx.prefix)}" rel="next">›</a>`;

  return `<nav class="paginacion" aria-label="Paginación">${salida}</nav>`;
}
