#!/usr/bin/env node
// Descarga Cormorant y Mrs Saint Delafield de Google Fonts y las deja
// alojadas en el propio repo (subsets latin y latin-ext, que es lo que
// necesita el castellano). Así la web no pide nada a servidores ajenos.
// Uso: node tools/fonts.js

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = join(import.meta.dirname, '..', 'assets', 'fonts');
const FAMILIES = ['Cormorant:wght@400;500;600;700', 'Mrs+Saint+Delafield'];

// Rangos que cubren castellano/catalán/inglés. El resto (cirílico, vietnamita) sobra.
const KEEP = [
  'U+0000-00FF', // latin
  'U+0100-02BA', // latin-ext
];

// Chrome pide woff2; con otro UA Google devuelve formatos antiguos.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
  await mkdir(OUT, { recursive: true });
  const blocks = [];

  for (const family of FAMILIES) {
    const res = await fetch(`https://fonts.googleapis.com/css2?family=${family}&display=swap`, {
      headers: { 'user-agent': UA },
    });
    const css = await res.text();

    for (const face of css.split('@font-face').slice(1)) {
      const range = (face.match(/unicode-range:\s*([^;]+);/) || [])[1] || '';
      if (!KEEP.some((k) => range.startsWith(k))) continue;

      const url = (face.match(/url\((https:\/\/[^)]+)\)/) || [])[1];
      const name = (face.match(/font-family:\s*'([^']+)'/) || [])[1];
      const weight = (face.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
      if (!url || !name) continue;

      const slug = `${name.toLowerCase().replace(/\s+/g, '-')}-${weight}-${range.startsWith('U+0000') ? 'latin' : 'latin-ext'}.woff2`;
      const bin = await fetch(url, { headers: { 'user-agent': UA } });
      await writeFile(join(OUT, slug), Buffer.from(await bin.arrayBuffer()));

      blocks.push(
        `@font-face {\n` +
          `  font-family: '${name}';\n` +
          `  font-style: normal;\n` +
          `  font-weight: ${weight};\n` +
          `  font-display: swap;\n` +
          // Relativa a docs/assets/styles.css, que es donde acaba este CSS.
          `  src: url('fonts/${slug}') format('woff2');\n` +
          `  unicode-range: ${range};\n}`,
      );
      console.log(`  ${slug}`);
    }
  }

  await writeFile(
    join(OUT, 'fonts.css'),
    `/* Generado por tools/fonts.js — no editar a mano. */\n\n${blocks.join('\n\n')}\n`,
  );
  console.log(`\n→ assets/fonts/fonts.css (${blocks.length} @font-face)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
