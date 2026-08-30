# Puesta en marcha

Guion de la videollamada con Linda. Una hora larga si nada se tuerce.

Todo son cuentas gratuitas. **Que las cree ella**, con su correo y su móvil: si
las creas tú con tu email, el traspaso es de mentira y dentro de dos años nadie
sabe de quién es la web.

---

## Aviso importante: el dominio tiene correo

Consultando los DNS actuales (`dig`), `lindairiane.com` **no es solo la web**:

```
NS      ns1-ns3.cdmon.net, ns4-ns5.cdmondns-01.*   ← el DNS lo lleva cdmon
A       lindairiane.com        → 134.0.9.152
MX      lindairiane.com        → 10 mail.lindairiane.com  (→ 134.0.9.152)
TXT     v=spf1 include:_spf.srv.cat ~all
TXT     v=DMARC1; p=quarantine; aspf=s; adkim=r        (en _dmarc)
TXT     J35jIx1GVq…  y  jZyxfKKqFi…                    (verificaciones)
CNAME   www, ftp → lindairiane.com
A       mail, webmail, autodiscover → 134.0.9.152
```

Dos cosas que se deducen de ahí:

1. **Hay buzones de correo en ese dominio.** Existen `mail`, `webmail` y
   `autodiscover`, y hay SPF y DMARC configurados. Alguien usa —o usaba—
   direcciones `@lindairiane.com`.
2. **La web y el correo están en el mismo servidor de cdmon** (134.0.9.152).
   Si se da de baja el hosting, **el correo se cae con él**.

Y hay un choque: Cloudflare Email Routing **sustituye los MX** del dominio. No
pueden convivir con los de cdmon.

### Qué hacer el domingo

**Nada de Email Routing.** Se copian los registros de arriba tal cual en
Cloudflare, se deja el correo donde está y la web pasa al Worker. El formulario
de contacto sigue funcionando con el `mailto:` de siempre, que es exactamente
lo que hace hoy.

El correo se decide otro día, con calma, cuando ella conteste a esto:

> **¿Usas alguna dirección `@lindairiane.com`?** ¿Entras a `webmail.lindairiane.com`?

- **No las usa** → se activa Email Routing, se reenvía todo a su Gmail y el
  formulario pasa a enviar correo de verdad. Gratis.
- **Sí las usa** → o se migran esos buzones a Cloudflare (reenvío a Gmail,
  gratis, pero solo recibir) o se deja el correo en cdmon y el formulario se
  resuelve con Formspree. Hay que exportar el correo guardado antes de tocar nada.

---

## Antes de quedar

- [ ] Que tenga a mano el correo `lindairianescort@gmail.com` abierto.
- [ ] **Dónde se paga el dominio.** El registrador es Arsys/Nicline y el DNS lo
      lleva cdmon, así que puede tener dos cuentas distintas. Los nameservers se
      cambian donde esté el dominio. **Sin ese acceso el domingo no hay web
      nueva**: un Worker no puede servir un dominio cuya zona no esté en
      Cloudflare.
- [ ] Preguntarle lo del correo `@lindairiane.com` (arriba).
- [ ] Que cambie ya la contraseña de `wp-admin`, que circuló por WhatsApp.
- [ ] Que **no** dé de baja el hosting de cdmon ese día. Ahí está su correo.

---

## 0 · Lo primero de la llamada: los nameservers

Cambiarlos **antes que nada**, porque tardan en propagarse y todo lo demás
depende de ello. Mientras tanto se hacen los pasos 1 y 2.

- [ ] Ella crea cuenta en cloudflare.com.
- [ ] Add a site → `lindairiane.com` → plan **Free**.
- [ ] Cloudflare escanea los DNS actuales. **Revisar uno por uno** contra la
      lista del principio de este documento: sobre todo el **MX**, el **SPF** y
      el **DMARC**. Si falta alguno, añadirlo a mano antes de continuar.
- [ ] Cambiar los nameservers donde esté el dominio (Arsys/Nicline, o cdmon si
      lo gestiona él).
- [ ] Seguir con lo demás. La zona pasará a «Active» en un rato.

## 1 · GitHub: dos repositorios, uno de verdad

El repositorio de ella es **el que manda**: de ahí despliega el Worker y ahí
escribe el editor. El tuyo queda como copia tuya, y tú tienes acceso a los dos.

- [ ] Ella crea cuenta en github.com y activa la verificación en dos pasos.
- [ ] Ella crea un repositorio **vacío** llamado `lindaporn`.
- [ ] Que te añada como **colaborador** (Settings → Collaborators).
- [ ] Subirle el contenido desde tu copia local:

```bash
git remote add cliente https://github.com/ELLA/lindaporn.git
git push cliente main
```

- [ ] Editar `content/site.json` → `"repo": "ELLA/lindaporn"`. **Esto es
      imprescindible**: si se queda apuntando al tuyo, ella publicará entradas
      en tu repositorio y la web no se enterará.

### Que un solo `git push` actualice los dos

Se le dan a un mismo remoto dos direcciones de escritura. Se descarga del suyo
—que es el bueno— y se sube a los dos a la vez:

