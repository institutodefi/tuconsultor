# -*- coding: utf-8 -*-
"""Batería de pruebas estáticas sobre web/."""
import os, re, json, sys, collections
W='web'; BASE='https://www.tuconsultor.com'
fallos=collections.defaultdict(list); avisos=collections.defaultdict(list)
def F(cat,msg): fallos[cat].append(msg)
def A(cat,msg): avisos[cat].append(msg)

archivos={}
for r,d,fs in os.walk(W):
    for f in fs:
        p=os.path.join(r,f); rel='/'+os.path.relpath(p,W).replace('\\','/')
        archivos[rel]=p
htmls={k:v for k,v in archivos.items() if k.endswith('.html')}
print(f'HTML: {len(htmls)} · ficheros totales: {len(archivos)}')

def st(s): return re.sub(r'\s+',' ',re.sub(r'<[^>]+>','',s)).strip()

titulos=collections.defaultdict(list); descs=collections.defaultdict(list); canons=collections.defaultdict(list)

for rel,p in sorted(htmls.items()):
    h=open(p,encoding='utf-8').read()
    noindex = 'noindex' in h
    if noindex:
        if h.count('<div')!=h.count('</div>'): F('estructura',f'{rel}: <div> desbalanceado')
        continue

    # 1 · estructura
    if h.count('<main')!=h.count('</main>'): F('estructura',f'{rel}: <main> desbalanceado')
    if h.count('<section')!=h.count('</section>'): F('estructura',f'{rel}: <section> desbalanceado')
    if h.count('<div')!=h.count('</div>'): F('estructura',f'{rel}: <div> desbalanceado')
    if not re.search(r'<html lang="[a-z]{2}"',h): F('a11y',f'{rel}: falta lang en <html>')
    h1=re.findall(r'<h1[ >]',h)
    if len(h1)!=1: F('a11y',f'{rel}: {len(h1)} etiquetas h1')
    if 'skip-link' not in h: A('a11y',f'{rel}: sin skip-link')
    if 'id="main"' not in h: F('a11y',f'{rel}: skip-link sin destino #main')

    # 2 · metadatos
    t=re.search(r'<title>(.*?)</title>',h,re.S)
    if not t: F('seo',f'{rel}: sin <title>')
    else:
        tt=st(t.group(1)); titulos[tt].append(rel)
        if len(tt)>70: A('seo',f'{rel}: título {len(tt)} car. ("{tt[:55]}…")')
        if len(tt)<20: A('seo',f'{rel}: título muy corto ({len(tt)})')
    dm=re.search(r'<meta name="description" content="([^"]*)"',h)
    if not dm or not dm.group(1).strip(): F('seo',f'{rel}: sin description')
    else:
        dd=dm.group(1); descs[dd].append(rel)
        if len(dd)>170: A('seo',f'{rel}: description {len(dd)} car.')
    cm=re.search(r'<link rel="canonical" href="([^"]+)"',h)
    if not cm and rel!='/blog/post.html': F('seo',f'{rel}: sin canonical')
    elif cm: canons[cm.group(1)].append(rel)
    if 'msvalidate.01' not in h: F('seo',f'{rel}: sin meta Bing')
    ogi=re.search(r'<meta property="og:image" content="'+re.escape(BASE)+r'([^"]+)"',h)
    if not ogi and 'og:image' not in h: F('seo',f'{rel}: sin og:image')
    elif ogi and ogi.group(1) not in archivos: F('assets',f'{rel}: og:image inexistente {ogi.group(1)}')

    # 3 · hreflang recíproco
    for hl,hr in re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"',h):
        if hr.startswith(BASE):
            ruta=hr[len(BASE):] or '/'
            objetivo=ruta if ruta in archivos else (ruta+'index.html' if ruta.endswith('/') else None)
            if objetivo not in archivos: F('hreflang',f'{rel}: hreflang {hl} → {ruta} no existe')

    # 4 · JSON-LD
    tipos_pag=[]
    for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>',h,re.S):
        try: g=json.loads(m.group(1))
        except Exception as e: F('jsonld',f'{rel}: JSON inválido {e}'); continue
        nodos=g.get('@graph',[g])
        tipos_pag += [n.get('@type') for n in nodos]
        for n in nodos:
            if n.get('@type')=='FAQPage':
                for q in n['mainEntity']:
                    if not q['name'].strip() or not q['acceptedAnswer']['text'].strip():
                        F('jsonld',f'{rel}: FAQ vacía')
                # coherencia FAQ visible vs schema
                vis=len(re.findall(r'class="faq-item"',h))
                if vis and vis!=len(n['mainEntity']):
                    F('jsonld',f'{rel}: {vis} FAQ visibles vs {len(n["mainEntity"])} en schema')

    if tipos_pag and 'WebPage' not in tipos_pag: F('jsonld',f'{rel}: sin WebPage')

    # 5 · enlaces y recursos internos
    for m in re.finditer(r'(?:href|src)="(/[^"]*)"',h):
        u=m.group(1).split('?')[0].split('#')[0]
        if not u: continue
        if u in archivos: continue
        if u.endswith('/') and u+'index.html' in archivos: continue
        if u.startswith(('/api/','/app/','/consultify/','/.netlify')): continue
        F('enlaces',f'{rel} → {u}')

    # 6 · anclas internas
    for m in re.finditer(r'href="#([^"]+)"',h):
        a=m.group(1)
        if a in ('','main'): continue
        if f'id="{a}"' not in h: F('anclas',f'{rel}: ancla #{a} sin destino')

    # 7 · imágenes con alt
    for m in re.finditer(r'<img\b[^>]*>',h):
        if 'alt=' not in m.group(0): F('a11y',f'{rel}: <img> sin alt')

    # 8 · restos de plantilla
    for token in ('{{','TODO:','Lorem ipsum'):  # __SUPABASE lo inyecta build-dist.mjs
        if token in h: F('restos',f'{rel}: contiene "{token}"')

