# Sincronización bidireccional con Outlook

Lo que hasta ahora era un calendario de solo lectura (`/api/agenda-feed`, un
`.ics` suscribible) pasa a ser sincronización de verdad: cada sesión de Órbita
es un evento real en el calendario del consultor, y lo que él mueva o cancele
allí vuelve aquí.

**Nada de esto funciona hasta que existan las credenciales.** Son cuatro pasos
en el portal de Azure y cinco variables en Netlify, y hay que darlos tú: crear
un registro de aplicación exige ser administrador del tenant.

---

## 1 · Registro de aplicación en Entra ID

Portal de Azure → **Microsoft Entra ID** → *Registros de aplicaciones* → *Nuevo
registro*.

- Nombre: `Órbita.PMTools · calendario`
- Tipos de cuenta: **solo este directorio organizativo**
- URI de redirección: ninguno (no hay usuario delante, es de servidor a servidor)

Del resumen apunta **Id. de aplicación (cliente)** y **Id. de directorio
(inquilino)**.

En *Certificados y secretos* → **Nuevo secreto de cliente**. Cópialo en ese
momento: después ya no se puede volver a ver. Ponle 24 meses y apunta en el
calendario cuándo caduca, porque el día que caduque la sincronización se para
en seco.

## 2 · Permisos

*Permisos de API* → *Agregar permiso* → **Microsoft Graph** → **Permisos de
aplicación** → `Calendars.ReadWrite`.

Después, **Conceder consentimiento del administrador**. Sin ese botón el
permiso está pedido pero no otorgado, y todas las llamadas devuelven 403.

## 3 · ⚠ Acotar a quién alcanza — no te saltes esto

`Calendars.ReadWrite` de aplicación da acceso al calendario de **todos los
buzones del tenant**. Todos. Dirección, administración, cualquiera. El código
de Órbita solo toca los buzones de los perfiles con `outlook_sync` activo, pero
eso es una decisión del código, no un límite del permiso: quien tenga el
secreto puede leer cualquier calendario de la organización.

Se acota con una *Application Access Policy*, desde PowerShell de Exchange
Online:

```powershell
Connect-ExchangeOnline

# Un grupo de seguridad con correo que contenga SOLO a quien sincroniza
New-DistributionGroup -Name "Orbita-Calendario" -Type Security `
  -PrimarySmtpAddress "orbita-calendario@tuconsultor.com"

Add-DistributionGroupMember -Identity "orbita-calendario@tuconsultor.com" `
  -Member "alejandro@tuconsultor.com"

New-ApplicationAccessPolicy `
  -AppId "<ID DE APLICACIÓN>" `
  -PolicyScopeGroupId "orbita-calendario@tuconsultor.com" `
  -AccessRight RestrictAccess `
  -Description "Orbita.PMTools solo accede al calendario del equipo de consultoria"

# Comprobación
Test-ApplicationAccessPolicy -Identity "alguien-de-fuera@tuconsultor.com" -AppId "<ID>"
```

La política tarda hasta una hora en aplicarse. `Test-ApplicationAccessPolicy`
debe decir `Denied` para quien no esté en el grupo.

## 4 · Variables de entorno en Netlify

*Site settings* → *Environment variables*:

| Variable | Qué es |
|---|---|
| `MS_TENANT_ID` | Id. de directorio (inquilino) |
| `MS_CLIENT_ID` | Id. de aplicación (cliente) |
| `MS_CLIENT_SECRET` | El secreto del paso 1 |
| `OUTLOOK_CLIENT_STATE` | Una cadena larga al azar que te inventas. Viaja en cada aviso y sirve para descartar los que no vengan de tu suscripción. |
| `OUTLOOK_WEBHOOK_URL` | Opcional. Por defecto `https://consultify.tuconsultor.com/api/outlook-avisos` |

`VITE_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya están.

## 5 · Encender a cada persona

En la base de datos, `perfiles.outlook_sync` (falso por defecto) y, si el buzón
no coincide con el correo de acceso, `perfiles.outlook_upn`.

```sql
update perfiles set outlook_sync = true where email = 'alejandro@tuconsultor.com';
```

Y después, dar de alta la suscripción de avisos:

```
curl -X POST https://consultify.tuconsultor.com/api/outlook-suscripciones \
  -H 'content-type: application/json' -d '{}'
```

La respuesta dice, por persona, si la suscripción se creó, se renovó o falló y
por qué. Los fallos quedan además en `outlook_suscripciones.ultimo_error`.

---

## Cómo funciona

```
Órbita  ──POST/PATCH/DELETE──►  Graph  ──►  calendario del consultor
   ▲                                              │
   └──────── aviso (webhook) ◄────────────────────┘
```

**Ida** — `outlook-empujar`. Cada diez minutos, y además en el momento en que
se guarda una sesión (`POST /api/outlook-empujar {"sesion_id": "…"}`). Ventana
de una semana atrás a cuatro meses adelante.

**Vuelta** — `outlook-avisos`. Graph avisa, la función se trae el evento y
aplica el cambio de fecha y hora.

**Suscripciones** — `outlook-suscripciones`, a diario a las 5:00 UTC. Caducan a
los ~3 días; si esta función deja de correr, la vuelta se apaga sola.

### Las tres reglas que evitan los desastres

**El bucle.** Escribir en Outlook genera un aviso, y atender ese aviso
escribiría otra vez. Se corta guardando el `changeKey` que Graph devuelve en
cada escritura nuestra (`tarea_sesiones.outlook_change_key`): cuando vuelve el
aviso con ese mismo `changeKey`, es nuestro y se ignora.

**El empate.** Gana el último cambio, comparando
`tarea_sesiones.actualizado` (disparador nuevo en v151) con el
`lastModifiedDateTime` del evento. Si Órbita se tocó después, el aviso se
descarta y queda anotado en la bitácora.

**El borrado.** Cancelar el evento en Outlook **no borra la fila**: la sesión
pasa a `anulada`, que es el estado que el resto del sistema ya entiende. Un
clic accidental en un móvil no puede destruir el registro de un trabajo hecho.
Para recuperarla, se le vuelve a poner el estado y el siguiente empujón recrea
el evento.

### Qué NO se toca

Las reuniones propias del consultor. El permiso alcanza al calendario entero,
pero solo se escribe sobre eventos que llevan la propiedad extendida
`OrbitaSesionId`, que pone Órbita al crearlos. Un evento sin esa marca se
ignora en los avisos y no se modifica nunca.

---

## Cuando algo no cuadra

`outlook_bitacora` guarda cada operación: dirección, sesión, acción, resultado
y detalle.

```sql
select momento, direccion, accion, resultado, detalle
from outlook_bitacora order by momento desc limit 50;

-- Sesiones que no consiguen sincronizarse
select id, fecha, hora_inicio, outlook_estado
from tarea_sesiones where outlook_estado = 'error';

-- Suscripciones: cuáles viven y cuáles fallaron
select consultor_id, expira, ultimo_error from outlook_suscripciones;
```

Síntomas frecuentes:

- **403 en todas las llamadas** → falta el consentimiento del administrador, o
  la *Application Access Policy* excluye ese buzón.
- **La suscripción no se crea** → Graph no logró validar la URL de avisos.
  Tiene que responder el `validationToken` en claro y en menos de 10 s; pruébalo
  con `curl "https://…/api/outlook-avisos?validationToken=hola"`, debe devolver
  `hola`.
- **Va la ida pero no la vuelta** → la suscripción caducó. Mira `expira` y
  vuelve a llamar a `/api/outlook-suscripciones`.
- **Todo se paró de golpe una mañana** → caducó el secreto de cliente.
