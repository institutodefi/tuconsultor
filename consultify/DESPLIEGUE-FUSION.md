# DESPLIEGUE DE LA FUSIÓN · Consultify en la infraestructura de TuConsultor

> Estado: código listo y compilando. BD nueva y vacía en el Supabase de TuConsultor.
> Proyecto Supabase destino: `https://znrbidycakbbfmynbeot.supabase.co`

## 1 · Base de datos (una sola vez)
1. Supabase → SQL Editor → pega y ejecuta `supabase/INSTALACION-TUCONSULTOR.sql`
   (instalación completa: schema + migraciones v22→v51 + consolidado + blog).
   Si el editor protesta por tamaño, corta por los separadores `══` y ejecuta en orden.
2. Authentication → Users → **Add user** → `alejandro@tuconsultor.com` + contraseña
   (marca *Auto Confirm User*). Vuelve a ejecutar el bloque final
   (`admin-alejandro.sql`) para ascenderte a admin/superadmin.
3. Storage: comprueba que existe el bucket `ofertas` (lo crea la migración v25;
   si no aparece, créalo privado con ese nombre).

## 2 · Netlify (sitio de Consultify → consultify.tuconsultor.com)
Site settings → Environment variables:
- `VITE_SUPABASE_URL` = https://znrbidycakbbfmynbeot.supabase.co
- `VITE_SUPABASE_ANON_KEY` = (Supabase → Settings → API → **anon public** del proyecto nuevo)
- `SUPABASE_URL` = https://znrbidycakbbfmynbeot.supabase.co
- `SUPABASE_ANON_KEY` = (la misma anon)
- `SUPABASE_SERVICE_ROLE_KEY` = (Settings → API → **service_role** del proyecto nuevo — solo funciones)
- `BREVO_API_KEY`, `BREVO_LIST_ID`, `BREVO_LIST_DOI_ID` = (las que ya usabas)
- `BREVO_SENDER_EMAIL` = hola@tuconsultor.com  ← dominio ya autenticado en Brevo
- `HOLDED_API_KEY` = (la que ya usabas)

Domain management: añade `consultify.tuconsultor.com` como dominio del sitio
(en Netlify DNS del dominio tuconsultor.com se crea el registro solo).

## 3 · Supabase Auth (URLs de la app)
Authentication → URL Configuration:
- Site URL: `https://consultify.tuconsultor.com/app/`
- Redirect URLs: `https://consultify.tuconsultor.com/app/**`

## 4 · Verificación (fase 6 del traspaso)
- [ ] Login en `https://consultify.tuconsultor.com/app/acceso`
- [ ] Calculadora y generación de oferta (PDF + PPTX)
- [ ] Blog público y RSS (`/blog/rss.xml`)
- [ ] Alta de contacto → llega a Brevo (lista y DOI)
- [ ] Semáforo de cobros (Holded) tras el cron de las 06:00
- [ ] Agenda `.ics` (`/api/agenda-feed`)

## Cambios ya aplicados en el código (este ZIP)
- URLs `consultify.pro` → `consultify.tuconsultor.com` (261 apariciones, 24 archivos)
- Emails unificados a `hola@tuconsultor.com` (remitente validado en Brevo);
  la whitelist de login sigue aceptando @tuconsultor.com y @consultify.pro
- `app/.env` apuntando al Supabase nuevo (falta pegar la anon key)
- Generado `supabase/INSTALACION-TUCONSULTOR.sql` (385 KB, todo en orden)
- Build verificado: `npm run build` ✓

## Datos del Supabase antiguo de Consultify
La BD nueva arranca vacía (con el blog sembrado). Si en el proyecto antiguo
(`ttcnbuxfewmuwbgapmws`) hay datos reales que conservar (clientes, ofertas,
tareas), NO los pierdas: antes de apagar ese proyecto, exporta con
Database → Backups o dímelo y preparo un pg_dump selectivo con remapeo.
