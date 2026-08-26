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
   Formulario de contacto
   Lo recoge /api/contacto (worker.js) y se lo manda a Linda por correo.
   Si ese endpoint todavía no existe —o falla—, se cae con elegancia al
   mailto: de siempre, así que el formulario nunca deja de servir.
   --------------------------------------------------------------- */
function formularioContacto() {
  const form = document.querySelector('.formulario');
  if (!form || !form.dataset.email) return;

  const aviso = form.querySelector('.formulario__nota');
  const boton = form.querySelector('button[type="submit"]');
  const decir = (mensaje, error = false) => {
    if (!aviso) return;
    aviso.textContent = mensaje;
    aviso.classList.toggle('formulario__nota--error', error);
  };

  const porCorreo = (datos) => {
    const cuerpo = [datos.get('mensaje'), '', '—', datos.get('nombre'), datos.get('email')]
      .filter(Boolean)
      .join('\n');
    window.location.href =
      `mailto:${form.dataset.email}` +
      `?subject=${encodeURIComponent(`Contacto web — ${datos.get('nombre') || 'sin nombre'}`)}` +
      `&body=${encodeURIComponent(cuerpo)}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = new FormData(form);
    if (datos.get('web')) return; // trampa antispam

    boton.disabled = true;
    decir('Enviando…');

    try {
      const res = await fetch(form.dataset.endpoint, { method: 'POST', body: datos });

      // Que no haya endpoint, o que el correo esté caído, no es culpa de quien
      // escribe: se le abre su propio correo y listo. Un 400 sí es cosa suya.
      if (res.status === 404 || res.status >= 500) throw new Error('sin endpoint');

      const { mensaje } = await res.json().catch(() => ({}));
      if (res.ok) {
        form.reset();
        decir(mensaje || 'Mensaje enviado.');
      } else {
        decir(mensaje || 'Revisa los datos y vuelve a probar.', true);
      }
    } catch {
      decir('');
      porCorreo(datos);
    } finally {
      boton.disabled = false;
    }
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
  formularioContacto,
  apariciones,
]) {
  try {
    arranca();
  } catch (err) {
    console.error(`Fallo al iniciar ${arranca.name}:`, err);
  }
}
