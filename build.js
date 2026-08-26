#!/usr/bin/env node
/* Generador estático de lindairiane.com.
   Lee content/*.json + src/ y escribe docs/ (lo que sirve GitHub Pages).
   Sin dependencias: solo Node.
   Uso: node build.js */

import { mkdir, writeFile, readFile, cp, rm, readdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';

import {
  layout,
  ruta,
  esc,
  rotulo,
  fechaLarga,
  tarjetaEntrada,
  bloquesTarifas,
  galeria,
  paginacion,
} from './src/templates.js';

const ROOT = import.meta.dirname;
const OUT = join(ROOT, 'docs');
const POR_PAGINA = 12;

const leer = async (f) => JSON.parse(await readFile(join(ROOT, 'content', f), 'utf8'));

/* --------------------------------------------------------------- */

const site = await leer('site.json');
const paginasWp = await leer('pages.json');
const imagenes = await leer('images.json');

const RECIENTES = 5; // entradas que muestra la barra lateral, como el widget original

/* ---------------------------------------------------------------
   Las entradas del blog
   Un fichero por entrada en content/entradas/<categoria>/<fecha>_<slug>.html:
   la categoría es la carpeta, la fecha y el slug son el nombre, el título es
   el primer <h1> y la miniatura, la primera imagen del texto.
   --------------------------------------------------------------- */
async function leerEntradas() {
  const raiz = join(ROOT, 'content', 'entradas');
  const entradas = [];

  for (const carpeta of await readdir(raiz, { withFileTypes: true })) {
    if (!carpeta.isDirectory()) continue;

    for (const fichero of await readdir(join(raiz, carpeta.name))) {
      if (!fichero.endsWith('.html')) continue;

      const nombre = fichero.match(/^(\d{4})-(\d{2})-(\d{2})_(.+)\.html$/);
      if (!nombre) throw new Error(`Nombre inesperado: ${carpeta.name}/${fichero}. Formato: AAAA-MM-DD_slug.html`);
      const [, año, mes, dia, slug] = nombre;

      let html = await readFile(join(raiz, carpeta.name, fichero), 'utf8');

      const portada = html.match(/^<!--\s*portada:\s*(.+?)\s*-->/m)?.[1] || null;
      const titulo = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]?.trim();
      if (!titulo) throw new Error(`Falta el <h1> con el título en ${carpeta.name}/${fichero}`);

      html = html.replace(/^<!--\s*portada:.*?-->\s*/m, '').replace(/<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');

      entradas.push({
        slug,
        categoria: carpeta.name,
        titulo,
        fecha: `${año}-${mes}-${dia}`,
        permalink: `/${año}/${mes}/${dia}/${slug}/`,
        // Si no se declara portada se usa la primera foto del texto, pero
        // entonces no se repite arriba: solo sirve de miniatura en el listado.
        portada: portada || html.match(/<img[^>]+src="([^"]+)"/i)?.[1] || null,
        portadaPropia: Boolean(portada),
        resumen: resumir(html),
        html: html.trim(),
      });
    }
  }

  return entradas.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.slug.localeCompare(b.slug));
}

function resumir(html, largo = 220) {
  const texto = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return texto.length > largo ? `${texto.slice(0, largo).trimEnd()}…` : texto;
}

const posts = await leerEntradas();

// '2018/10/foto.jpg', una URL absoluta o una variante -240x359: todo apunta al mismo sitio.
// Las fotos nuevas ya vienen en WebP desde el editor y apuntan directamente a
// assets/img/, así que esas no pasan por el mapa de conversión.
function img(ref) {
  if (!ref) return null;

  const yaLocal = ref.match(/(?:^|\/)(assets\/img\/.+?)(\.thumb)?\.webp$/i);
  if (yaLocal) {
    const base = `/${yaLocal[1]}`;
    return { big: `${base}.webp`, thumb: `${base}.thumb.webp` };
  }

  const i = ref.indexOf('/uploads/');
  let rel = i === -1 ? ref : ref.slice(i + '/uploads/'.length);
  rel = decodeURIComponent(rel).replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, '');
  return imagenes[rel] || null;
}

site.faviconUrl = img(site.favicon)?.thumb || '/assets/img/favicon.webp';

