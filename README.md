# TuConsultor · monorepo — UN SOLO DEPLOY

Un repositorio, **un único sitio de Netlify**, dos dominios servidos desde el mismo deploy:

| URL                              | Qué sirve                                     |
|----------------------------------|-----------------------------------------------|
| www.tuconsultor.com              | Web corporativa (204 páginas, `web/`)         |
| consultify.tuconsultor.com       | Landing + blog de Consultify (`/consultify/`) |
| consultify.tuconsultor.com/app/  | App Órbita (React)                            |

El truco: `netlify.toml` (raíz) hace *rewrites por host* — las peticiones al
subdominio se sirven internamente desde la carpeta `/consultify/` del mismo dist.

## Estructura
- `web/` — sitio estático de tuconsultor.com (ES + /en/)
- `consultify/` — public-site + `app/` (React/Vite) + `netlify/functions/` + `supabase/`
- `build-dist.mjs` — ensambla el dist único
- `netlify.toml` — build, funciones, cron de cobros, redirects y headers

## Puesta en marcha (una sola vez)
1. **GitHub**: sube este repo (`git init && git add . && git commit && git push`).
2. **Netlify**: Add new site → Import from GitHub → este repo.
   No toques build settings: se leen del `netlify.toml` raíz.
3. **Variables de entorno** (Site settings → Environment variables):
   ver `consultify/DESPLIEGUE-FUSION.md` (Supabase nuevo, Brevo, Holded).
4. **Dominios** (Domain management): añade `www.tuconsultor.com` (primario),
   `tuconsultor.com` y `consultify.tuconsultor.com`. Con Netlify DNS los
   registros se crean solos.
5. **Supabase**: ejecuta `consultify/supabase/INSTALACION-TUCONSULTOR.sql`
   y configura Auth → URL Configuration con
   `https://consultify.tuconsultor.com/app/`.

Cada push a `main` = un solo build = los dos dominios actualizados.
