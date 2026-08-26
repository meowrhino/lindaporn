#!/usr/bin/env node
// Descarga todas las imágenes referenciadas por el contenido y las convierte a WebP.
// Requiere cwebp (brew install webp).
// Uso: node tools/images.js

import { mkdir, writeFile, readFile, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, dirname, extname, basename } from 'node:path';

const run = promisify(execFile);

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'content');
const IMG_DIR = join(ROOT, 'assets', 'img');
const CACHE = join(ROOT, '.cache', 'originals');
const ORIGIN = 'https://lindairiane.com';
const UPLOADS = '/wp/wp-content/uploads/';

const MAX_W = 1800; // ancho máximo de la versión grande
const THUMB_W = 640; // ancho de la miniatura para galerías y listados
const QUALITY = 80;

const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' };

// linda-001-240x359.jpg → linda-001.jpg  (queremos siempre el original)
const stripSize = (p) => p.replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}$)/i, '');

// https://…/uploads/2018/10/foto.jpg → 2018/10/foto.jpg
function relPath(url) {
  const i = url.indexOf(UPLOADS);
  if (i === -1) return null;
  const rel = stripSize(decodeURIComponent(url.slice(i + UPLOADS.length)));
  if (!/\.(jpe?g|png|gif|webp)$/i.test(rel)) return null;
  if (rel.includes('*') || rel.includes('..')) return null;
  return rel;
}

function collectUrls(text) {
  const found = new Set();
  const re = new RegExp(`(?:https?://[^"'\\s)]*)?${UPLOADS.replace(/\//g, '\\/')}[^"'\\s)\\\\]+`, 'g');
  for (const m of text.matchAll(re)) found.add(m[0]);
  return found;
}

async function main() {
  // 1. Reunir todas las URLs referenciadas en cualquier parte del contenido.
  const urls = new Set();
  for (const f of await ficherosDeContenido()) {
    for (const u of collectUrls(await readFile(f, 'utf8'))) urls.add(u);
  }

  // rel → { url: original, alts: [variantes redimensionadas]}
  // Algunos originales ya no existen en el servidor (404) y solo sobrevive
  // alguna miniatura, así que guardamos las variantes como plan B.
  const rels = new Map();
  for (const u of urls) {
    const rel = relPath(u);
    if (!rel) continue;
    if (!rels.has(rel)) rels.set(rel, { url: `${ORIGIN}${UPLOADS}${rel}`, alts: new Set() });
    const abs = u.startsWith('http') ? u : `${ORIGIN}${u}`;
    if (abs !== rels.get(rel).url) rels.get(rel).alts.add(abs);
  }
  console.log(`${rels.size} imágenes únicas referenciadas\n`);

  await mkdir(CACHE, { recursive: true });
  await mkdir(IMG_DIR, { recursive: true });

  const manifest = {};
  let done = 0;
  let failed = 0;
  const entries = [...rels.entries()];

  // 2. Descargar (con caché en disco) y convertir, de 6 en 6.
  const CONCURRENCY = 6;
  async function worker() {
    while (entries.length) {
      const [rel, { url, alts }] = entries.shift();
      try {
        const src = join(CACHE, rel);
        if (!existsSync(src)) {
          // Variantes de mayor a menor: si el original no está, tiramos de la más grande.
          const candidates = [url, ...[...alts].sort((a, b) => pxOf(b) - pxOf(a))];
          let buf = null;
          let lastStatus = 0;
          for (const c of candidates) {
            const res = await fetch(c, { headers: UA });
            if (res.ok) {
              buf = Buffer.from(await res.arrayBuffer());
              break;
            }
            lastStatus = res.status;
          }
          if (!buf) throw new Error(`HTTP ${lastStatus}`);
          await mkdir(dirname(src), { recursive: true });
          await writeFile(src, buf);
        }

        const width = await imageWidth(src);
        const outBase = rel.slice(0, -extname(rel).length);
        const big = join(IMG_DIR, `${outBase}.webp`);
        const thumb = join(IMG_DIR, `${outBase}.thumb.webp`);
        await mkdir(dirname(big), { recursive: true });

        if (!existsSync(big)) await toWebp(src, big, width > MAX_W ? MAX_W : 0);
        if (!existsSync(thumb)) await toWebp(src, thumb, width > THUMB_W ? THUMB_W : 0);

        manifest[rel] = { big: `/assets/img/${outBase}.webp`, thumb: `/assets/img/${outBase}.thumb.webp` };
        done++;
      } catch (err) {
        failed++;
        console.log(`  ✗ ${rel}: ${err.message}`);
      }
      process.stdout.write(`  ${done} convertidas, ${failed} fallidas\r`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n\n${done} convertidas, ${failed} fallidas`);

  await writeFile(join(CONTENT, 'images.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log('→ content/images.json');
  console.log(`Peso de assets/img: ${await dirSize(IMG_DIR)}`);
}

// Todo lo que puede citar una imagen: los JSON de content/ y las entradas.
async function ficherosDeContenido() {
  const out = [];
  const walk = async (dir) => {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(json|html)$/.test(e.name)) out.push(p);
    }
  };
  await walk(CONTENT);
  return out;
}

async function imageWidth(file) {
  try {
    const { stdout } = await run('sips', ['-g', 'pixelWidth', file]);
    return Number((stdout.match(/pixelWidth:\s*(\d+)/) || [])[1] || 0);
  } catch {
    return 0;
  }
}

// "foto-240x359.jpg" → 240*359, para ordenar variantes por tamaño.
function pxOf(url) {
  const m = url.match(/-(\d{2,4})x(\d{2,4})\.[a-z]{3,4}$/i);
  return m ? Number(m[1]) * Number(m[2]) : 0;
}

async function toWebp(src, out, resizeW) {
  // cwebp no lee GIF; gif2webp sí (y conserva la animación), pero no redimensiona.
  if (extname(src).toLowerCase() === '.gif') {
    await run('gif2webp', ['-quiet', '-q', String(QUALITY), src, '-o', out]);
    return;
  }
  const args = ['-quiet', '-q', String(QUALITY), '-m', '6'];
  if (resizeW) args.push('-resize', String(resizeW), '0');
  args.push(src, '-o', out);
  await run('cwebp', args);
}

async function dirSize(dir) {
  let total = 0;
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else total += (await stat(p)).size;
    }
  };
  await walk(dir).catch(() => {});
  return `${(total / 1024 / 1024).toFixed(1)} MB`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