// Profundidad de la url → camino relativo hasta la raíz.
const prefijo = (url) => '../'.repeat(url.replace(/^\/|\/$/g, '').split('/').filter(Boolean).length);

const ctxDe = (url, extra = {}) => ({ url, prefix: prefijo(url), ...extra });

/* ---------------------------------------------------------------
   Limpieza del HTML que venía de WordPress
   --------------------------------------------------------------- */
function limpiarHtml(html, ctx) {
  let out = html;

  // Atributos que apuntan al servidor viejo o que ya no sirven.
  out = out.replace(/\s(?:srcset|sizes|data-lazy-srcset|data-lazy-sizes)="[^"]*"/g, '');
  out = out.replace(/\sclass="(?:wp-image-\d+|attachment-[^"]*)"/g, '');

  // Imágenes → WebP local, siempre diferidas.
  out = out.replace(/<img\b([^>]*)>/gi, (etiqueta, attrs) => {
    const src = (attrs.match(/\b(?:data-lazy-src|data-src|src)="([^"]+)"/i) || [])[1];
    const alt = (attrs.match(/\balt="([^"]*)"/i) || [])[1] || '';
    const local = img(src);
    if (!local) return src && !src.includes('/uploads/') ? etiqueta : ''; // imagen perdida: fuera
    return `<img src="${ruta(local.big, ctx.prefix)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  });

  // Enlaces internos absolutos → relativos al sitio nuevo.
  out = out.replace(/href="https?:\/\/(?:www\.)?lindairiane\.com(?:\/wp)?(\/[^"]*)"/gi, (m, path) => {
    const local = img(path);
    if (local) return `href="${ruta(local.big, ctx.prefix)}"`;
    if (path.includes('/wp-content/') || path.includes('/wp-admin/')) return 'href="#"';
    return `href="${ruta(path, ctx.prefix)}"`;
  });

  // Restos: párrafos vacíos, comentarios y bloques de WordPress.
  out = out.replace(/<!--[\s\S]*?-->/g, '');
  out = out.replace(/<p>\s*(?:&nbsp;|\s)*<\/p>/gi, '');
  out = out.replace(/<a[^>]*>\s*<\/a>/gi, '');
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

// Las páginas guardadas en WordPress traen los shortcodes de WPBakery
// ([vc_row], [vc_column_text]…) alrededor del HTML de verdad. Fuera.
function quitarShortcodes(html) {
  return html
    .replace(/\[\/?vc_[^\]]*\]/g, '')
    .replace(/\[\/?(?:rev_slider_vc|trx_sc_\w+)[^\]]*\]/g, '')
    .replace(/<p>\s*<\/p>/g, '');
}

/* ---------------------------------------------------------------
   Páginas
   --------------------------------------------------------------- */

function paginaHome() {
  const ctx = ctxDe('/');
  const h = site.home;
  const recientes = posts.slice(0, 9); // las mismas nueve que traía el carrusel original

  const slides = site.hero
    .map((s, i) => {
      const foto = img(s.imagen);
      const claro = s.texto === 'claro';
      return `<div class="hero__slide" data-activa="${i === 0}" data-texto="${esc(s.texto || 'oscuro')}" aria-hidden="${i !== 0}">
        ${foto ? `<img class="hero__img" src="${ruta(foto.big, ctx.prefix)}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : ''}
        <div class="contenedor hero__texto">
          <h1 class="hero__titulo">${esc(s.titulo)}</h1>
          <p class="hero__nombre">${esc(s.subtitulo)}</p>
          <a class="boton${claro ? ' boton--claro' : ''}" href="${ruta(s.url, ctx.prefix)}">${esc(s.boton)}</a>
        </div>
      </div>`;
    })
    .join('');

  const puntos = site.hero
    .map(
      (s, i) =>
        `<button class="hero__punto" type="button" role="tab" aria-selected="${i === 0}" aria-label="${esc(s.titulo)}"></button>`,
    )
    .join('');

  const retrato = img(h.bio.imagen);

  const contenido = `
  <section class="hero" aria-label="Presentación">
    ${slides}
    <div class="hero__nav" role="tablist">${puntos}</div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      ${rotulo({ titulo: h.intro.titulo, subtitulo: h.intro.subtitulo })}
      <div data-aparece>${h.intro.parrafos.map((p) => `<p>${p}</p>`).join('')}</div>
    </div>
  </section>

  <section class="seccion seccion--compacta">
    <div class="contenedor dos-columnas">
      <div data-aparece>
        <p class="destacado">${h.bio.texto}</p>
        <p style="margin-top:2rem"><a class="boton" href="${ruta(h.bio.boton.url, ctx.prefix)}">${esc(h.bio.boton.texto)}</a></p>
      </div>
      ${retrato ? `<img src="${ruta(retrato.big, ctx.prefix)}" alt="" loading="lazy" decoding="async" data-aparece>` : ''}
    </div>
  </section>

  <section class="seccion franja-oscura">
    <div class="contenedor dos-columnas dos-columnas--iguales">
      ${h.franjaOscura.map((p) => `<p data-aparece>${p}</p>`).join('')}
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      ${rotulo({ titulo: 'Sex & Art', subtitulo: 'Blog Escort' })}
      <div class="entradas entradas--carrusel">${recientes.map((p) => tarjetaEntrada(p, ctx, img)).join('')}</div>
    </div>
  </section>

  <section class="seccion franja-negra">
    <div class="contenedor">
      <p class="destacado" data-aparece>${h.cita}</p>
    </div>
  </section>

  <div class="llamadas">
    ${h.llamadas
      .map((c) => {
        const foto = img(c.imagen);
        return `<section class="llamada${foto ? '' : ' llamada--oscura'}" data-aparece>
          ${foto ? `<img class="llamada__fondo" src="${ruta(foto.big, ctx.prefix)}" alt="" loading="lazy" decoding="async">` : ''}
          ${c.subtitulo ? `<p class="llamada__sub">${esc(c.subtitulo)}</p>` : ''}
          <h3 class="llamada__titulo">${esc(c.titulo)}</h3>
          <a class="boton boton--claro" href="${ruta(c.url, ctx.prefix)}">${esc(c.boton)}</a>
        </section>`;
      })
      .join('')}
  </div>`;

  return {
    url: '/',
    html: layout({
      site,
      ctx,
      contenido,
      descripcion: site.descripcion,
      imagen: img(site.hero[0].imagen)?.big,
    }),
  };
}

