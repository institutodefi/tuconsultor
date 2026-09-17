"""Genera /en/blog/, /fr/blog/, /de/blog/ y /ar/blog/ a partir del blog español.

El blog vive en Supabase, no en ficheros, así que una versión en otro idioma es
la misma página apuntando a la vista `blog_publico` con `idioma=eq.XX`. Lo que
cambia de verdad es poco: la consulta, el idioma del documento, los textos de
interfaz, las rutas de los enlaces y los metadatos.

Se genera desde el original en lugar de mantener cinco copias a mano, que es
como se acaba con cuatro blogs distintos y uno actualizado.
"""
import io, json, os, re

RAIZ = '/root/tc/web/'

T = {
  'en': {
    'lang': 'en-GB', 'dir': 'ltr',
    'h1a': 'The blog.', 'h1b': 'A new article every day.',
    'desc': "TuConsultor's blog: management standards, the EFQM Model and excellence, with a new article every day.",
    'titulo': 'Blog · TuConsultor', 'mas': 'Load more articles', 'volver': '← Back to the blog',
    'inicio': 'Home', 'elblog': 'The blog', 'serieEfqm': 'EFQM Model series · ', 'serieNormas': 'Management standards · ',
    'noPub': 'This article is not available in English yet.', 'volverCorto': 'Back to the blog',
    'locale': 'en_GB', 'nav': '/en/',
  },
  'fr': {
    'lang': 'fr-FR', 'dir': 'ltr',
    'h1a': 'Le blog.', 'h1b': 'Un article chaque jour.',
    'desc': "Le blog de TuConsultor : normes de management, Modèle EFQM et excellence, avec un nouvel article chaque jour.",
    'titulo': 'Blog · TuConsultor', 'mas': "Charger plus d'articles", 'volver': '← Retour au blog',
    'inicio': 'Accueil', 'elblog': 'Le blog', 'serieEfqm': 'Série Modèle EFQM · ', 'serieNormas': 'Normes de management · ',
    'noPub': "Cet article n'est pas encore disponible en français.", 'volverCorto': 'Retour au blog',
    'locale': 'fr_FR', 'nav': '/fr/',
  },
  'de': {
    'lang': 'de-DE', 'dir': 'ltr',
    'h1a': 'Der Blog.', 'h1b': 'Jeden Tag ein Artikel.',
    'desc': 'Der Blog von TuConsultor: Managementnormen, EFQM-Modell und Excellence, mit einem neuen Artikel jeden Tag.',
    'titulo': 'Blog · TuConsultor', 'mas': 'Mehr Artikel laden', 'volver': '← Zurück zum Blog',
    'inicio': 'Start', 'elblog': 'Der Blog', 'serieEfqm': 'Reihe EFQM-Modell · ', 'serieNormas': 'Managementnormen · ',
    'noPub': 'Dieser Artikel ist noch nicht auf Deutsch verfügbar.', 'volverCorto': 'Zurück zum Blog',
    'locale': 'de_DE', 'nav': '/de/',
  },
  'ar': {
    'lang': 'ar', 'dir': 'rtl',
    'h1a': 'المدونة.', 'h1b': 'مقال جديد كل يوم.',
    'desc': 'مدونة TuConsultor: معايير الإدارة ونموذج EFQM والتميّز، بمقال جديد كل يوم.',
    'titulo': 'المدونة · TuConsultor', 'mas': 'تحميل مزيد من المقالات', 'volver': '→ العودة إلى المدونة',
    'inicio': 'الرئيسية', 'elblog': 'المدونة', 'serieEfqm': 'سلسلة نموذج EFQM · ', 'serieNormas': 'معايير الإدارة · ',
    'noPub': 'هذا المقال غير متوفر بالعربية بعد.', 'volverCorto': 'العودة إلى المدونة',
    'locale': 'ar', 'nav': '/ar/',
  },
}

LOCALE_JS = {'en': 'en-GB', 'fr': 'fr-FR', 'de': 'de-DE', 'ar': 'ar'}

idx_es = io.open(RAIZ + 'blog/index.html', encoding='utf-8').read()
post_es = io.open(RAIZ + 'blog/post.html', encoding='utf-8').read()


