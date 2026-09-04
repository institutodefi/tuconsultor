# Copias de seguridad · las dos vías

Hay dos mecanismos, y hacen cosas distintas. Conviene tener los dos, pero por
razones diferentes.

---

## 1 · PITR de Supabase — la que de verdad recupera

**Qué es.** Recuperación a un punto en el tiempo. Supabase guarda el registro de
transacciones (WAL) y permite volver a *cualquier* instante del periodo
contratado, con granularidad de **dos minutos** — mejor que los diez que pediste.

**Por qué es la primera opción.** Si alguien borra 300 empresas a las 11:07,
con PITR vuelves a las 11:06 y no pierdes nada más. Con volcados cada 10 minutos
perderías hasta 10 minutos de trabajo *de todas las tablas*, no solo de la que
se estropeó.

**Cómo se activa.** No se puede hacer desde el código: es del panel.

1. Requiere plan **Pro** o superior.
2. Panel de Supabase → *Database* → *Backups* → pestaña **Point in Time Recovery**.
3. Activar el complemento y elegir la ventana de retención (7, 14 o 28 días).
   Cada tramo tiene su precio: mira el importe antes de confirmar.
4. Con PITR activo, las copias diarias dejan de ser lo relevante: la ventana
   continua las cubre.

**Para restaurar.** Mismo sitio → *Restore* → se indica fecha y hora. La
restauración **sustituye** la base de datos: no es una copia paralela. Practícalo
una vez en un proyecto de pruebas antes de necesitarlo de verdad.

---

## 2 · Volcado programado cada 10 minutos — la que te saca de Supabase

**Qué es.** `netlify/functions/copia-seguridad.mjs`, que se ejecuta sola cada
10 minutos y guarda un JSON comprimido de todas las tablas en el bucket `copias`
de Supabase Storage.

**Por qué, si ya hay PITR.** Cubre lo que el PITR no cubre: que el problema esté
*en* Supabase (cuenta suspendida, error del proveedor, borrado del proyecto), o
que necesites un fichero portable para llevártelo a otro sitio o entregárselo a
alguien.

**Qué hace de listo.** Tres cosas que evitan que esto se vaya de las manos:

- **No escribe si nada ha cambiado.** Calcula una huella SHA-256 del contenido y
  la compara con la anterior. En un fin de semana sin actividad, 288 ejecuciones
  no generan ni un fichero.
- **Rota.** Conserva todas las copias de las últimas 48 horas y a partir de ahí
  una diaria durante 90 días. Sin esto, 144 copias al día llenan el bucket en un mes.
- **Aguanta tablas que no existen.** Si una migración no está aplicada, anota el
  fallo y sigue con el resto en vez de abortar.

### Puesta en marcha

1. **Bucket.** Supabase → *Storage* → *New bucket* → nombre `copias`,
   **privado** (sin acceso público, es la base de datos entera).
2. **Variables en Netlify** → *Site configuration* → *Environment variables*:
   - `SUPABASE_URL` (ya la tienes)
   - `SUPABASE_SERVICE_ROLE_KEY` → la clave **service_role**, no la anon.
     Está en Supabase → *Settings* → *API*.
3. **Redespliega.** Las funciones programadas se registran en el despliegue: sin
   uno nuevo, el cron no existe.
4. **Comprueba.** Netlify → *Logs* → *Functions* → `copia-seguridad`. Debería
   aparecer una ejecución cada 10 minutos con un JSON de resumen.

### Sobre la clave de servicio

La función usa `service_role`, que **se salta la seguridad de fila a propósito**:
una copia parcial no es una copia. Eso implica que esa clave da acceso total a la
base de datos. Nunca debe estar en el navegador ni en el repositorio, solo en las
variables de entorno de Netlify. Si alguna vez se filtra, se rota desde el panel
de Supabase.

### Restaurar desde un volcado

No hay botón: es un JSON. El procedimiento es leer el fichero y reinsertar por
tabla respetando el orden de las claves ajenas (`perfiles` → `empresas` →
`contactos` → `empresa_contactos` → el resto). Es trabajoso a propósito: si
necesitas restaurar rápido, la vía es el PITR. Esto es el paracaídas de reserva.

---

## Qué usar en cada caso

| Situación | Vía |
|---|---|
| Borrado accidental de datos | **PITR**, vuelves al minuto anterior |
| Migración que sale mal | **PITR** |
| Necesitas los datos fuera de Supabase | **Volcado** |
| Problema con la cuenta o el proveedor | **Volcado** |
| Entregar los datos a un tercero | **Volcado** |
| Auditoría: demostrar que hay copias | Las dos, y el registro de ejecuciones de Netlify |

**Y una cosa que conviene fijar por escrito:** una copia que nunca se ha
restaurado no es una copia, es una suposición. Prueba una restauración al año y
anótala en el backlog de versiones.
