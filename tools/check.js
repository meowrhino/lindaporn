#!/usr/bin/env node
// Revisa la salida de docs/: enlaces rotos, imágenes que faltan y restos
// de WordPress. Uso: node tools/check.js

import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'docs');

async function htmls(dir, acc = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await htmls(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const problemas = [];
const aviso = (archivo, msg) => problemas.push(`${relative(OUT, archivo)}: ${msg}`);

const ficheros = await htmls(OUT);
let enlaces = 0;
let imagenes = 0;

for (const archivo of ficheros) {
  const html = await readFile(archivo, 'utf8');
  const base = dirname(archivo);

  // Restos del sitio viejo
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?lindairiane\.com[^"'\s<]*/g)) {
    const url = m[0];
    // Las urls canónicas y og: sí deben apuntar al dominio final.
    const contexto = html.slice(Math.max(0, m.index - 90), m.index);
    if (/(canonical|og:url|og:image|<loc>|<link>|<guid)/.test(contexto)) continue;
    aviso(archivo, `enlace al WordPress viejo → ${url}`);
  }
  if (/\[vc_|\[rev_slider|wp-content|wpcf7/.test(html)) {
    aviso(archivo, 'quedan shortcodes o rutas de WordPress');
  }

  // Enlaces y recursos locales
  const refs = [
    ...html.matchAll(/(?:href|src)="([^"]+)"/g),
    ...html.matchAll(/data-grande="([^"]+)"/g),
  ];
  for (const [, url] of refs) {
    if (/^(https?:|mailto:|tel:|#|data:)/.test(url) || url === '') continue;
    const limpio = url.split(/[?#]/)[0];
    // 404.html se sirve desde cualquier profundidad, así que usa rutas absolutas.
    const destino = limpio.startsWith('/') ? join(OUT, limpio) : resolve(base, limpio);
    const candidato = limpio.endsWith('/') || !limpio.includes('.') ? join(destino, 'index.html') : destino;
    if (/\.(webp|jpe?g|png|gif|woff2?)$/i.test(limpio)) imagenes++;
    else enlaces++;
    if (!existsSync(candidato)) aviso(archivo, `roto → ${url}`);
  }
}

// Peso del HTML frente a los 2,5 MB de CSS que traía el tema
let pesoHtml = 0;
for (const f of ficheros) pesoHtml += (await stat(f)).size;

console.log(`${ficheros.length} páginas · ${enlaces} enlaces · ${imagenes} recursos`);
console.log(`HTML total: ${(pesoHtml / 1024).toFixed(0)} KB`);

if (problemas.length) {
  console.log(`\n${problemas.length} problemas:`);
  const unicos = [...new Set(problemas)];
  unicos.slice(0, 40).forEach((p) => console.log(`  ${p}`));
  if (unicos.length > 40) console.log(`  … y ${unicos.length - 40} más`);
  process.exit(1);
}
console.log('\nSin enlaces rotos ni restos de WordPress.');
