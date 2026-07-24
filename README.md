# TuConsultor · monorepo web

Un solo repositorio, dos sitios de Netlify:

| Carpeta       | Sitio Netlify                | Dominio                        |
|---------------|------------------------------|--------------------------------|
| `web/`        | tuconsultor-web (estático)   | www.tuconsultor.com            |
| `consultify/` | consultify (app + funciones) | consultify.tuconsultor.com     |

## Conectar en Netlify (cada sitio una vez)
1. **Sitio estático** — Add new site → Import from GitHub → este repo →
   Base directory: `web` · Build command: *(vacío)* · Publish directory: `web`
2. **Consultify** — Add new site → Import from GitHub → este repo →
   Base directory: `consultify` (Netlify leerá `consultify/netlify.toml`:
   build de la app React + funciones). Configura las variables de entorno
   según `consultify/DESPLIEGUE-FUSION.md`.

Con esto, cada push a `main` despliega los dos sitios; Netlify solo
reconstruye el que tenga cambios en su carpeta si activas
"Ignore builds" por directorio (opcional).

## Estructura
- `web/` — 204 páginas HTML estáticas (ES + /en/), CSS único, sitemap.
  Generadores Python del sitio en el histórico de trabajo (no necesarios para desplegar).
- `consultify/` — `public-site/` (landing), `app/` (React/Vite, zona Órbita),
  `netlify/functions/` (serverless), `supabase/` (SQL, incl. INSTALACION-TUCONSULTOR.sql).