function paginaTarifas(clave, url) {
  const ctx = ctxDe(url);
  const d = site[clave];
  const portada = img(d.portada);

  const contenido = `
  ${
    portada
      ? `<section class="hero hero--interior">
      <div class="hero__slide" data-activa="true">
        <img class="hero__img" src="${ruta(portada.big, ctx.prefix)}" alt="" fetchpriority="high" decoding="async">
        <div class="contenedor hero__texto">
          <p class="hero__sub">${esc(d.titulo)}</p>
          <h1 class="hero__titulo">${esc(d.bloques[0].nombre)}</h1>
        </div>
      </div>
    </section>`
      : ''
  }

  <section class="seccion">
    <div class="contenedor">
      ${rotulo({ titulo: d.titulo, subtitulo: d.subtitulo, nivel: 1 })}
      ${d.intro ? `<p class="destacado" style="max-width:52rem;margin-bottom:3rem" data-aparece>${esc(d.intro)}</p>` : ''}
      ${bloquesTarifas(d.bloques, ctx)}
      <p style="margin-top:3rem;color:var(--tinta-2)" data-aparece>${esc(d.pie)}</p>
      <p style="margin-top:2rem"><a class="boton" href="${ruta('/contacto/', ctx.prefix)}">contacta conmigo</a></p>
    </div>
  </section>`;

  const titulo = clave === 'bdsm' ? 'BDSM' : 'Servicios';
  return {
    url,
    html: layout({
      site,
      ctx,
      contenido,
      titulo,
      descripcion: `${titulo} y tarifas de Linda Iriane, escort en Barcelona.`,
      imagen: portada?.big,
    }),
  };
}

