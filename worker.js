/* Lo único que corre en servidor de toda la web: recibir el formulario de
   contacto y mandárselo a Linda por correo.
   El resto (docs/) lo sirve Cloudflare como ficheros estáticos, sin pasar
   por aquí. Sin dependencias. */

import { EmailMessage } from 'cloudflare:email';

const LIMITE_CAMPO = 2000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contacto') {
      if (request.method !== 'POST') return texto('Método no permitido', 405);
      return recibirContacto(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

const texto = (mensaje, estado) =>
  new Response(JSON.stringify({ mensaje }), {
    status: estado,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

async function recibirContacto(request, env) {
  let datos;
  try {
    datos = Object.fromEntries(await request.formData());
  } catch {
    return texto('No he entendido el formulario.', 400);
  }

  // Trampa antispam: los bots rellenan todos los campos, incluido el oculto.
  if (datos.web) return texto('Gracias.', 200);

  const nombre = recortar(datos.nombre);
  const email = recortar(datos.email);
  const mensaje = recortar(datos.mensaje);

  if (!nombre || !email || !mensaje) return texto('Faltan campos por rellenar.', 400);
  if (!/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email)) return texto('Ese email no parece válido.', 400);

  try {
    await env.EMAIL.send(
      new EmailMessage(env.REMITENTE, env.DESTINO, correo({ nombre, email, mensaje, env })),
    );
  } catch (err) {
    console.error('Fallo al enviar', err);
    return texto('No he podido enviar el mensaje. Prueba a llamar o escribir por email.', 502);
  }

  return texto('Mensaje enviado. Te contesto en cuanto pueda.', 200);
}

const recortar = (valor) => String(valor ?? '').trim().slice(0, LIMITE_CAMPO);

/* ---------------------------------------------------------------
   Un correo RFC 5322 mínimo, a mano.
   Cuerpo y asunto en base64 para no pelearse con acentos ni con la
   longitud de línea, y así no hace falta ninguna librería de MIME.
   --------------------------------------------------------------- */
function correo({ nombre, email, mensaje, env }) {
  const cuerpo = [
    mensaje,
    '',
    '—',
    `De: ${nombre}`,
    `Email: ${email}`,
    'Enviado desde el formulario de lindairiane.com',
  ].join('\r\n');

  // El nombre entero va en el cuerpo; en las cabeceras solo una versión corta
  // y sin caracteres peligrosos, para no pasarnos de los 78 caracteres por línea.
  const corto = paraCabecera(nombre);

  return [
    `From: Web Linda Iriane <${env.REMITENTE}>`,
    `To: <${env.DESTINO}>`,
    // Así, al darle a responder, la respuesta va a quien escribió.
    `Reply-To: "${corto}" <${email}>`,
    `Subject: ${asunto(`Contacto web — ${corto}`)}`,
    `Message-ID: <${crypto.randomUUID()}@lindairiane.com>`,
    `Date: ${fechaRfc()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64texto(cuerpo).replace(/(.{76})/g, '$1\r\n'),
  ].join('\r\n');
}

const b64 = (bytes) => {
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return btoa(binario);
};

const b64texto = (s) => b64(new TextEncoder().encode(s));

// RFC 2047: cada «encoded-word» debe caber en 75 caracteres y poder
// descodificarse por su cuenta. Se trocea por bytes —de 42 en 42, que son 56
// en base64— sin partir ningún carácter multibyte, y así ninguna línea pasa
// de los 78 caracteres que pide el RFC 5322.
function asunto(texto) {
  const bytes = new TextEncoder().encode(texto);
  const trozos = [];

  for (let i = 0; i < bytes.length; ) {
    let fin = Math.min(i + 42, bytes.length);
    while (fin > i && fin < bytes.length && (bytes[fin] & 0xc0) === 0x80) fin--;
    trozos.push(`=?utf-8?B?${b64(bytes.subarray(i, fin))}?=`);
    i = fin;
  }

  // Varios encoded-words se pliegan con un salto de línea y un espacio.
  return trozos.join('\r\n ');
}

// Ni saltos de línea ni comillas: por ahí es por donde un bot intentaría
// colar cabeceras extra (un Bcc, por ejemplo).
const paraCabecera = (valor) =>
  valor.replace(/[\r\n"<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50) || 'sin nombre';

// toUTCString() acaba en "GMT"; el RFC 5322 pide el desfase numérico.
const fechaRfc = () => new Date().toUTCString().replace('GMT', '+0000');
