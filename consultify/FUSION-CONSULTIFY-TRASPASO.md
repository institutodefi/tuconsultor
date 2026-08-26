# Traspaso para fusionar Consultify con la web de TuConsultor

> **Para la instancia de Claude que gestiona la web de TuConsultor.**
> Este documento describe el proyecto **Consultify** (que se adjunta completo en este ZIP)
> para que puedas fusionarlo con TuConsultor sin romper datos ni funcionalidad.
> Léelo entero antes de proponer ningún SQL de fusión.

---

## 0. Contexto y objetivo

- **consultify.pro** ya redirige (301) a **consultify.tuconsultor.com** (subdominio).
- El objetivo del usuario (Alejandro) es **fusionar Consultify dentro de la infraestructura de TuConsultor**: mismo Netlify y **mismo Supabase**.
- Decisión tomada por el usuario: **Camino B — una sola base de datos** (la de TuConsultor). Es la opción con más riesgo; hay que hacerla por fases y con diagnóstico previo.

**Lo que NO se debe hacer:** ejecutar un SQL de fusión a ciegas. Primero hay que comparar las tablas de ambos proyectos y detectar choques de nombres. Este documento te da el lado de Consultify; te falta el lado de TuConsultor (pídeselo al usuario con las consultas del punto 5).

---

## 1. Qué es Consultify

Plataforma de consultoría de gestión (ISO) para TuConsultor. Stack: **React + Vite + Tailwind + Supabase + Netlify + Brevo**. Tiene:
- Una **web pública** (landing, blog, páginas legales) en `public-site/`.
- Una **app React** (zona interna, marca "Órbita") en `app/`, servida bajo base `/app/`.
- **Funciones serverless** en `netlify/functions/`.

La zona interna se llama comercialmente **Órbita** (login en `/app/acceso`), con dos perfiles: equipo (consultores) y clientes.

---

## 2. Modelo de datos de Consultify (tablas en su Supabase actual)

**Tablas CORE (schema.sql):**
| Tabla | Descripción | ¿Choca con TuConsultor? |
|---|---|---|
| `perfiles` | Usuarios/roles (superadmin, admin, consultor, gestion, cliente). Ligada a `auth.users` | **MUY PROBABLE** |
| `clientes` | Clientes (empresa, CIF, contacto, datos Holded/Brevo, cobros) | **PROBABLE** |
| `consultores` | Miembros del equipo | Posible |
| `presupuestos` | Ofertas/presupuestos generados | Posible |
| `proyectos` | Proyectos de cliente | **PROBABLE** |
| `normas_catalogo` | Catálogo de normas ISO | Poco probable |

**Tablas CRM nuevas (migración v48):**
| Tabla | Descripción |
|---|---|
| `empresas` | Empresas (es_cliente / es_proveedor) |
| `contactos` | Personas (con consentimiento RGPD + Brevo) |
| `empresa_contactos` | Puente N:M empresa↔contacto |

**Tablas de procesos (migraciones v50/v51):**
`procesos_bandas`, `procesos_internos`, `procesos_subprocesos`, `procesos_riesgos`

**Otras:** `blog_posts`, `cliente_contactos`, `cliente_empresas`, `cliente_tareas`, `empresa_centros`, `empresa_normas`, `proyectos_cliente`, `solicitudes_brochure`.

⚠️ **Nombres genéricos con altísimo riesgo de choque:** `perfiles`, `clientes`, `contactos`, `empresas`, `proyectos`, `blog_posts`. Si TuConsultor tiene tablas con estos nombres, **NO se pueden fusionar sin más** — hay que decidir: (a) renombrar las de Consultify con prefijo `cons_`, o (b) mapear/mezclar registros con cuidado (remapeando FKs e IDs).

---

## 3. Cómo se instala el schema de Consultify (orden OBLIGATORIO)

Las migraciones deben ejecutarse **en orden**. El estado actual de la BD de Consultify:
1. `supabase/schema.sql` — tablas core.
2. `supabase/INSTALL_COMPLETO.sql` — instalación completa (si se parte de cero).
3. Migraciones `supabase/migracion-vNN-*.sql` **en orden numérico** (v43 → v51).
4. Seeds: `seed-blog-2026.sql`, `seed-tareas.sql`.

**Migraciones que el usuario puede NO haber ejecutado aún** (confírmalo con él):
- **v48** (empresas/contactos) — el usuario dijo "no sé de qué migración me hablas", así que **probablemente NO está aplicada**.
- **v50** (bandas + riesgos de procesos) y **v51** (fases) — pendientes de confirmar.

Esto importa para la fusión: si esas tablas no existen todavía en Consultify, al fusionar hay que crearlas directamente en el Supabase destino (TuConsultor).

---

## 4. Autenticación — el punto MÁS delicado

