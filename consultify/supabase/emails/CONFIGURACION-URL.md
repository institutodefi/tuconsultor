# Autenticación · configuración de URL y correos

## 1 · URL Configuration

Panel de Supabase → **Authentication → URL Configuration**.

### Site URL

```
https://consultify.tuconsultor.com/app/acceso
```

**Corregido respecto a la primera versión de esta guía.** Antes ponía aquí
`https://consultify.tuconsultor.com` a secas, y eso está mal: en `netlify.toml`,
la raíz de ese subdominio reescribe a `/consultify/`, que es la landing de
Consultify, **no la aplicación**. Un enlace de correo que aterrice ahí entrega el
token en el fragmento de la URL a una página estática que no sabe qué hacer con
él: la sesión se pierde y parece que «el enlace no funciona».

Apuntando a `/app/acceso`, la reescritura `consultify.tuconsultor.com/app/*` →
`/app/index.html` entrega la petición a la aplicación, el cliente de Supabase
detecta el token en la URL y crea la sesión.

Es a donde vuelve quien pulsa un enlace de correo cuando no se indica otra cosa,
y es lo que rellena `{{ .SiteURL }}` en las plantillas.

### Redirect URLs (lista blanca)

Cualquier destino que no esté aquí se ignora y la persona acaba en la Site URL,
que es el motivo más común de «el enlace me deja en la pantalla equivocada».

```
https://consultify.tuconsultor.com/app/**
https://www.tuconsultor.com/app/**
http://localhost:5173/app/**
http://localhost:4173/app/**
```

Las rutas concretas que usa la aplicación, por si prefieres listarlas una a una
en lugar de con comodín:

| Ruta | Cuándo se usa |
|---|---|
| `/app/establecer-password` | Invitación: la persona elige contraseña por primera vez |
| `/app/nueva-password` | Recuperación: es la que pasa `resetPasswordForEmail` |
| `/app/acceso` | Entrada normal y destino tras confirmar el correo |

**Dos avisos sobre esto.**

La aplicación usa `BrowserRouter` con `basename="/app"`, así que **el `/app` no
es opcional**: sin él, React Router no encuentra la ruta y verás la calculadora.

Y si usas previsualizaciones de despliegue de Netlify, añade también el patrón
de esas URL —algo como `https://*--tunombredesitio.netlify.app/app/**`—, o los
correos de una rama no llevarán a ninguna parte.

---

## 2 · Plantillas de correo

Panel de Supabase → **Authentication → Emails**, una pestaña por plantilla.
Se pega el HTML entero en el campo *Message body*.

Las seis del panel, numeradas en el mismo orden en que aparecen:

| Archivo | Pestaña del panel | Asunto sugerido |
|---|---|---|
| `1-confirmacion.html` | Confirm sign up | Confirma tu correo · Orbita.PMTools |
| `2-invitacion.html` | Invite user | Te damos acceso a Orbita.PMTools |
| `3-enlace-magico.html` | Magic link or OTP | Tu enlace de acceso · Orbita.PMTools |
| `4-cambio-de-correo.html` | Change email address | Confirma tu correo nuevo · Orbita.PMTools |
| `5-recuperar-password.html` | Reset password | Cambia tu contraseña · Orbita.PMTools |
| `6-reautenticacion.html` | Reauthentication | Tu código de verificación · Orbita.PMTools |

### Tres idiomas en un solo archivo

Supabase solo admite **una plantilla por tipo**, así que cada archivo lleva los
tres idiomas resueltos con condicionales de Go sobre `{{ .Data }}`, que expone
`auth.users.user_metadata`:

```
{{ if eq .Data.idioma "en" }} … inglés …
{{ else if eq .Data.idioma "ar" }} … árabe …
{{ else }} … español …
{{ end }}
```

Para que funcione, **al invitar hay que pasar el idioma en los metadatos**. Desde
el panel, en *Invite user*, o por API:

```js
await supabase.auth.admin.inviteUserByEmail('persona@empresa.com', {
  data: { idioma: 'ar' },          // 'es' | 'en' | 'ar'
  redirectTo: 'https://consultify.tuconsultor.com/app/establecer-password',
});
```

Sin `idioma` en los metadatos, cae en español. No falla: elige el idioma por
defecto, que es lo que quieres si no sabes en qué idioma habla esa persona.