```bash
git remote set-url origin https://github.com/ELLA/lindaporn.git
git remote set-url --add --push origin https://github.com/ELLA/lindaporn.git
git remote set-url --add --push origin https://github.com/meowrhino/lindaporn.git
git remote -v      # comprobar: un fetch (el de ella) y dos push
```

A partir de ahí, `git push` los deja iguales sin pensar.

**La única regla:** `git pull` antes de ponerte a trabajar. Ella publica
entradas desde `/escribir/`, así que su repositorio avanza solo y el tuyo no.

> Si prefieres no mantener dos copias, la alternativa es traspasarle el
> repositorio (Settings → Transfer ownership): se lleva el historial y las
> Actions, y los enlaces viejos redirigen. Pero entonces solo hay uno.

## 2 · Su clave para escribir

- [ ] En su GitHub: Settings → Developer settings → Personal access tokens →
      **Fine-grained tokens** → Generate new token.
- [ ] Repositorio: **solo** `lindaporn`. Permisos: **Contents → Read and write**.
      Nada más. Caducidad: la que quiera; cuando caduque se hace otro.
- [ ] Copiar el token (solo se ve una vez) y pegarlo en `/escribir/`.

> Si la clave solo tuviera permiso de lectura, el editor lo dice al entrar en
> vez de dejarla escribir una entrada entera para nada.

## 3 · Acceso a su Cloudflare

Para poder desplegar desde tu máquina hace falta que tu cuenta vea la suya:

- [ ] Ella: Manage Account → **Members** → Invite → tu correo, rol
      **Administrator**. Aceptas la invitación.
- [ ] `npx wrangler login` en tu máquina y, si pregunta, elegir **su** cuenta.

> Alternativa si prefieres no entrar en su cuenta: que comparta pantalla y lo
> haga ella, o que genere un API token y lo uses con `CLOUDFLARE_API_TOKEN`.

## 4 · Correo del formulario — **no tocar el domingo**

Ver el aviso del principio: la zona tiene MX propios y activar Email Routing
los sustituiría. Se deja para otro día.

El formulario mientras tanto funciona con `mailto:`, igual que ahora.

## 5 · Desplegar

```bash
npx wrangler login
npm run deploy
```

- [ ] Abrir la URL `*.workers.dev` que devuelve y ver que la web carga.
- [ ] Worker → Settings → **Domains & Routes** → añadir `lindairiane.com` y
      `www.lindairiane.com`.
- [ ] Worker → Settings → **Builds** → Connect → elegir **el repositorio de
      ella**, no el tuyo. A partir de aquí cada push despliega solo.

## 6 · Probar de verdad, con ella delante

- [ ] Abrir `lindairiane.com` en **su** móvil.
- [ ] Comprobar que `lindairiane.com/2018/11/03/el-arte-del-bdsm/` sigue
      funcionando: las direcciones de todas las entradas se han conservado.
- [ ] **Que le siga llegando el correo a su dirección `@lindairiane.com`**, si
      la usa. Mandarle un mensaje de prueba desde otra cuenta.
- [ ] Que **ella** publique una entrada de prueba desde `/escribir/`, con foto.
- [ ] Verla aparecer en la web al cabo de un minuto.
- [ ] Borrarla después: se quita el fichero de `content/entradas/` y se hace push.
- [ ] El formulario de contacto abrirá su programa de correo (`mailto:`). Es lo
      esperado hasta que se decida lo del correo.

## 7 · El WordPress: dejarlo apagado, no darlo de baja

**No dar de baja el hosting de cdmon.** La web y el correo están en el mismo
servidor (134.0.9.152): si se cancela, el correo del dominio se cae con él.

- [ ] Descargar una copia de seguridad completa del WordPress y guardarla.
- [ ] Dejar el WordPress **inaccesible** —proteger `/wp/` con contraseña, o
      renombrar la carpeta— sin tocar el correo. Un WP 6.9.7 con quince plugins
      sin mantenimiento es un blanco fácil.
- [ ] Ya sin prisa, decidir lo del correo y entonces sí se puede plantear bajar
      el hosting.

---

## Lo que hay que decirle

- La web ya no se puede hackear como antes: no hay panel de administración ni
  base de datos, solo páginas ya hechas.
- No hay que actualizar nada nunca más.
- Todo lo que publique queda guardado con su fecha y se puede recuperar.
- Para escribir: `lindairiane.com/escribir/`, que lo guarde en favoritos.
- Las instrucciones para ella están en [PARA-LINDA.md](PARA-LINDA.md).

## Lo que conviene que decida ella

- **`/nota-legal/` tiene una sola palabra: «Linda».** Era así en el WordPress.
  Está vacía a efectos prácticos y debería redactarse.
- **`/cookies/`** es el texto genérico del plugin viejo y menciona Google
  Analytics, que esta web ya no usa.
- Seis fotos de entradas antiguas ya no existían en el servidor de WordPress.
  Si aparecen en algún backup, se recuperan (ver el README).
- Las **banderas de idioma** las quitamos: eran un script de Google Translate.
  Si las quiere de vuelta, se puede ver cómo.
