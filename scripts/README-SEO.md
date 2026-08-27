# Rutina SEO por versión

## 1 · Antes de empaquetar: regenerar el sitemap

```bash
python3 scripts/seo-sitemap.py
```

Compara el contenido de cada página con `web/.seo-manifest.json` y solo mueve el
`lastmod` de las que han cambiado de verdad. **El manifiesto tiene que viajar en
el ZIP**: si se pierde, la siguiente ejecución marca las 300 páginas como nuevas
y el `lastmod` deja de significar nada.

Salida esperada en una versión normal: unas pocas decenas de URLs modificadas,
no 300.

## 2 · Tras desplegar: IndexNow (Bing, Yandex, Naver, Seznam)

Google no participa en el protocolo. Esto cubre a Bing y, por herencia de su
índice, a DuckDuckGo y Yahoo.

**Configuración, una sola vez:**

1. Netlify → Site configuration → Environment variables:
   - `INDEXNOW_KEY` = `1cebb014fb74fc8f9c449b2bd8698b5e`
   - `INDEXNOW_TOKEN` = un secreto cualquiera, solo para envíos manuales
2. Comprueba que la clave se sirve:
   `curl https://www.tuconsultor.com/1cebb014fb74fc8f9c449b2bd8698b5e.txt`
   Debe devolver la clave en texto plano, sin saltos ni HTML.
3. Netlify → Notifications → Add notification → **Outgoing webhook**
   - Evento: *Deploy succeeded*
   - URL: `https://www.tuconsultor.com/api/indexnow`

A partir de ahí, cada despliegue notifica automáticamente las URLs cambiadas.

**Envío manual de URLs concretas:**

```bash
curl -X POST https://www.tuconsultor.com/api/indexnow \
  -H "content-type: application/json" \
  -H "x-indexnow-token: $INDEXNOW_TOKEN" \
  -d '{"urls":["https://www.tuconsultor.com/areas/sostenibilidad/iso-20121.html"]}'
```

## 3 · Tras desplegar: Google

No hay push instantáneo para páginas normales. La Indexing API existe pero está
oficialmente limitada a `JobPosting` y `BroadcastEvent`; usarla para landings de
normas incumple sus condiciones y no merece el riesgo.

Lo que sí se automatiza:

```bash
npm i googleapis
export GOOGLE_APPLICATION_CREDENTIALS=/ruta/credenciales.json

node scripts/gsc-estado.mjs sitemap           # reenvía el sitemap
node scripts/gsc-estado.mjs inspeccionar 40   # audita indexación
```

Necesita una cuenta de servicio de Google Cloud con la Search Console API
activada y añadida como **propietario** de la propiedad en Search Console.
La URL Inspection API es de solo lectura, con cuota de 2.000 consultas al día.

Para páginas nuevas e importantes (como ISO 20121), sigue siendo más rápido
el botón *Solicitar indexación* de la interfaz de Search Console.

## 4 · Bing

- Verificación: `BingSiteAuth.xml` en la raíz + meta `msvalidate.01` en las 305 páginas.
- Bing Webmaster Tools → Sitemaps → enviar `https://www.tuconsultor.com/sitemap.xml`.
- **URL Submission** de Bing tiene cuota diaria mucho más generosa que Google:
  úsala sin miedo para las landings nuevas.
