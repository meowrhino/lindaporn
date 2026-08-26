/* Linda Iriane — JavaScript de la web. Sin dependencias, sin build.
   Todo es progresivo: si el JS no carga, la web se sigue leyendo y navegando. */

/* ---------------------------------------------------------------
   Menú móvil
   --------------------------------------------------------------- */
function menuMovil() {
  const boton = document.querySelector('.hamburguesa');
  const nav = document.querySelector('.nav');
  if (!boton || !nav) return;

  const alternar = (abrir) => {
    const abierto = abrir ?? nav.dataset.abierto !== 'true';
    nav.dataset.abierto = String(abierto);
    boton.setAttribute('aria-expanded', String(abierto));
    document.body.style.overflow = abierto ? 'hidden' : '';
  };

  boton.addEventListener('click', () => alternar());
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) alternar(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.dataset.abierto === 'true') alternar(false);
  });
}

/* ---------------------------------------------------------------
   Carrusel de portada
   --------------------------------------------------------------- */
function heroCarrusel() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const slides = [...hero.querySelectorAll('.hero__slide')];
  const puntos = [...hero.querySelectorAll('.hero__punto')];
  if (slides.length < 2) return;

  let actual = 0;
  let temporizador = null;
  const PAUSA = 6500;

  const ir = (i) => {
    actual = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.dataset.activa = String(n === actual);
      s.setAttribute('aria-hidden', String(n !== actual));
    });
    puntos.forEach((p, n) => p.setAttribute('aria-selected', String(n === actual)));
  };

  const arrancar = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    detener();
    temporizador = setInterval(() => ir(actual + 1), PAUSA);
  };
  const detener = () => clearInterval(temporizador);

  puntos.forEach((p, n) =>
    p.addEventListener('click', () => {
      ir(n);
      arrancar();
    }),
  );

  hero.addEventListener('mouseenter', detener);
  hero.addEventListener('mouseleave', arrancar);
  document.addEventListener('visibilitychange', () => (document.hidden ? detener() : arrancar()));

  // Deslizar con el dedo
  let x0 = null;
  hero.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  hero.addEventListener(
    'touchend',
    (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1));
      x0 = null;
      arrancar();
    },
    { passive: true },
  );

  ir(0);
  arrancar();
}

/* ---------------------------------------------------------------
   Visor de galería
   --------------------------------------------------------------- */
function visorGaleria() {
  const galeria = document.querySelector('.galeria');
  const visor = document.querySelector('.visor');
  if (!galeria || !visor) return;

  const img = visor.querySelector('img');
  const items = [...galeria.querySelectorAll('.galeria__item')];
  let indice = 0;

  const mostrar = (i) => {
    indice = (i + items.length) % items.length;
    const origen = items[indice];
    img.src = origen.dataset.grande;
    img.alt = origen.querySelector('img')?.alt || '';
  };

  items.forEach((item, i) =>
    item.addEventListener('click', () => {
      mostrar(i);
      visor.showModal();
    }),
  );

  visor.querySelector('.visor__boton--prev')?.addEventListener('click', () => mostrar(indice - 1));
  visor.querySelector('.visor__boton--next')?.addEventListener('click', () => mostrar(indice + 1));
  visor.querySelector('.visor__cerrar')?.addEventListener('click', () => visor.close());

  visor.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') mostrar(indice - 1);
    if (e.key === 'ArrowRight') mostrar(indice + 1);
  });

  // Clic en el fondo (fuera de la imagen) cierra
  visor.addEventListener('click', (e) => {
    if (!e.target.closest('img, button')) visor.close();
  });
}

/* ---------------------------------------------------------------
   Aviso de cookies
   --------------------------------------------------------------- */
function avisoCookies() {
  const aviso = document.querySelector('.cookies-aviso');
  if (!aviso) return;
  const CLAVE = 'li-cookies-ok';

  try {
    if (localStorage.getItem(CLAVE) === '1') return;
  } catch {
    return; // navegador con almacenamiento bloqueado: no molestamos
  }

  aviso.hidden = false;
  aviso.querySelector('.cookies-aviso__aceptar')?.addEventListener('click', () => {
    try {
      localStorage.setItem(CLAVE, '1');
    } catch {
      /* si no se puede guardar, al menos se cierra en esta visita */
    }
    aviso.hidden = true;
  });
}

/* ---------------------------------------------------------------
   Confirmación de mayoría de edad
   --------------------------------------------------------------- */
function avisoEdad() {
  const puerta = document.querySelector('.edad');
  if (!puerta) return;
  const CLAVE = 'li-edad-ok';

  let confirmado = false;
  try {
    confirmado = localStorage.getItem(CLAVE) === '1';
  } catch {
    confirmado = true; // sin almacenamiento, no bloqueamos la web
  }
  if (confirmado) return;

  puerta.hidden = false;
  document.body.style.overflow = 'hidden';

  puerta.querySelector('[data-edad="si"]')?.addEventListener('click', () => {
    try {
      localStorage.setItem(CLAVE, '1');
    } catch {
      /* sin almacenamiento: se volverá a preguntar en la próxima visita */
    }
    puerta.hidden = true;
    document.body.style.overflow = '';
  });
}

/* ---------------------------------------------------------------
   Formulario de contacto
   Sin backend: compone un mailto: con lo que se ha escrito.
   Para recibir los mensajes en un servidor, ver README (Formspree/Worker).
   --------------------------------------------------------------- */
function formularioContacto() {
  const form = document.querySelector('.formulario');
  if (!form || !form.dataset.email) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (form.querySelector('.trampa input')?.value) return; // bot

    const datos = new FormData(form);
    const nombre = (datos.get('nombre') || '').toString().trim();
    const email = (datos.get('email') || '').toString().trim();
    const mensaje = (datos.get('mensaje') || '').toString().trim();

    const cuerpo = [mensaje, '', '—', nombre, email].filter(Boolean).join('\n');
    const url =
      `mailto:${form.dataset.email}` +
      `?subject=${encodeURIComponent(`Contacto web — ${nombre || 'sin nombre'}`)}` +
      `&body=${encodeURIComponent(cuerpo)}`;

    window.location.href = url;
  });
}

/* ---------------------------------------------------------------
   Aparición suave al hacer scroll
   --------------------------------------------------------------- */
function apariciones() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const todos = [...document.querySelectorAll('[data-aparece]')];
  if (!todos.length || !('IntersectionObserver' in window)) return;

  // Lo que ya se ve al cargar no se oculta: nada de parpadeos en el primer pintado.
  const objetivos = todos.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);

  objetivos.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(1.5rem)';
    el.style.transition = 'opacity .7s ease, transform .7s ease';
  });

  const obs = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        entrada.target.style.opacity = '1';
        entrada.target.style.transform = 'none';
        obs.unobserve(entrada.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  objetivos.forEach((el) => obs.observe(el));
}

/* --------------------------------------------------------------- */
for (const arranca of [
  menuMovil,
  heroCarrusel,
  visorGaleria,
  avisoCookies,
  avisoEdad,
  formularioContacto,
  apariciones,
]) {
  try {
    arranca();
  } catch (err) {
    console.error(`Fallo al iniciar ${arranca.name}:`, err);
  }
}