# 9 · duplicados
for t,ps in titulos.items():
    if len(ps)>1: A('duplicados',f'título repetido en {len(ps)}: "{t[:60]}" → {ps[:3]}')
for d,ps in descs.items():
    if len(ps)>1: A('duplicados',f'description repetida en {len(ps)}: {ps[:3]}')
for c,ps in canons.items():
    if len(ps)>1: F('duplicados',f'canonical repetido: {c} en {ps}')

# 10 · CSS: clases nuevas definidas
css=''.join(open(os.path.join(W,f),encoding='utf-8').read() for f in ('estilo-base.css','capas.css','tokens.css'))
for c in ('tc-prose','tc-req','tc-bullets','tc-breadcrumb','tc-bn','tc-bn-input','tc-bn-res',
          'tc-cta-fuerte','tc-cta-caja','tc-cta-btn','tc-ens','tc-ens-fondo','tc-ens-cerrar','tc-ens-no'):
    if '.'+c not in css: F('css',f'clase .{c} usada pero no definida')

# 11 · sitemap
sm=open(os.path.join(W,'sitemap.xml'),encoding='utf-8').read()
locs=re.findall(r'<loc>([^<]+)</loc>',sm)
if len(locs)!=len(set(locs)): F('sitemap','URLs duplicadas')
for l in locs:
    ruta=l[len(BASE):] or '/'
    if ruta not in archivos and (ruta+'index.html') not in archivos:
        F('sitemap',f'URL sin fichero: {l}')
canon_set={c for c in canons}
faltan=canon_set-set(locs)
if faltan: A('sitemap',f'{len(faltan)} canonical no listados en sitemap: {list(faltan)[:3]}')

# 12 · robots / claves
rb=open(os.path.join(W,'robots.txt'),encoding='utf-8').read()
if 'Sitemap:' not in rb: F('robots','robots.txt sin Sitemap')
claves=[k for k in archivos if re.match(r'^/[0-9a-f]{32}\.txt$',k)]
if not claves: F('indexnow','falta el fichero de clave IndexNow')
else:
    k=claves[0]; cont=open(archivos[k],encoding='utf-8').read()
    if cont.strip()!=k[1:-4]: F('indexnow','el contenido de la clave no coincide con el nombre')
if '/BingSiteAuth.xml' not in archivos: F('bing','falta BingSiteAuth.xml')

# 13 · páginas reforzadas
for rel,minimo in [('/areas/ciberseguridad/ens.html',6000),('/areas/ciberseguridad/iso-27001.html',5000),
                   ('/areas/calidad/iso-9001.html',5000),('/areas/sostenibilidad/iso-14001.html',5000)]:
    h=open(archivos[rel],encoding='utf-8').read()
    texto=len(st(re.search(r'<main id="main">(.*?)</main>',h,re.S).group(1)))
    if texto<minimo: F('contenido',f'{rel}: solo {texto} car. de texto en <main>')
    if h.count('tc-cta-fuerte')<2: F('cta',f'{rel}: menos de 2 CTA')
for rel in [k for k in htmls if k.startswith('/areas/ciberseguridad/')]:
    if 'ens-aviso.js' not in open(archivos[rel],encoding='utf-8').read():
        F('popup',f'{rel}: sin aviso ENS')

# ── informe
print()
tot=0
for cat,ms in sorted(fallos.items()):
    tot+=len(ms); print(f'✗ {cat.upper()} · {len(ms)}')
    for m in ms: print('   ',m)
    
for cat,ms in sorted(avisos.items()):
    print(f'⚠ {cat} · {len(ms)}')
    for m in ms[:5]: print('   ',m)
    if len(ms)>5: print(f'    … y {len(ms)-5} más')
print()
print('FALLOS:',tot,'| AVISOS:',sum(len(v) for v in avisos.values()))
