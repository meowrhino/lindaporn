#!/usr/bin/env node
// La REST API devuelve las páginas con los shortcodes de WPBakery sin procesar
// ([vc_row], [vc_column_text]…), así que para las 9 páginas hay que leer el HTML
// ya renderizado del front-end y quedarse solo con el contenido.
// Uso: node tools/scrape-pages.js

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ORIGIN = 'https://lindairiane.com';
const OUT = join(import.meta.dirname, '..', 'content');

const SLUGS = [
  ['', 'home'],
  ['servicios', 'servicios'],
  ['mis-fotos', 'mis-fotos'],
  ['ultimas-fotos', 'ultimas-fotos'],
  ['bdsm', 'bdsm'],
  ['sex-and-art', 'sex-and-art'],
  ['contacto', 'contacto'],
  ['cookies', 'cookies'],
  ['nota-legal', 'nota-legal'],
];

const decode = (s = '') =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&hellip;/g, '…');

// Recorta el <div class="page_content_wrap"> … </div> equilibrando divs.
function mainContent(html) {
  const start = html.search(/<div[^>]*class="[^"]*page_content_wrap/);
  if (start === -1) return html;
  let depth = 0;
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, re.lastIndex);
  }
  return html.slice(start);
}

// Bloques de texto legibles, en orden de aparición.
function textBlocks(html) {
  const out = [];
  const re = /<(h1|h2|h3|h4|h5|h6|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    const text = decode(m[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text && text.length > 1) out.push({ tag, text });
  }
  return out;
}

function images(html) {
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|data-src|data-lazy-src)="([^"]*uploads[^"]*)"/g)) urls.add(m[1]);
  for (const m of html.matchAll(/(?:href)="([^"]*uploads[^"]*\.(?:jpg|jpeg|png|gif|webp))"/gi)) urls.add(m[1]);
  for (const m of html.matchAll(/url\((['"]?)([^)'"]*uploads[^)'"]*)\1\)/g)) urls.add(m[2]);
  return [...urls].map((u) => (u.startsWith('http') ? u : new URL(u, ORIGIN).href));
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const result = [];
  for (const [path, slug] of SLUGS) {
    const res = await fetch(`${ORIGIN}/${path}`, {
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
    });
    const html = await res.text();
    const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || slug).replace(
      / [–|-] Linda Iriane$/,
      '',
    );
    const body = mainContent(html);
    result.push({ slug, title, blocks: textBlocks(body), images: images(body) });
    console.log(`  ${slug}: ${textBlocks(body).length} bloques, ${images(body).length} imágenes`);
  }
  await writeFile(join(OUT, 'pages-scraped.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('\n→ content/pages-scraped.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
