#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera web/sitemap.xml con <lastmod> REAL por página.

En lugar de poner la fecha de hoy en las 300 URLs (señal que Google descarta si
detecta que no se corresponde con cambios reales), guarda un manifiesto con el
hash del contenido significativo de cada página. El lastmod solo avanza cuando
el contenido cambia de verdad.

Efecto secundario buscado: la función /api/indexnow envía únicamente las URLs
cuyo lastmod coincide con la fecha más reciente del sitemap, es decir, lo que
ha cambiado en esta versión. Sin lastmod fiable, IndexNow enviaría las 300 en
cada despliegue y los buscadores dejarían de hacerle caso.

Uso:  python3 scripts/seo-sitemap.py
Manifiesto: web/.seo-manifest.json  (debe viajar en el ZIP y versionarse)
"""
import os, re, json, hashlib, datetime

W = 'web'
BASE = 'https://www.tuconsultor.com'
MANIFEST = os.path.join(W, '.seo-manifest.json')
HOY = datetime.date.today().isoformat()

# Lo que NO cuenta como cambio de contenido: cache busting, nada más por ahora.
RUIDO = [
    (re.compile(r'\?v=\d+'), ''),
]

def huella(html: str) -> str:
    """Hash del <head> relevante + <main>, ignorando ruido de versionado."""
    cuerpo = ''
    m = re.search(r'<main\b[^>]*>(.*?)</main>', html, re.S)
    if m:
        cuerpo = m.group(1)
    else:
        m = re.search(r'<body\b[^>]*>(.*?)</body>', html, re.S)
        cuerpo = m.group(1) if m else html
    t = re.search(r'<title>(.*?)</title>', html, re.S)
    d = re.search(r'<meta name="description" content="([^"]*)"', html)
    j = ''.join(re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S))
    txt = (t.group(1) if t else '') + (d.group(1) if d else '') + j + cuerpo
    for rx, rep in RUIDO:
        txt = rx.sub(rep, txt)
    txt = re.sub(r'\s+', ' ', txt)
    return hashlib.sha256(txt.encode('utf-8')).hexdigest()[:16]

def prioridad(rel: str):
    if rel == 'index.html':
        return '1.0', 'weekly'
    if rel in ('sistemas-de-gestion.html', 'consultoria-estrategica.html',
               'consultoria-como-servicio.html', 'servicios-tecnologicos.html', 'formacion.html'):
        return '0.9', 'weekly'
    if '/areas/' in '/' + rel or rel.startswith('areas/'):
        return '0.8', 'monthly'
    if rel.startswith('legal/') or rel == 'accesibilidad.html':
        return '0.3', 'yearly'
    return '0.6', 'monthly'

def main():
    try:
        prev = json.load(open(MANIFEST, encoding='utf-8'))
    except Exception:
        prev = {}
    nuevo, urls = {}, []
    nuevas = cambiadas = 0

    for root, _, files in os.walk(W):
        for fn in sorted(files):
            if not fn.endswith('.html'):
                continue
            p = os.path.join(root, fn)
            rel = os.path.relpath(p, W).replace('\\', '/')
            html = open(p, encoding='utf-8').read()
            if 'noindex' in html:
                continue
            m = re.search(r'<link rel="canonical" href="([^"]+)"', html)
            loc = m.group(1) if m else BASE + '/' + rel.replace('index.html', '')
            h = huella(html)
            antes = prev.get(rel)
            if antes is None:
                lastmod = HOY; nuevas += 1
            elif antes['hash'] != h:
                lastmod = HOY; cambiadas += 1
            else:
                lastmod = antes['lastmod']
            nuevo[rel] = {'hash': h, 'lastmod': lastmod, 'loc': loc}
            alts = re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', html)
            pr, cf = prioridad(rel)
            urls.append((loc, lastmod, cf, pr, alts))

    vistas, salida = set(), []
    for loc, lastmod, cf, pr, alts in urls:
        if loc in vistas:
            continue
        vistas.add(loc)
        s = f'  <url>\n    <loc>{loc}</loc>\n    <lastmod>{lastmod}</lastmod>\n'
        s += f'    <changefreq>{cf}</changefreq>\n    <priority>{pr}</priority>\n'
        for hl, hr in alts:
            s += f'    <xhtml:link rel="alternate" hreflang="{hl}" href="{hr}"/>\n'
        salida.append(s + '  </url>\n')

    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + ''.join(salida) + '</urlset>\n')
    open(os.path.join(W, 'sitemap.xml'), 'w', encoding='utf-8').write(xml)
    json.dump(nuevo, open(MANIFEST, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)

    hoy = sum(1 for u in salida if f'<lastmod>{HOY}</lastmod>' in u)
    print(f'sitemap.xml · {len(salida)} URLs')
    print(f'  nuevas: {nuevas} · modificadas: {cambiadas} · sin cambios: {len(nuevo)-nuevas-cambiadas}')
    print(f'  con lastmod de hoy ({HOY}) → IndexNow enviará {hoy} URLs')

if __name__ == '__main__':
    main()
