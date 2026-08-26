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
const posts = await leer('posts.json');
const categorias = await leer('categories.json');
const imagenes = await leer('images.json');

// '2018/10/foto.jpg', una URL absoluta o una variante -240x359: todo apunta al mismo sitio.
function img(ref) {
  if (!ref) return null;
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

/* ---------------------------------------------------------------
   Páginas
   --------------------------------------------------------------- */

function paginaHome() {
  const ctx = ctxDe('/');
  const h = site.home;
  const recientes = posts.slice(0, 3);

  const slides = site.hero
    .map((s, i) => {
      const foto = img(s.imagen);
      return `<div class="hero__slide" data-activa="${i === 0}" aria-hidden="${i !== 0}">
        ${foto ? `<img class="hero__img" src="${ruta(foto.big, ctx.prefix)}" alt="" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">` : ''}
        <div class="contenedor hero__texto">
          <p class="hero__sub">${esc(s.subtitulo)}</p>
          <h1 class="hero__titulo">${esc(s.titulo)}</h1>
          <p><a class="boton boton--claro" href="${ruta(s.url, ctx.prefix)}">${esc(s.boton)}</a></p>
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
      ${rotulo({ sobre: h.intro.subtitulo, titulo: h.intro.titulo })}
      <div data-aparece>${h.intro.parrafos.map((p) => `<p>${p}</p>`).join('')}</div>
    </div>
  </section>

  <section class="seccion seccion--compacta">
    <div class="contenedor dos-columnas">
      <div data-aparece>
        <p>${h.bio.texto}</p>
        <p style="margin-top:2rem"><a class="boton" href="${ruta(h.bio.boton.url, ctx.prefix)}">${esc(h.bio.boton.texto)}</a></p>
      </div>
      ${retrato ? `<img src="${ruta(retrato.big, ctx.prefix)}" alt="Linda Iriane" loading="lazy" decoding="async" data-aparece>` : ''}
    </div>
  </section>

  <section class="seccion franja-oscura">
    <div class="contenedor dos-columnas dos-columnas--iguales">
      ${h.franjaOscura.map((p) => `<p data-aparece>${p}</p>`).join('')}
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor">
      ${rotulo({ sobre: 'Blog escort', titulo: 'Sex & Art' })}
      <div class="entradas">${recientes.map((p) => tarjetaEntrada(p, ctx, img)).join('')}</div>
      <p style="margin-top:3rem"><a class="boton" href="${ruta('/sex-and-art/', ctx.prefix)}">Ver todas las entradas</a></p>
    </div>
  </section>

  <section class="seccion seccion--compacta">
    <div class="contenedor">
      <p class="cita" data-aparece>${esc(h.cita)}</p>
    </div>
  </section>

  <section class="seccion">
    <div class="contenedor llamadas">
      ${h.llamadas
        .map((c) => {
          const foto = img(c.imagen);
          return `<a class="llamada" href="${ruta(c.url, ctx.prefix)}" data-aparece>
            ${foto ? `<img src="${ruta(foto.big, ctx.prefix)}" alt="" loading="lazy" decoding="async">` : ''}
            <span class="llamada__texto">
              <span class="llamada__sobre">${esc(c.subtitulo)}</span>
              <span style="font-size:2rem;line-height:1.1">${esc(c.titulo)}</span>
            </span>
          </a>`;
        })
        .join('')}
    </div>
  </section>`;

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
      ? `<section class="hero" style="min-height:clamp(20rem,45vh,28rem)">
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
      ${rotulo({ sobre: d.subtitulo, titulo: 'Precios' })}
      ${d.intro ? `<p style="max-width:52rem;margin-bottom:3rem" data-aparece>${esc(d.intro)}</p>` : ''}
      ${bloquesTarifas(d.bloques, ctx)}
      <p style="margin-top:3rem;color:var(--tinta-2)" data-aparece>${esc(d.pie)}</p>
      <p style="margin-top:2rem"><a class="boton" href="${ruta('/contacto/', ctx.prefix)}">Contacta conmigo</a></p>
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
      ${rotulo({ sobre: site.eslogan, titulo: g.titulo, nivel: 1 })}
      ${g.intro ? `<p style="max-width:52rem;margin-bottom:3rem" data-aparece>${esc(g.intro)}</p>` : ''}
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
      ${rotulo({ sobre: p.subtitulo, titulo: p.titulo, nivel: 1 })}
      <div class="contacto-rejilla">
        <div data-aparece>
          ${dato('Teléfono', `<a href="tel:${esc(c.telefonoRaw)}">${esc(c.telefono)}</a>`)}
          ${dato('Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`)}
          ${dato('Horario', `${esc(c.horario)}<br>${esc(c.dias)}`)}
          ${dato('Dónde', c.donde.map(esc).join(',<br>'))}
        </div>

        <form class="formulario" data-email="${esc(c.email)}" data-aparece>
          <p>${esc(p.textoFormulario)}</p>
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

function paginaTexto(clave, url, titulo) {
  const ctx = ctxDe(url);
  const d = site[clave];
  const contenido = `
  <section class="seccion">
    <div class="contenedor articulo">
      ${rotulo({ titulo: d.titulo, nivel: 1 })}
      <div class="articulo__cuerpo">${d.parrafos.map((p) => `<p>${p}</p>`).join('')}</div>
    </div>
  </section>`;
  return { url, html: layout({ site, ctx, contenido, titulo }) };
}

/* --- Blog --- */

function paginasBlog() {
  const salida = [];
  const total = Math.ceil(posts.length / POR_PAGINA);

  for (let n = 1; n <= total; n++) {
    const url = n === 1 ? '/sex-and-art/' : `/sex-and-art/pagina/${n}/`;
    const ctx = ctxDe(url);
    const lote = posts.slice((n - 1) * POR_PAGINA, n * POR_PAGINA);

    const contenido = `
    <section class="seccion">
      <div class="contenedor">
        ${rotulo({ sobre: 'Blog escort', titulo: 'Sex & Art', nivel: 1 })}
        <div class="entradas">${lote.map((p) => tarjetaEntrada(p, ctx, img)).join('')}</div>
        ${paginacion(n, total, '/sex-and-art/', ctx)}
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
  return posts.map((post, i) => {
    const ctx = ctxDe(post.permalink, { tipo: 'article' });
    const anterior = posts[i + 1]; // posts va de más nuevo a más viejo
    const siguiente = posts[i - 1];
    const portada = img(post.featured);

    const nav = `<nav class="entrada-nav">
      ${
        anterior
          ? `<a href="${ruta(anterior.permalink, ctx.prefix)}"><span class="entrada-nav__etiqueta">Anterior</span>${esc(anterior.title)}</a>`
          : '<span></span>'
      }
      ${
        siguiente
          ? `<a href="${ruta(siguiente.permalink, ctx.prefix)}"><span class="entrada-nav__etiqueta">Siguiente</span>${esc(siguiente.title)}</a>`
          : '<span></span>'
      }
    </nav>`;

    const contenido = `
    <article class="seccion">
      <div class="contenedor articulo">
        <header class="articulo__cabecera">
          <p class="entrada__fecha">${fechaLarga(post.date)}</p>
          <h1>${esc(post.title)}</h1>
        </header>
        ${
          portada
            ? `<img src="${ruta(portada.big, ctx.prefix)}" alt="" style="margin-bottom:2.5rem" loading="lazy" decoding="async">`
            : ''
        }
        <div class="articulo__cuerpo">${limpiarHtml(post.html, ctx)}</div>
        ${nav}
      </div>
    </article>`;

    return {
      url: post.permalink,
      html: layout({
        site,
        ctx,
        contenido,
        titulo: post.title,
        descripcion: post.excerpt.slice(0, 160),
        imagen: portada?.big,
      }),
    };
  });
}

function paginasCategorias() {
  return categorias
    .filter((c) => c.count > 0)
    .map((cat) => {
      const url = `/categoria/${cat.slug}/`;
      const ctx = ctxDe(url);
      const lote = posts.filter((p) => p.categories.includes(cat.id));

      const contenido = `
      <section class="seccion">
        <div class="contenedor">
          ${rotulo({ sobre: 'Categoría', titulo: cat.name, nivel: 1 })}
          <div class="entradas">${lote.map((p) => tarjetaEntrada(p, ctx, img)).join('')}</div>
        </div>
      </section>`;

      return {
        url,
        html: layout({ site, ctx, contenido, titulo: cat.name, descripcion: `Entradas en ${cat.name}.` }),
      };
    });
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
    <title>${esc(p.title)}</title>
    <link>${base}${p.permalink}</link>
    <guid isPermaLink="true">${base}${p.permalink}</guid>
    <pubDate>${new Date(p.date).toUTCString()}</pubDate>
    <description>${esc(p.excerpt)}</description>
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
    .filter((u) => !u.endsWith('.html'))
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
    paginaTexto('cookies', '/cookies/', 'Cookies'),
    paginaTexto('notaLegal', '/nota-legal/', 'Nota legal'),
    ...paginasBlog(),
    ...paginasEntradas(),
    ...paginasCategorias(),
    pagina404(),
  ];

  for (const p of paginas) await escribir(p.url, p.html);

  // Estáticos
  await cp(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });
  await cp(join(ROOT, 'src', 'main.js'), join(OUT, 'assets', 'main.js'));

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
  console.log(`  ${posts.length} entradas · ${categorias.length} categorías`);
  console.log(`  peso total: ${(peso / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
