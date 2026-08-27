/* Editor para escribir entradas del blog desde el navegador.
   Convierte las fotos a WebP aquí mismo (canvas) y manda todo a GitHub en un
   único commit. El Action que ya existe reconstruye la web sola.
   Sin servidor, sin dependencias. */

const { repo, rama, web } = window.CONFIG;
const API = `https://api.github.com/repos/${repo}`;
const CLAVE = 'li-clave';

const ANCHO_GRANDE = 1800;
const ANCHO_MINI = 640;
const CALIDAD = 0.8;

const $ = (id) => document.getElementById(id);

/* --------------------------------------------------------------- */

const acentos = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n', ç: 'c' };

function slugificar(texto) {
  return texto
    .toLowerCase()
    .replace(/[áéíóúüñç]/g, (c) => acentos[c])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const hoy = () => new Date().toISOString().slice(0, 10);

function pedir(ruta, opciones = {}) {
  return fetch(`${API}${ruta}`, {
    ...opciones,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${sessionActual()}`,
      ...opciones.headers,
    },
  }).then(async (res) => {
    if (!res.ok) {
      const detalle = await res.json().catch(() => ({}));
      throw new Error(detalle.message || `Error ${res.status}`);
    }
    return res.json();
  });
}

let clave = null;
const sessionActual = () => clave;

/* ---------------------------------------------------------------
   Puerta de entrada
   --------------------------------------------------------------- */
async function entrar(valor) {
  clave = valor;

  // Comprobamos aquí que la clave además deja escribir: más vale enterarse al
  // entrar que después de haber escrito una entrada entera.
  const repositorio = await pedir('');
  if (!repositorio.permissions?.push) {
    throw new Error('esa clave solo deja leer, no publicar');
  }

  try {
    localStorage.setItem(CLAVE, valor);
  } catch {
    /* navegador sin almacenamiento: valdrá solo para esta sesión */
  }
  $('puerta').hidden = true;
  $('editor').hidden = false;
  $('salir').hidden = false;
  $('fecha').value = hoy();
  refrescarRuta();
  recuperarBorrador();
}

$('entrar').addEventListener('click', async () => {
  const error = $('errorPuerta');
  error.hidden = true;
  try {
    await entrar($('token').value.trim());
  } catch (err) {
    error.textContent = `No he podido entrar: ${err.message}`;
    error.hidden = false;
    clave = null;
  }
});

$('token').addEventListener('keydown', (e) => e.key === 'Enter' && $('entrar').click());

$('salir').addEventListener('click', () => {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada que borrar */
  }
  location.reload();
});

// Si ya entró alguna vez, directo al editor.
try {
  const guardada = localStorage.getItem(CLAVE);
  if (guardada) entrar(guardada).catch(() => localStorage.removeItem(CLAVE));
} catch {
  /* sin almacenamiento: se pide la clave */
}

/* ---------------------------------------------------------------
   Barra de formato
   --------------------------------------------------------------- */
const cuerpo = $('cuerpo');

function envolver(etiqueta) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return alert('Selecciona antes el texto.');
  const rango = sel.getRangeAt(0);
  if (!cuerpo.contains(rango.commonAncestorContainer)) return;

  const nodo = document.createElement(etiqueta);
  try {
    rango.surroundContents(nodo);
  } catch {
    nodo.appendChild(rango.extractContents());
    rango.insertNode(nodo);
  }
}

// Pegar desde Word, WhatsApp o una web mete tipografías, colores y tablas.
// Se pega solo el texto; el formato se pone con los botones.
cuerpo.addEventListener('paste', (e) => {
  e.preventDefault();
  const plano = (e.clipboardData || window.clipboardData).getData('text/plain');
  const lineas = plano.split(/\n{2,}/).filter((t) => t.trim());

  if (lineas.length > 1) {
    // Varios párrafos: se insertan como tales.
    const trozo = document.createDocumentFragment();
    for (const linea of lineas) {
      const p = document.createElement('p');
      p.textContent = linea.trim();
      trozo.appendChild(p);
    }
    insertar(trozo);
  } else {
    insertar(document.createTextNode(plano));
  }
});

function insertar(nodo) {
  const sel = window.getSelection();
  if (!sel.rangeCount) return cuerpo.appendChild(nodo);
  const rango = sel.getRangeAt(0);
  rango.deleteContents();
  rango.insertNode(nodo);
  sel.collapseToEnd();
}

document.querySelectorAll('.escritorio__barra button').forEach((btn) => {
  btn.addEventListener('mousedown', (e) => e.preventDefault());
  btn.addEventListener('click', () => {
    const etiqueta = btn.dataset.etiqueta;
    if (etiqueta) return envolver(etiqueta);

    if (btn.dataset.accion === 'enlace') {
      const href = prompt('Pega la dirección (https://…)');
      if (!href) return;
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) return alert('Selecciona antes el texto.');
      const a = document.createElement('a');
      a.href = href;
      a.rel = 'noopener';
      const rango = sel.getRangeAt(0);
      try {
        rango.surroundContents(a);
      } catch {
        a.appendChild(rango.extractContents());
        rango.insertNode(a);
      }
      return;
    }

    if (btn.dataset.accion === 'foto') $('ficheroFoto').click();
  });
});

/* ---------------------------------------------------------------
   Fotos: se convierten a WebP aquí, en el navegador
   --------------------------------------------------------------- */
const pendientes = new Map(); // url temporal → { ruta, grande, mini }

function aWebp(bitmap, anchoMax) {
  const escala = Math.min(1, anchoMax / bitmap.width);
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext('2d').drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  return new Promise((ok) => lienzo.toBlob(ok, 'image/webp', CALIDAD));
}

$('ficheroFoto').addEventListener('change', async (e) => {
  const ficheros = [...e.target.files];
  e.target.value = '';

  for (const fichero of ficheros) {
    estado(`Preparando ${fichero.name}…`);
    try {
      // Algunos formatos del móvil (HEIC) no los sabe abrir el navegador.
      const bitmap = await createImageBitmap(fichero);
      const [grande, mini] = await Promise.all([
        aWebp(bitmap, ANCHO_GRANDE),
        aWebp(bitmap, ANCHO_MINI),
      ]);
      bitmap.close();
      if (!grande || !mini) throw new Error('no se ha podido convertir');

      const fecha = $('fecha').value || hoy();
      const nombre = slugificar(fichero.name.replace(/\.[^.]+$/, '')) || 'foto';
      const base = `assets/img/${fecha.slice(0, 4)}/${fecha.slice(5, 7)}/${nombre}-${contador()}`;

      const provisional = URL.createObjectURL(grande);
      pendientes.set(provisional, { base, grande, mini });

      const img = document.createElement('img');
      img.src = provisional;
      img.alt = '';
      cuerpo.appendChild(img);
      cuerpo.appendChild(document.createElement('p'));
      estado('');
    } catch {
      estado(`No he podido usar «${fichero.name}». Prueba a guardarla como JPG.`, true);
    }
  }
  guardarBorrador();
});

let n = 0;
const contador = () => String(++n).padStart(2, '0');

/* ---------------------------------------------------------------
   Borrador: lo que se escribe no se pierde aunque se cierre la pestaña
   Las fotos no caben en localStorage, así que se guarda solo el texto y se
   avisa antes de salir si quedaba alguna sin publicar.
   --------------------------------------------------------------- */
const BORRADOR = 'li-borrador';

function guardarBorrador() {
  try {
    localStorage.setItem(
      BORRADOR,
      JSON.stringify({
        titulo: $('titulo').value,
        fecha: $('fecha').value,
        categoria: $('categoria').value,
        cuerpo: cuerpo.innerHTML,
      }),
    );
  } catch {
    /* sin espacio o sin permiso: se sigue escribiendo igual */
  }
}

function recuperarBorrador() {
  let guardado;
  try {
    guardado = JSON.parse(localStorage.getItem(BORRADOR) || 'null');
  } catch {
    return;
  }
  if (!guardado?.titulo && !guardado?.cuerpo?.trim()) return;

  $('titulo').value = guardado.titulo || '';
  if (guardado.fecha) $('fecha').value = guardado.fecha;
  if (guardado.categoria) $('categoria').value = guardado.categoria;
  // Las fotos del borrador apuntaban a blobs que ya no existen: fuera.
  cuerpo.innerHTML = (guardado.cuerpo || '').replace(/<img[^>]*src="blob:[^"]*"[^>]*>/g, '');
  refrescarRuta();
  estado('He recuperado lo que estabas escribiendo. Las fotos hay que volver a ponerlas.');
}

const olvidarBorrador = () => {
  try {
    localStorage.removeItem(BORRADOR);
  } catch {
    /* nada que borrar */
  }
};

let guardadoPendiente;
const guardarLuego = () => {
  clearTimeout(guardadoPendiente);
  guardadoPendiente = setTimeout(guardarBorrador, 800);
};

cuerpo.addEventListener('input', guardarLuego);
$('titulo').addEventListener('input', guardarLuego);
$('fecha').addEventListener('change', guardarBorrador);
$('categoria').addEventListener('change', guardarBorrador);

// Las fotos sí se perderían: si hay alguna sin publicar, avisamos al salir.
window.addEventListener('beforeunload', (e) => {
  if (!pendientes.size) return;
  e.preventDefault();
  e.returnValue = '';
});

/* ---------------------------------------------------------------
   Publicar: un único commit con la entrada y sus fotos
   --------------------------------------------------------------- */
const bytesABase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
};

const textoABase64 = (texto) => bytesABase64(new TextEncoder().encode(texto).buffer);

function estado(mensaje, error = false) {
  const el = $('estado');
  el.textContent = mensaje;
  el.classList.toggle('escritorio__estado--error', error);
}

// Pasa el contenteditable a HTML limpio: fuera divs sueltos y estilos del navegador.
function cuerpoLimpio() {
  const copia = cuerpo.cloneNode(true);

  copia.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('style');
    el.removeAttribute('class');
    if (el.tagName === 'DIV') {
      const p = document.createElement('p');
      p.innerHTML = el.innerHTML;
      el.replaceWith(p);
    }
    if (el.tagName === 'B') el.replaceWith(Object.assign(document.createElement('strong'), { innerHTML: el.innerHTML }));
    if (el.tagName === 'I') el.replaceWith(Object.assign(document.createElement('em'), { innerHTML: el.innerHTML }));
  });

  // Las fotos apuntan todavía al blob temporal: a su ruta definitiva.
  copia.querySelectorAll('img').forEach((img) => {
    const subida = pendientes.get(img.getAttribute('src'));
    if (subida) img.setAttribute('src', `/${subida.base}.webp`);
  });

  // Texto suelto sin envolver → párrafo.
  const trozos = [...copia.childNodes].map((nodo) =>
    nodo.nodeType === 3 ? (nodo.textContent.trim() ? `<p>${nodo.textContent.trim()}</p>` : '') : nodo.outerHTML || '',
  );

  return trozos
    .join('\n')
    .replace(/<p>\s*(?:<br\s*\/?>)?\s*<\/p>/g, '')
    .trim();
}

function refrescarRuta() {
  const slug = slugificar($('titulo').value) || 'sin-titulo';
  const fecha = $('fecha').value || hoy();
  $('ruta').textContent = `${web}/${fecha.slice(0, 4)}/${fecha.slice(5, 7)}/${fecha.slice(8, 10)}/${slug}/`;
}

$('titulo').addEventListener('input', refrescarRuta);
$('fecha').addEventListener('change', refrescarRuta);

$('publicar').addEventListener('click', async () => {
  const titulo = $('titulo').value.trim();
  const fecha = $('fecha').value || hoy();
  const categoria = $('categoria').value;
  const slug = slugificar(titulo);

  if (!titulo) return estado('Ponle un título.', true);
  if (!cuerpo.textContent.trim()) return estado('La entrada está vacía.', true);

  const rutaEntrada = `content/entradas/${categoria}/${fecha}_${slug}.html`;
  const boton = $('publicar');
  boton.disabled = true;

  try {
    // ¿Existe ya una entrada con ese nombre?
    const existe = await fetch(`${API}/contents/${rutaEntrada}?ref=${rama}`, {
      headers: { authorization: `Bearer ${clave}` },
    }).then((r) => r.ok);
    if (existe && !confirm('Ya hay una entrada con ese título y esa fecha. ¿La reemplazo?')) {
      boton.disabled = false;
      return estado('');
    }

    const entrada = `<h1>${titulo}</h1>\n\n${cuerpoLimpio()}\n`;

    // Los ficheros que van en este commit: la entrada y las fotos usadas.
    const usadas = [...cuerpo.querySelectorAll('img')]
      .map((img) => pendientes.get(img.getAttribute('src')))
      .filter(Boolean);

    const ficheros = [{ ruta: rutaEntrada, base64: textoABase64(entrada) }];
    for (const foto of usadas) {
      ficheros.push({ ruta: `${foto.base}.webp`, base64: bytesABase64(await foto.grande.arrayBuffer()) });
      ficheros.push({ ruta: `${foto.base}.thumb.webp`, base64: bytesABase64(await foto.mini.arrayBuffer()) });
    }

    estado('Subiendo…');
    const ref = await pedir(`/git/ref/heads/${rama}`);
    const commitPadre = await pedir(`/git/commits/${ref.object.sha}`);

    const arbol = [];
    for (const [i, f] of ficheros.entries()) {
      estado(`Subiendo ${i + 1} de ${ficheros.length}…`);
      const blob = await pedir('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: f.base64, encoding: 'base64' }),
      });
      arbol.push({ path: f.ruta, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const nuevoArbol = await pedir('/git/trees', {
      method: 'POST',
      body: JSON.stringify({ base_tree: commitPadre.tree.sha, tree: arbol }),
    });

    const commit = await pedir('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: `Nueva entrada: ${titulo}`,
        tree: nuevoArbol.sha,
        parents: [ref.object.sha],
      }),
    });

    await pedir(`/git/refs/heads/${rama}`, {
      method: 'PATCH',
      body: JSON.stringify({ sha: commit.sha }),
    });

    estado('Publicado. En un minuto estará en la web.');
    $('titulo').value = '';
    cuerpo.innerHTML = '';
    pendientes.clear();
    olvidarBorrador();
    refrescarRuta();
  } catch (err) {
    estado(`No se ha podido publicar: ${err.message}`, true);
  } finally {
    boton.disabled = false;
  }
});