Consultify usa **Supabase Auth** (`auth.users`) + tabla `perfiles` (con `id` = auth.uid(), `rol`, `activo`).
Las políticas RLS de casi todas las tablas comprueban:
```sql
exists (select 1 from public.perfiles p where p.id = auth.uid() and p.activo and p.rol in (...))
```
**Si TuConsultor tiene su propio sistema de usuarios/perfiles**, fusionar significa unificar identidades. Riesgos:
- Dos usuarios distintos con el mismo email en cada proyecto.
- Roles con nombres distintos (Consultify usa: `superadmin, admin, consultor, gestion, cliente`).
- Las RLS de Consultify romperían si la tabla `perfiles` cambia de forma.

**Recomendación:** decidir primero la estrategia de auth. Si ambos usan Supabase Auth del MISMO proyecto destino, los `auth.users` se unifican solos; solo hay que consolidar la tabla de perfiles/roles.

---

## 5. Consultas de diagnóstico que debes pedir al usuario

Antes de escribir el SQL de fusión, pídele que ejecute esto en el **Supabase de TuConsultor** y te traiga el resultado:

```sql
-- A. Todas las tablas de TuConsultor (para detectar choques con la lista del punto 2)
select table_name from information_schema.tables
where table_schema='public' order by table_name;

-- B. Estructura de usuarios/perfiles de TuConsultor
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('perfiles','profiles','usuarios','users','roles')
order by table_name, ordinal_position;

-- C. Si tiene tablas que chocan, ver sus columnas para comparar
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public'
  and table_name in ('clientes','contactos','empresas','proyectos','blog_posts')
order by table_name, ordinal_position;
```

Con A+B+C podrás construir el mapa de choques y decidir renombrar vs. mezclar.

---

## 6. Estrategia de fusión recomendada (por fases)

**Fase 0 — Backup.** Que el usuario haga un backup del Supabase de TuConsultor ANTES de nada (Supabase → Database → Backups, o `pg_dump`). Irreversible sin esto.

**Fase 1 — Diagnóstico.** Ejecutar las consultas del punto 5. Construir la lista de choques.

**Fase 2 — Renombrar para evitar colisiones.** Lo más seguro: importar las tablas de Consultify con prefijo (p.ej. `cons_clientes`, `cons_perfiles`…) SALVO que se decida mezclar registros. Actualizar el código de Consultify para que apunte a los nuevos nombres (buscar/reemplazar en `app/src/lib/` y `netlify/functions/`).

**Fase 3 — Migrar datos.** `pg_dump` selectivo de las tablas de Consultify → restaurar en el destino con los nombres nuevos. Remapear FKs si se mezclan usuarios.

**Fase 4 — Unificar auth.** Consolidar perfiles/roles.

**Fase 5 — Código y dominio.** Ajustar variables de entorno (SUPABASE_URL/ANON_KEY al proyecto de TuConsultor), y las URLs `consultify.pro` → `consultify.tuconsultor.com` (ver punto 7).

**Fase 6 — Verificar.** Login, ofertas, blog, procesos, Brevo, cobros.

---

## 7. URLs y emails a actualizar en el código (independiente de la BD)

Hay **~154 apariciones de `consultify.pro`** en el código (HTML, funciones, JSX). La mayoría son URLs `https://consultify.tuconsultor.com/...` (canonical, blog, og-image, RSS) que deberían pasar a `https://consultify.tuconsultor.com/...`.

⚠️ **Inconsistencia de email detectada:** conviven `hola@tuconsultor.com` (en index.html, ClientePortal, funciones de envío) y `hola@tuconsultor.com` (en páginas legales). Antes de reemplazar, el usuario debe decidir el email único (recomendado: `hola@tuconsultor.com`, que probablemente ya está verificado en Brevo). **No reemplazar en masa sin confirmar esto** — afecta al remitente de los correos (si el remitente no está verificado en Brevo, los correos no salen).

Archivos con URLs a revisar: `public-site/index.html`, `public-site/blog/*`, `public-site/orbita.html`, `public-site/legal/aviso-legal.html`, `netlify.toml`, y funciones `blog-rss.mjs`, `agenda-feed.mjs`, `documento-oferta-premium.mjs`, `generar-oferta.mjs`, `solicitar-brochure.mjs`, `admin-usuarios.mjs`.

---

## 8. Variables de entorno de Consultify (Netlify)

Al mover a la infraestructura de TuConsultor, reconfigurar en Netlify:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` → al proyecto Supabase destino.
- `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_LIST_DOI_ID`, `BREVO_SENDER_EMAIL`.
- `HOLDED_API_KEY` (semáforo de cobros).
- Las de la app (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

---

## 9. Resumen para el que reciba esto

1. **No fusiones a ciegas.** Pide las consultas del punto 5 primero.
2. **Haz backup** del Supabase de TuConsultor antes de tocar nada.
3. **Los nombres genéricos chocan** (`perfiles`, `clientes`, `contactos`, `empresas`, `proyectos`, `blog_posts`) — decide renombrar o mezclar.
4. **Auth es lo más delicado** — unifica identidades con cuidado.
5. **El código y las URLs** se actualizan aparte de la BD.
6. **Ve por fases y verifica** en cada una.

El proyecto completo de Consultify está en este ZIP. Las migraciones SQL están en `supabase/`. El código de la app en `app/src/`. Las funciones en `netlify/functions/`.