El bloque árabe no se limita a poner `dir="rtl"`: **invierte también la
alineación** de titular, texto, botón y pie, porque en una interfaz derecha-a-
izquierda no basta con cambiar el sentido de la escritura. El código de seis
dígitos se queda en `direction:ltr`, porque un número no se lee al revés.

Faltan francés y alemán: dilo y los añado al mismo archivo, son dos bloques más.

### Tres que se comportan distinto

**Reautenticación no lleva enlace.** Supabase solo entrega `{{ .Token }}` en esa
plantilla: no existe `{{ .ConfirmationURL }}`. Por eso es la única sin botón, con
el código como protagonista. Si le pegas una plantilla con botón, saldrá un
enlace vacío.

**Cambio de correo se envía a dos buzones.** Con el cambio seguro activado
—que es lo recomendable— Supabase manda confirmación a la dirección **antigua** y
a la **nueva**, y hacen falta las dos. Es la misma plantilla para ambos envíos,
así que el texto no puede dar por hecho a cuál está llegando. Usa
`{{ .Email }}` para la antigua y `{{ .NewEmail }}` para la nueva.

**Enlace mágico solo hace falta si lo activas.** Ahora mismo la aplicación entra
con contraseña. La plantilla está lista por si algún día habilitas el acceso sin
contraseña, pero si no lo usas, no toques nada en esa pestaña.

### Cómo están hechas

Tablas de 600 px con todo el CSS en línea, sin `<style>`: es lo único que
sobrevive a Outlook y a Gmail. Botón construido con una celda de tabla con
`bgcolor`, no con un enlace con relleno, por el mismo motivo. Cabecera en `#0A2B3A` con el
logotipo de **Orbita.PMTools**, rasterizado a JPEG desde el SVG animado: los correos
no renderizan SVG, así que hay que servir un mapa de bits. Va sobre el mismo
navy que lleva incrustado, así que empasta sin bordes. Cuerpo claro para que se lea en cualquier cliente y en modo
oscuro.

Llevan texto de vista previa oculto —lo que se ve en la bandeja junto al
asunto—, la dirección en texto plano por si el botón falla, y el pie con la
razón social, el CIF y la vía para ejercer derechos, que es lo que toca en un
correo transaccional.

### Por qué llevan un código además del enlace

Algunos filtros de correo **abren los enlaces al analizarlos** y los consumen:
Safe Links de Microsoft 365 es el caso típico. Cuando la persona pulsa, el
enlace ya está gastado y aparece *«Token has expired or is invalid»*. Es la
causa número uno de invitaciones que «no funcionan».

Por eso las plantillas incluyen `{{ .Token }}`, el código de seis dígitos que
sirve de alternativa. **Ojo: ese código todavía no tiene dónde introducirse.**
Hace falta una pantalla que pida correo y código y llame a `verifyOtp`. Si
quieres, la monto: son unas 60 líneas en `Acceso.jsx`. Mientras tanto el código
se ve pero no se puede usar, así que decide una de dos: o lo montamos, o quito
ese bloque de las tres plantillas.

### Antes de dar de alta a nadie

**Configura SMTP propio.** El servidor de correo de Supabase para proyectos sin
SMTP tiene un límite muy bajo por hora y no garantiza la entrega. Con Brevo, que
ya usáis, se configura en *Authentication → Emails → SMTP Settings* con el
remitente `hola@tuconsultor.com`.

**Y desactiva el seguimiento de aperturas y clics en Brevo para estos envíos.**
Si está activo, reescribe los enlaces del correo y los de autenticación dejan de
funcionar. Es la segunda causa más común de invitaciones rotas.

---

## 3 · Dar de alta a una persona

Panel → **Authentication → Users → Invite user**. Se envía la plantilla
*Invite user*, la persona elige contraseña y entra.

Después hay que **crear su fila en `perfiles`** con su rol y `activo = true`:
sin ella, la política de escritura del CRM la bloquea y verá los botones pero
no podrá guardar nada. Es exactamente lo que nos pasó al principio.

```sql
insert into public.perfiles (id, email, nombre, rol, activo)
select u.id, u.email, 'Nombre Apellidos', 'consultor', true
  from auth.users u
 where u.email = 'persona@tuconsultor.com'
on conflict (id) do update set rol = excluded.rol, activo = true;
```

Roles admitidos: `superadmin`, `admin`, `director`, `consultor`, `gestion`,
`cliente`.