function paginaGaleria(clave) {
  const url = `/${clave}/`;
  const ctx = ctxDe(url);
  const g = site.galerias[clave];

  const contenido = `
  <section class="seccion">
    <div class="contenedor">
      ${rotulo({ titulo: g.titulo, subtitulo: site.eslogan, nivel: 1 })}
      ${g.intro ? `<p class="destacado" style="max-width:52rem;margin-bottom:3rem" data-aparece>${esc(g.intro)}</p>` : ''}
      ${galeria(g.fotos, ctx, img)}
    </div>
  </section>`;

  return {
    url,
    html: layout({
      site,
      ctx,
      contenido,
      titulo: g.titulo,
      descripcion: g.intro || `${g.titulo} de Linda Iriane, escort en Barcelona.`,
      imagen: img(g.fotos[0])?.big,
    }),
  };
}

function paginaContacto() {
  const url = '/contacto/';
  const ctx = ctxDe(url);
  const c = site.contacto;
  const p = site.contacto_pagina;

  const dato = (etiqueta, valor) =>
    `<div class="datos__grupo"><p class="datos__etiqueta">${esc(etiqueta)}</p><p class="datos__valor">${valor}</p></div>`;

  const contenido = `
  <section class="seccion">
    <div class="contenedor">
      ${rotulo({ titulo: p.titulo, subtitulo: p.subtitulo, nivel: 1 })}
      <div class="contacto-rejilla">
        <div data-aparece>
          ${dato('Teléfono', `<a href="tel:${esc(c.telefonoRaw)}">${esc(c.telefono)}</a>`)}
          ${dato('Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`)}
          ${dato('Horario', `${esc(c.horario)}<br>${esc(c.dias)}`)}
          ${dato('Dónde', c.donde.map(esc).join(',<br>'))}
        </div>

        <form class="formulario" data-email="${esc(c.email)}" data-endpoint="${ruta(site.endpointContacto, ctx.prefix)}" data-aparece>
          <div class="campo">
            <label for="nombre">Tu nombre</label>
            <input id="nombre" name="nombre" type="text" required autocomplete="name">
          </div>
          <div class="campo">
            <label for="email">Tu email</label>
            <input id="email" name="email" type="email" required autocomplete="email">
          </div>
          <div class="campo">
            <label for="mensaje">Cuéntame…</label>
            <textarea id="mensaje" name="mensaje" required></textarea>
          </div>
          <p class="trampa" aria-hidden="true">
            <label for="web">No rellenes este campo</label>
            <input id="web" name="web" type="text" tabindex="-1" autocomplete="off">
          </p>
          <label class="casilla">
            <input type="checkbox" name="politica" required>
            <span>Acepto la <a href="${ruta('/nota-legal/', ctx.prefix)}">nota legal y la política de privacidad</a>.</span>
          </label>
          <p><button class="boton" type="submit">Enviar mensaje</button></p>
          <p class="formulario__nota">${esc(p.avisoFormulario)}</p>
        </form>
      </div>
    </div>
  </section>`;

  return {
    url,
    html: layout({
      site,
      ctx,
      contenido,
      titulo: 'Contacto',
      descripcion: `Contacta con Linda Iriane: ${c.telefono}, ${c.email}. ${c.horario}, ${c.dias}.`,
    }),
  };
}

// Cookies y Nota legal: el texto que ya había en WordPress, sin retocar.
function paginaWp({ slug, titulo, url }) {
  const ctx = ctxDe(url);
  const pagina = paginasWp.find((p) => p.slug === slug);
  const cuerpo = limpiarHtml(quitarShortcodes(pagina?.html || ''), ctx);

  const contenido = `
  <section class="seccion">
    <div class="contenedor articulo">
      ${cuerpo.includes('<h2') ? '' : rotulo({ titulo, nivel: 1 })}
      <div class="articulo__cuerpo">${cuerpo}</div>
    </div>
  </section>`;
  return { url, html: layout({ site, ctx, contenido, titulo }) };
}

/* --- Blog --- */

// El widget «Entradas Recientes» que llevaba la barra lateral del tema.
function barraLateral(ctx) {
  const items = posts
    .slice(0, RECIENTES)
    .map(
      (p) => `<li>
        <span class="recientes__fecha">${fechaLarga(p.fecha)}</span>
        <a href="${ruta(p.permalink, ctx.prefix)}">${esc(p.titulo)}</a>
      </li>`,
    )
    .join('');

  return `<aside class="lateral">
    <h2 class="lateral__titulo">Entradas recientes</h2>
    <ul class="recientes">${items}</ul>
  </aside>`;
}

function paginasBlog() {
  const salida = [];
  const total = Math.ceil(posts.length / POR_PAGINA);

  for (let n = 1; n <= total; n++) {
    const url = n === 1 ? '/sex-and-art/' : `/sex-and-art/pagina/${n}/`;
    const ctx = ctxDe(url);
    const lote = posts.slice((n - 1) * POR_PAGINA, n * POR_PAGINA);

    const contenido = `
    <section class="seccion">
      <div class="contenedor con-lateral">
        <div>
          ${rotulo({ titulo: 'Sex & Art', subtitulo: 'Blog Escort', nivel: 1 })}
          <div class="entradas">${lote.map((p) => tarjetaEntrada(p, ctx, img)).join('')}</div>
          ${paginacion(n, total, '/sex-and-art/', ctx)}
        </div>
        ${barraLateral(ctx)}
      </div>
    </section>`;

    salida.push({
      url,
      html: layout({
        site,
        ctx,
        contenido,
        titulo: n === 1 ? 'Sex & Art' : `Sex & Art — página ${n}`,
        descripcion: 'Blog de Linda Iriane: arte, sexualidad, literatura libertina y oficio.',
      }),
    });
  }
  return salida;
}

function paginasEntradas() {
  return posts.map((post) => {
    const ctx = ctxDe(post.permalink, { tipo: 'article' });
    const portada = img(post.portada);

    const contenido = `
    <section class="seccion">
      <div class="contenedor con-lateral">
        <article class="articulo">
          <header class="articulo__cabecera">
            <p class="entrada__fecha">${fechaLarga(post.fecha)}</p>
            <h1>${esc(post.titulo)}</h1>
          </header>
          ${
            portada && post.portadaPropia
              ? `<img class="articulo__portada" src="${ruta(portada.big, ctx.prefix)}" alt="" loading="lazy" decoding="async">`
              : ''
          }
          <div class="articulo__cuerpo">${limpiarHtml(post.html, ctx)}</div>
        </article>
        ${barraLateral(ctx)}
      </div>
    </section>`;

    return {
      url: post.permalink,
      html: layout({
        site,
        ctx,
        contenido,
        titulo: post.titulo,
        descripcion: post.resumen,
        imagen: portada?.big,
      }),
    };
  });
}

function paginasCategorias() {
  const slugs = [...new Set(posts.map((p) => p.categoria))];

  return slugs.map((slug) => {
    const nombre = site.categorias[slug] || slug;
    const url = `/categoria/${slug}/`;
    const ctx = ctxDe(url);
    const lote = posts.filter((p) => p.categoria === slug);

    const contenido = `
    <section class="seccion">
      <div class="contenedor con-lateral">
        <div>
          ${rotulo({ titulo: nombre, subtitulo: 'Categoría', nivel: 1 })}
          <div class="entradas">${lote.map((p) => tarjetaEntrada(p, ctx, img)).join('')}</div>
        </div>
        ${barraLateral(ctx)}
      </div>
    </section>`;

    return {
      url,
      html: layout({ site, ctx, contenido, titulo: nombre, descripcion: `Entradas en ${nombre}.` }),
    };
  });
}

// El editor: una página aparte, fuera del sitemap y con noindex. No se enlaza
// desde ningún sitio; Linda entra escribiendo la dirección.
async function paginaEscribir() {
  const opciones = Object.entries(site.categorias)
    .map(([slug, nombre]) => `<option value="${esc(slug)}">${esc(nombre)}</option>`)
    .join('');

  const html = (await readFile(join(ROOT, 'src', 'escribir.html'), 'utf8'))
    .replace('{{repo}}', esc(site.repo))
    .replace('{{rama}}', esc(site.rama))
    .replace('{{web}}', esc(site.url.replace(/\/$/, '')))
    .replace('{{favicon}}', ruta(site.faviconUrl, '../'))
    .replace('{{categorias}}', opciones);

  return { url: '/escribir/', html };
}

function pagina404() {
  const ctx = ctxDe('/404.html');
  ctx.prefix = ''; // 404 se sirve desde cualquier ruta: usamos rutas absolutas
  const contenido = `
  <section class="contenedor error404">
    <p class="error404__numero">404</p>
    <h1>Esta página no existe</h1>
    <p style="margin-top:1rem;color:var(--tinta-2)">Puede que la hayas escrito mal o que ya no esté.</p>
    <p style="margin-top:2rem"><a class="boton" href="/">Volver al inicio</a></p>
  </section>`;
  return { url: '/404.html', html: layout({ site, ctx, contenido, titulo: 'Página no encontrada' }) };
}

/* ---------------------------------------------------------------
   Feed, sitemap, robots
   --------------------------------------------------------------- */

function feed() {
  const base = site.url.replace(/\/$/, '');
  const items = posts
    .slice(0, 30)
    .map(
      (p) => `  <item>
    <title>${esc(p.titulo)}</title>
    <link>${base}${p.permalink}</link>
    <guid isPermaLink="true">${base}${p.permalink}</guid>
    <pubDate>${new Date(`${p.fecha}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${esc(p.resumen)}</description>
  </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>${esc(site.titulo)} — Sex &amp; Art</title>
  <link>${base}/sex-and-art/</link>
  <description>${esc(site.descripcion)}</description>
  <language>${site.idioma}</language>
${items}
</channel></rss>
`;
}

function sitemap(urls) {
  const base = site.url.replace(/\/$/, '');
  const cuerpo = urls
    .filter((u) => !u.endsWith('.html') && u !== '/escribir/')
    .map((u) => `  <url><loc>${base}${u}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${cuerpo}
</urlset>
`;
}

/* ---------------------------------------------------------------
   Escritura
   --------------------------------------------------------------- */

async function escribir(url, html) {
  const destino = url.endsWith('.html')
    ? join(OUT, url.replace(/^\//, ''))
    : join(OUT, url.replace(/^\//, ''), 'index.html');
  await mkdir(dirname(destino), { recursive: true });
  await writeFile(destino, html);
}

async function pesar(dir) {
  let total = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else total += (await stat(p)).size;
    }
  };
  await walk(dir).catch(() => {});
  return total;
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const paginas = [
    paginaHome(),
    paginaTarifas('servicios', '/servicios/'),
    paginaTarifas('bdsm', '/bdsm/'),
    paginaGaleria('ultimas-fotos'),
    paginaGaleria('mis-fotos'),
    paginaContacto(),
    ...site.paginasWp.map(paginaWp),
    ...paginasBlog(),
    ...paginasEntradas(),
    ...paginasCategorias(),
    await paginaEscribir(),
    pagina404(),
  ];

  for (const p of paginas) await escribir(p.url, p.html);

  // Estáticos
  await cp(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
  await cp(join(ROOT, 'src', 'main.js'), join(OUT, 'assets', 'main.js'));
  await cp(join(ROOT, 'src', 'escribir.js'), join(OUT, 'assets', 'escribir.js'));
  await cp(join(ROOT, 'src', 'escribir.css'), join(OUT, 'assets', 'escribir.css'));

  // Las @font-face van dentro de la hoja principal: una petición menos y
  // ninguna ruta absoluta que se rompa al servir el sitio en un subdirectorio.
  const fuentes = await readFile(join(ROOT, 'assets', 'fonts', 'fonts.css'), 'utf8');
  const estilos = await readFile(join(ROOT, 'src', 'styles.css'), 'utf8');
  await writeFile(join(OUT, 'assets', 'styles.css'), `${fuentes}\n${estilos}`);

  await writeFile(join(OUT, 'feed.xml'), feed());
  await writeFile(join(OUT, 'sitemap.xml'), sitemap(paginas.map((p) => p.url)));
  await writeFile(
    join(OUT, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${site.url.replace(/\/$/, '')}/sitemap.xml\n`,
  );
  // GitHub Pages no debe pasar la salida por Jekyll.
  await writeFile(join(OUT, '.nojekyll'), '');

  const peso = await pesar(OUT);
  console.log(`${paginas.length} páginas generadas en docs/`);
  console.log(`  ${posts.length} entradas · ${new Set(posts.map((p) => p.categoria)).size} categorías`);
  console.log(`  peso total: ${(peso / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
