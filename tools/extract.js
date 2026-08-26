#!/usr/bin/env node
// Vuelca el contenido del WordPress original a JSON.
// Se ejecuta una vez (o cada vez que quieras resincronizar): node tools/extract.js
// A partir de aquí, content/ es la fuente de verdad y el WP sobra.

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ORIGIN = 'https://lindairiane.com';
const API = `${ORIGIN}/wp-json/wp/v2`;
const OUT = join(import.meta.dirname, '..', 'content');

const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };

async function getJSON(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return { body: await res.json(), totalPages: Number(res.headers.get('x-wp-totalpages') || 1) };
}

// Recorre todas las páginas de un endpoint paginado.
async function getAll(endpoint, params = '') {
  const out = [];
  let page = 1;
  let totalPages = 1;
  do {
    const url = `${API}/${endpoint}?per_page=100&page=${page}${params}`;
    const { body, totalPages: tp } = await getJSON(url);
    totalPages = tp;
    out.push(...body);
    process.stdout.write(`  ${endpoint}: ${out.length} elementos\r`);
    page++;
  } while (page <= totalPages);
  process.stdout.write(`  ${endpoint}: ${out.length} elementos\n`);
  return out;
}

// Intenta un endpoint opcional (los CPT pueden no estar expuestos en la REST API).
async function tryAll(endpoint) {
  try {
    return await getAll(endpoint);
  } catch (err) {
    console.log(`  ${endpoint}: no disponible (${err.message.split(' —')[0]})`);
    return [];
  }
}

const decode = (s = '') =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&rsquo;/g, '’')
    .replace(/&8211;|&#8211;/g, '–');

// De https://lindairiane.com/2019/01/10/adelitas/ saco "adelitas".
const slugFromLink = (link) => link.replace(/\/$/, '').split('/').pop();

async function main() {
  await mkdir(OUT, { recursive: true });
  console.log(`Extrayendo de ${ORIGIN}\n`);

  const [posts, pages, media, categories, testimonials] = await Promise.all([
    getAll('posts'),
    getAll('pages'),
    getAll('media'),
    getAll('categories'),
    tryAll('cpt_testimonials'),
  ]);

  const mediaById = new Map(media.map((m) => [m.id, m]));

  const normPage = (p) => ({
    id: p.id,
    slug: p.slug || slugFromLink(p.link),
    title: decode(p.title?.rendered || ''),
    permalink: p.link.replace(ORIGIN, '') || `/${p.slug}/`,
    menuOrder: p.menu_order ?? 0,
    html: p.content?.rendered || '',
    featured: p.featured_media ? mediaById.get(p.featured_media)?.source_url || null : null,
  });

  const normMedia = (m) => ({
    id: m.id,
    url: m.source_url,
    mime: m.mime_type,
    alt: decode(m.alt_text || ''),
    title: decode(m.title?.rendered || ''),
    width: m.media_details?.width || null,
    height: m.media_details?.height || null,
  });

  const files = {
    'pages.json': pages.map(normPage).sort((a, b) => a.menuOrder - b.menuOrder),
    'media.json': media.map(normMedia),
  };

  for (const [name, data] of Object.entries(files)) {
    await writeFile(join(OUT, name), JSON.stringify(data, null, 2) + '\n');
    console.log(`  → content/${name} (${data.length})`);
  }

  // Cada entrada, a su propio fichero: content/entradas/<categoria>/<fecha>_<slug>.html
  const slugCategoria = new Map(categories.map((c) => [c.id, c.slug]));
  for (const p of posts) {
    const categoria = slugCategoria.get(p.categories?.[0]) || 'uncategorized';
    const slug = p.slug || slugFromLink(p.link);
    const html = p.content?.rendered || '';
    const destacada = p.featured_media ? mediaById.get(p.featured_media)?.source_url : null;

    // La miniatura sale de la primera imagen del texto; solo si la destacada
    // no aparece en él hace falta declararla arriba.
    const rel = destacada?.split('/uploads/')[1];
    const cabecera = rel && !html.includes(rel) ? `<!-- portada: ${rel} -->\n` : '';

    const carpeta = join(OUT, 'entradas', categoria);
    await mkdir(carpeta, { recursive: true });
    await writeFile(
      join(carpeta, `${p.date.slice(0, 10)}_${slug}.html`),
      `${cabecera}<h1>${decode(p.title?.rendered || slug)}</h1>\n\n${html.trim()}\n`,
    );
  }
  console.log(`  → content/entradas/ (${posts.length} ficheros)`);

  if (testimonials.length) console.log(`  ${testimonials.length} testimonios sin usar`);
  console.log('\nListo.');
}

main().catch((err) => {
  console.error('Fallo la extracción:', err.message);
  process.exit(1);
});