def comun(s, code, t):
    """Cambios que valen para las dos páginas."""
    base = f'https://www.tuconsultor.com/{code}/blog/'
    s = s.replace('<html lang="es">', f'<html lang="{code}" dir="{t["dir"]}">')
    # Rutas: primero las del blog, luego el resto de enlaces internos del sitio.
    s = s.replace('https://www.tuconsultor.com/blog/', base)
    s = s.replace('href="/blog/', f'href="/{code}/blog/')
    s = s.replace("location.href = '/blog/'", f"location.href = '/{code}/blog/'")
    s = s.replace("'/blog/post.html?p='", f"'/{code}/blog/post.html?p='")
    s = s.replace('/blog/post.html?p=', f'/{code}/blog/post.html?p=')
    for ruta in ('/consultoria-estrategica.html', '/consultoria-como-servicio.html', '/formacion.html',
                 '/servicios-tecnologicos.html', '/contacto.html', '/quienes-somos.html', '/areas/',
                 '/sistemas-de-gestion.html', '/servicios/consultify.html'):
        s = s.replace(f'href="{ruta}"', f'href="/{code}{ruta}"')
    s = s.replace('<a href="/" class="nav-logo">', f'<a href="/{code}/" class="nav-logo">')
    s = s.replace('"inLanguage":"es-ES"', f'"inLanguage":"{t["lang"]}"')
    s = s.replace('content="es_ES"', f'content="{t["locale"]}"')
    s = s.replace('"name":"Inicio"', f'"name":"{t["inicio"]}"')
    s = s.replace('"https://www.tuconsultor.com/"', f'"https://www.tuconsultor.com/{code}/"')
    # La consulta pasa a la vista multiidioma.
    s = s.replace('/rest/v1/blog_tuconsultor?', f'/rest/v1/blog_publico?idioma=eq.{code}&')
    s = s.replace("toLocaleDateString('es-ES'", f"toLocaleDateString('{LOCALE_JS[code]}'")
    return s


for code, t in T.items():
    destino = f'{RAIZ}{code}/blog'
    os.makedirs(destino, exist_ok=True)

    # ── Índice ──
    s = comun(idx_es, code, t)
    s = s.replace('<title>Blog · TuConsultor</title>', f'<title>{t["titulo"]}</title>')
    s = s.replace('El blog de TuConsultor: normas de gestión, Modelo EFQM y excelencia, con un artículo nuevo cada día.', t['desc'])
    s = s.replace('<h1><span class="strong">El blog.</span> <span class="accent">Un artículo cada día.</span></h1>',
                  f'<h1><span class="strong">{t["h1a"]}</span> <span class="accent">{t["h1b"]}</span></h1>')
    s = s.replace('Cargar más artículos', t['mas'])
    s = s.replace('"name":"El blog"', f'"name":"{t["elblog"]}"')
    s = s.replace('"name":"Blog · TuConsultor"', f'"name":"{t["titulo"]}"')
    io.open(f'{destino}/index.html', 'w', encoding='utf-8').write(s)

    # ── Artículo ──
    s = comun(post_es, code, t)
    s = s.replace('← Volver al blog', t['volver'])
    s = s.replace('Este artículo aún no está publicado. <a href="/blog/">Vuelve al blog</a>.',
                  f'{t["noPub"]} <a href="/{code}/blog/">{t["volverCorto"]}</a>.')
    s = s.replace(f'Este artículo aún no está publicado. <a href="/{code}/blog/">Vuelve al blog</a>.',
                  f'{t["noPub"]} <a href="/{code}/blog/">{t["volverCorto"]}</a>.')
    s = s.replace("'Serie Modelo EFQM · '", f"'{t['serieEfqm']}'")
    s = s.replace("'Normas de gestión · '", f"'{t['serieNormas']}'")
    s = s.replace('"name":"El blog. Un artículo cada día"', f'"name":"{t["elblog"]}"')
    s = s.replace('"name":"Blog · TuConsultor"', f'"name":"{t["titulo"]}"')
    s = s.replace("' · Blog TuConsultor'", "' · Blog TuConsultor'")
    io.open(f'{destino}/post.html', 'w', encoding='utf-8').write(s)
    print(f'✓ /{code}/blog/  (index + post)')

# ── Enlaces alternos entre idiomas, para SEO ────────────────────────────────
alt = ''.join(
  f'<link rel="alternate" hreflang="{c}" href="https://www.tuconsultor.com/{"" if c == "es" else c + "/"}blog/" />\n'
  for c in ['es', 'en', 'fr', 'de', 'ar'])
alt += '<link rel="alternate" hreflang="x-default" href="https://www.tuconsultor.com/blog/" />\n'

for ruta in ['blog/index.html'] + [f'{c}/blog/index.html' for c in T]:
    p = RAIZ + ruta
    s = io.open(p, encoding='utf-8').read()
    if 'hreflang="x-default" href="https://www.tuconsultor.com/blog/"' in s:
        continue
    s = s.replace('</head>', alt + '</head>', 1)
    io.open(p, 'w', encoding='utf-8').write(s)
print('✓ hreflang cruzado en los cinco índices')
