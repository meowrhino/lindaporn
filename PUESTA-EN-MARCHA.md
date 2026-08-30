# Puesta en marcha

Guion de la videollamada con Linda. Una hora larga si nada se tuerce.

Todo son cuentas gratuitas. **Que las cree ella**, con su correo y su móvil: si
las creas tú con tu email, el traspaso es de mentira y dentro de dos años nadie
sabe de quién es la web.

---

## El dominio es lindaporn.com

Dominio **nuevo**, ya en Cloudflare y con la zona vacía:

```
NS   jeremy.ns.cloudflare.com, mckenzie.ns.cloudflare.com   ✓
A / MX / TXT   ninguno todavía
```

Eso es la mejor noticia posible: **no hay correo que romper**. Todo lo que
avisaba antes era por `lindairiane.com`, que se queda como está —WordPress y
buzones en cdmon, intactos— y que no vamos a tocar.

Con la zona limpia, Email Routing se puede activar sin conflicto y **el
formulario de contacto envía correo de verdad**, gratis.

### Lo que queda pendiente de decidir

`lindairiane.com` lleva desde 2015 con 91 entradas indexadas. Si la web pasa a
`lindaporn.com` y la vieja se queda sirviendo el WordPress, se compite consigo
misma en Google.

Lo suyo, cuando haya calma: en cdmon, redirigir `lindairiane.com/*` a
`lindaporn.com/*` con un 301. Las direcciones de las entradas son idénticas en
las dos, así que cada una cae en su sitio y el posicionamiento se traslada.

## Ya hecho

- [x] Repositorio de ella: `lindairiane/web`, con todo subido.
- [x] `content/site.json` apuntando a ese repositorio y a `lindaporn.com`.
- [x] `lindaporn.com` en su Cloudflare, con los nameservers cambiados y la zona
      activa.

---

## 1 · GitHub — hecho, solo queda saberlo

`lindairiane/web` ya tiene la web entera. Tu copia sigue en
`meowrhino/lindaporn` y un solo `git push` actualiza las dos:

```
origin  https://github.com/lindairiane/web.git      (fetch)
origin  https://github.com/lindairiane/web.git      (push)
origin  https://github.com/meowrhino/lindaporn.git  (push)
```

**La única regla:** `git pull` antes de ponerte a trabajar. Ella publica desde
`/escribir/` directamente a su repositorio, así que ese avanza solo.

## 2 · Su clave para escribir

- [ ] En su GitHub: Settings → Developer settings → Personal access tokens →
      **Fine-grained tokens** → Generate new token.
- [ ] Repositorio: **solo** `web`. Permisos: **Contents → Read and write**.
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

## 4 · Correo del formulario

La zona está vacía, así que Email Routing entra sin pisar nada:

- [ ] `lindaporn.com` → **Email → Email Routing** → habilitar. Añade sus MX y
      su SPF; como no había ninguno, no se rompe nada.
- [ ] Destination addresses → añadir `lindairianescort@gmail.com` y
      **verificarla** desde el correo de confirmación que le llega.
- [ ] Opcional y recomendable: regla catch-all `*@lindaporn.com` → su Gmail,
      para que nada se pierda.

> Enviar a una dirección verificada no consume cuota en ningún plan: por eso el
> formulario sale gratis. El remitente es `web@lindaporn.com`, que no necesita
> buzón porque solo manda.

## 5 · Desplegar y enchufar el dominio

```bash
npm run deploy
```

Genera la web, comprueba que no haya nada roto y sube el Worker.

- [ ] Abrir la URL `lindairiane.workers.dev` que devuelve y ver que carga.
- [ ] Worker → Settings → **Domains & Routes** → Add → **Custom domain** →
      `lindaporn.com`. Y otra vez para `www.lindaporn.com`.
      Cloudflare crea el registro DNS y el certificado él solo; tarda un par de
      minutos.
- [ ] Worker → Settings → **Builds** → Connect → repositorio
      **`lindairiane/web`**, rama `main`. Deja el comando de build vacío: ya
      está en `wrangler.jsonc`.

> Con «Custom domain» no hace falta crear ningún registro A ni CNAME a mano.
> Si aparece un aviso de que el registro ya existe, se borra el que hubiera y
> se vuelve a añadir.

## 6 · Probar de verdad, con ella delante

- [ ] Abrir `lindaporn.com` en **su** móvil.
- [ ] Comprobar que `lindaporn.com/2018/11/03/el-arte-del-bdsm/` carga: las
      direcciones de las entradas son las mismas que tenían en el WordPress.
- [ ] Rellenar el formulario de contacto y **comprobar que le llega el correo**.
      Si no llega, `npx wrangler tail` dice el motivo; lo más probable es que la
      dirección de destino no esté verificada todavía (paso 4).
- [ ] Que **ella** publique una entrada de prueba desde `/escribir/`, con foto.
- [ ] Verla aparecer en la web al cabo de un minuto.
- [ ] Borrarla después: se quita el fichero de `content/entradas/` y se hace push.

## 7 · El WordPress viejo

Como la web nueva vive en otro dominio, no hay prisa ni riesgo: `lindairiane.com`
sigue funcionando igual, con su correo.

- [ ] Descargar una copia de seguridad completa del WordPress y guardarla.
- [ ] Cuando ella dé el visto bueno a la web nueva, redirigir en cdmon
      `lindairiane.com/*` → `lindaporn.com/*` con un **301**. Las direcciones
      coinciden una a una, así que el posicionamiento se traslada entero.
- [ ] Después de eso, dejar el WordPress inaccesible —contraseña en `/wp/`, o
      renombrar la carpeta—. **Sin dar de baja el hosting**: ahí sigue su correo
      `@lindairiane.com`.

## Lo que hay que decirle

- La web ya no se puede hackear como antes: no hay panel de administración ni
  base de datos, solo páginas ya hechas.
- No hay que actualizar nada nunca más.
- Todo lo que publique queda guardado con su fecha y se puede recuperar.
- Para escribir: `lindaporn.com/escribir/`, que lo guarde en favoritos.
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
