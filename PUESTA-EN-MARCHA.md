# Puesta en marcha

Guion de la sesión con Linda. Una hora larga si nada se tuerce.

Todo son cuentas gratuitas. **Que las cree ella**, con su correo y su móvil: si
las creas tú con tu email, el traspaso es de mentira y dentro de dos años nadie
sabe de quién es la web.

---

## Antes de quedar

- [ ] Que tenga a mano el correo `lindairianescort@gmail.com` abierto.
- [ ] Saber **dónde está comprado `lindairiane.com`** y tener acceso al panel
      del registrador (ahí se cambian los nameservers). Sin esto, el paso 4 no
      se puede terminar.
- [ ] Que cambie ya la contraseña de `wp-admin`, que circuló por WhatsApp.

---

## 1 · GitHub

- [ ] Ella crea cuenta en github.com y activa la verificación en dos pasos.
- [ ] Tú: Settings → Danger Zone → **Transfer ownership** del repo `lindaporn`
      a su usuario. Se lleva el historial y las Actions.
- [ ] Ella acepta el traspaso desde su correo.
- [ ] Editar `content/site.json` y poner `"repo": "suusuario/lindaporn"`.
- [ ] `git remote set-url origin https://github.com/suusuario/lindaporn.git`

## 2 · Su clave para escribir

- [ ] En su GitHub: Settings → Developer settings → Personal access tokens →
      **Fine-grained tokens** → Generate new token.
- [ ] Repositorio: **solo** `lindaporn`. Permisos: **Contents → Read and write**.
      Nada más. Caducidad: la que quiera; cuando caduque se hace otro.
- [ ] Copiar el token (solo se ve una vez) y pegarlo en `/escribir/`.

> Si la clave solo tuviera permiso de lectura, el editor lo dice al entrar en
> vez de dejarla escribir una entrada entera para nada.

## 3 · Cloudflare

- [ ] Ella crea cuenta en cloudflare.com.
- [ ] Add a site → `lindairiane.com` → plan **Free**.
- [ ] Cloudflare le da dos nameservers. **Cambiarlos en el registrador** del
      dominio. Tarda entre unos minutos y unas horas en propagarse.

## 4 · Correo del formulario

- [ ] En la zona `lindairiane.com`: **Email → Email Routing** → habilitar.
      Añade solo los registros MX y SPF que pide.
- [ ] Destination addresses → añadir `lindairianescort@gmail.com` y
      **verificarla** desde el correo de confirmación.
- [ ] Comprobar que `destination_address` en `wrangler.jsonc` es esa misma
      dirección.

> Enviar a una dirección verificada no consume cuota en ningún plan. Por eso
> esto sale gratis.

## 5 · Desplegar

```bash
npx wrangler login
npm run deploy
```

- [ ] Abrir la URL `*.workers.dev` que devuelve y ver que la web carga.
- [ ] Worker → Settings → **Domains & Routes** → añadir `lindairiane.com` y
      `www.lindairiane.com`.
- [ ] Worker → Settings → **Builds** → Connect → elegir el repo. A partir de
      aquí cada push despliega solo.

## 6 · Probar de verdad, con ella delante

- [ ] Abrir `lindairiane.com` en **su** móvil.
- [ ] Rellenar el formulario de contacto y **comprobar que le llega el correo**.

> **Esto es lo único que no se ha podido probar de antemano.** El Worker entero
> funciona —lo comprobé con `wrangler dev`: rutas, validación, antispam, el 404
> y la redirección de barra final—, pero en local el envío de correo está
> simulado: contesta que sí sin mandar nada. El envío de verdad solo se puede
> probar con la zona ya en Cloudflare.
>
> Si no llega, `npx wrangler tail` dice el motivo. Los dos habituales:
>
> - **La dirección de destino no está verificada** en Email Routing. Es el caso
>   más probable. Se arregla en el paso 4.
> - **El remitente no vale.** `REMITENTE` en `wrangler.jsonc` es
>   `web@lindairiane.com`. Tiene que ser del dominio de la zona; si Cloudflare
>   lo rechaza, prueba con una dirección que exista como regla en Email Routing.
>
> Mientras no funcione no se rompe nada: el formulario se cae solo al `mailto:`
> y abre el correo del visitante, como hasta ahora.
- [ ] Que **ella** publique una entrada de prueba desde `/escribir/`, con foto.
- [ ] Verla aparecer en la web al cabo de un minuto.
- [ ] Borrarla después: se quita el fichero de `content/entradas/` y se hace push.

## 7 · Cerrar el WordPress

- [ ] Descargar una copia de seguridad completa del WordPress y guardarla.
- [ ] Dar de baja el hosting o, como mínimo, dejar el WordPress inaccesible.
      Un WP 6.9.7 con quince plugins sin mantenimiento es un blanco fácil.
- [ ] Comprobar que `lindairiane.com/2018/11/03/el-arte-del-bdsm/` sigue
      funcionando: las direcciones de todas las entradas se han conservado.

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
