# lindaporn, para Claude

La web de Linda Iriane (lindaporn.com), hecha por meowrhino con la receta del
estudio ([meowrhino/JAMstack](https://github.com/meowrhino/JAMstack)). Se habla
en castellano. Cómo está hecha: [README.md](README.md); cómo escribe Linda:
[GUIA.md](GUIA.md).

## Si el build falla (la web no se ha publicado)

Cuando falla, la web se queda como estaba. Para arreglarlo:

1. **El error**, en uno de estos sitios:
   - En nuestra copia (`meowrhino/lindaporn`), la Action abre un issue con la
     etiqueta `build` y el mensaje dentro: `gh issue list --label build` y
     `gh issue view <n>`. El registro entero: `gh run list -L 3` y
     `gh run view <id> --log-failed`.
   - En la copia de Linda (Workers Builds, en su Cloudflare), el registro
     está en su Cloudflare. No hace falta ir: el paso 2 da el mismo mensaje.
2. **Reprodúcelo aquí**: `npm ci && npm run check`. Es el mismo build que en
   la nube y dice lo mismo: cada línea con ✗ trae el fichero y qué pasa.
3. **Arréglalo donde dice**:
   - "data/site.json no es un JSON válido (línea 12…)": una coma de más o de
     menos, o unas comillas sin cerrar, cerca de esa línea.
   - "no es un campo de aquí", "falta…", "no tiene la forma que toca": lo dice
     el esquema (`schema/site.json`); el mensaje lleva cómo va el campo.
   - "posts/…: el nombre tiene que ser AAAA-MM-DD_titulo.html": una entrada
     con el nombre mal puesto. Se renombra (`git mv`); la fecha y el título
     del nombre son su dirección, `/AAAA/MM/DD/titulo/`.
   - "posts/…: falta el título": la entrada no empieza por `<h1>…</h1>`.
   - "roto → …" (de `build/check.mjs`): un enlace o una foto que no está.
     Si es una foto de una entrada que ha subido Linda, mira si está en
     `assets/img/`; si no, pregunta antes de quitarla.
4. **Comprueba**: `npm run check` sin ✗ (los ⚠ no paran nada).

No cambies el build, las plantillas ni el esquema para que pase: si el dato
está bien y el build se queja, es un fallo del build, y hay que decírselo a
manu. No borres fotos ni entradas.

Commit y push solo cuando te lo pidan: mensaje en castellano diciendo qué se
arregla. Al publicarse, la Action cierra el issue sola.
