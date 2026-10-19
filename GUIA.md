# Cómo escribir en tu web

Tu web ya no es WordPress. Ahora es mucho más rápida y no se puede hackear,
porque no hay nada que hackear: son páginas ya hechas.

Para escribir tienes tu propia página de escribir.

---

## Escribir una entrada

**1.** Entra en:

```
lindaporn.com/escribir/
```

Guárdalo en favoritos. La primera vez te pedirá tu clave; luego ya no.

**2.** Rellena arriba: **título**, **fecha** (sale la de hoy) y **categoría**.

**3.** Escribe en la hoja grande.

Para poner algo en **negrita** o en *cursiva*: seleccionas el texto y le das al
botón. Igual con **enlace**.

Si pegas texto de WhatsApp, de un Word o de una web, entra limpio: se queda solo
lo que dice, sin los colores ni las letras raras de donde venga.

**4.** Para meter una foto: botón **foto**, la eliges y se coloca sola.

Puedes meter todas las que quieras. Se preparan solas para que la web no pese
—no hace falta que las reduzcas antes— y funciona igual desde el móvil.

**5.** Botón **Publicar**.

Tarda un minuto en verse en la web. Si actualizas y no está, espera un poco más
y vuelve a actualizar.

---

## Si cierras sin querer

Lo que escribes se va guardando solo en tu dispositivo. Si cierras la pestaña,
se va la luz o te llaman por teléfono, al volver a entrar te lo encuentras
donde lo dejaste.

Las **fotos** son la excepción: esas hay que volver a ponerlas. Por eso, si
sales con fotos puestas sin publicar, el navegador te pregunta si estás segura.

---

## Cosas que pasan a veces

**«La entrada está vacía»** → te has dejado el texto o el título.

**«Ya hay una entrada con ese título y esa fecha»** → o la escribiste antes, o
le has puesto el mismo título que a otra del mismo día. Si dices que sí,
reemplaza la anterior.

**«No se ha podido publicar»** → normalmente es que se ha ido internet.
Inténtalo otra vez. **No cierres la pestaña**: mientras no la cierres, lo que
has escrito sigue ahí.

**Se ha caducado la clave** → te lo dirá al entrar. Avisa a Manu y te da una nueva.

---

## Corregir algo ya publicado

Por ahora, escribes la entrada otra vez con el mismo título y la misma fecha, y
cuando pregunte si la reemplazas, dices que sí.

Si es solo una errata pequeña, dile a Manu.

---

## Cambiar un precio, el teléfono o un texto

Si prefieres, díselo a Manu. Si quieres hacerlo tú, todo está en un solo
fichero: `data/site.json`, en GitHub. Lo abres, le das al lápiz, cambias lo
que haya **entre comillas** y guardas.

| Para cambiar… | Busca |
|---|---|
| el teléfono, el correo, el horario | `"contact"` |
| los precios de Servicios | `"services"` → `"rates"` (cada línea, `"item"` y `"price"`) |
| los precios de BDSM | `"bdsm"` → `"rates"` |
| las fotos de las galerías | `"galleries"` → `"photos"` |
| lo que sale en Google | `"description"` |

**La regla de oro**: cambia solo lo de dentro de las comillas. Las comas, los
corchetes y las llaves, déjalos como estaban.

Si después de guardar la web no cambia y al lado de tu cambio sale una **cruz
roja**, casi siempre es una coma: una que falta al final de una línea o una de
más antes de un `}`. La web se queda como estaba hasta que se arregla, así que
no se rompe nada. Si no la encuentras, avisa a Manu.

---

## Lo que ya no hace falta

- No hay que actualizar plugins nunca más.
- No hay copias de seguridad que hacer: está todo guardado con su historial.
- No hay `/wp-admin`, ni la contraseña vieja. Esa contraseña **bórrala** de
  donde la tengas apuntada.

---

## Si algo se rompe

Todo lo que publicas queda guardado con fecha, y se puede volver atrás a como
estaba antes en cualquier momento. No hay forma de que borres algo sin arreglo.

Escribe tranquila.
