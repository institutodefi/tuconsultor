"""Genera web/iso-9001-2026/index.html: la landing de campaña de ISO 9001:2026.

Reutiliza cabecera, navegación, pie y scripts de una página existente —así hereda
estilos, analítica, banner de cookies y, sobre todo, el formulario de proyecto,
que se autoinyecta en `.final-cta` y ya envía a /api/contacto (correo + Brevo +
alta del lead en Órbita como cliente potencial)—, y sustituye el <main>, los
metadatos y el JSON-LD.
"""
import io, json, re

RAIZ = '/root/tc/web/'
BASE = 'https://www.tuconsultor.com/iso-9001-2026/'
TITULO = 'ISO 9001:2026: qué cambia y cómo es la transición | TuConsultor'
DESC = ('ISO 9001:2026 ya está publicada y tu certificado dice 2015. Los seis cambios que enumera la norma, '
        'el calendario real y un diagnóstico de transición sin compromiso.')

s = io.open(RAIZ + 'areas/sostenibilidad/iso-14068.html', encoding='utf-8').read()
cabeza = s[:s.index('<main id="main">')]
cola = s[s.index('</main>'):]

cabeza = cabeza.replace('/areas/sostenibilidad/iso-14068.html', '/iso-9001-2026/')
cabeza = re.sub(r'<title>[^<]*</title>', f'<title>{TITULO}</title>', cabeza)
cabeza = cabeza.replace('ISO 14068: consultoría e implantación | TuConsultor', TITULO)
cabeza = cabeza.replace(
    'Hoja de ruta hacia la neutralidad climática: reducción, compensación y declaración conforme a ISO 14068, con evidencias y sin greenwashing.',
    DESC)
# La imagen social de la campaña, que es la que se comparte en LinkedIn.
cabeza = cabeza.replace('https://www.tuconsultor.com/social-img/og-default.png',
                        'https://www.tuconsultor.com/social-img/iso-9001-2026.png')

# Hero propio
hero_viejo_ini = cabeza.index('<header class="hero"')
hero_viejo_fin = cabeza.index('</header>') + len('</header>')
hero = '''<header class="hero" role="banner" style="padding:86px 0 92px">
  <div class="container hero-content">
    <div class="pre-tag">Publicada el 16 de septiembre de 2026</div>
    <h1><span class="strong">ISO 9001:2026 ya está publicada.</span> <span class="accent">Tu certificado dice 2015.</span></h1>
    <p class="sub">No cunde el pánico: tu certificado no caduca porque salga una versión nueva. Pero el reloj
      de la transición ya ha empezado a correr, y conviene saber qué cambia de verdad antes de que te lo
      cuente quien quiera venderte un rediseño completo.</p>
    <div class="hero-actions">
      <a href="#diagnostico" class="btn btn-primary">Diagnóstico de transición</a>
      <a href="/blog/post.html?p=iso-9001-2026-novedades" class="btn btn-orange">Leer el análisis completo</a>
    </div>
    <nav class="tc-breadcrumb" aria-label="breadcrumb"><a href="/">Inicio</a> <span aria-hidden="true">/</span> <span aria-current="page">ISO 9001:2026</span></nav>
  </div>
</header>'''
cabeza = cabeza[:hero_viejo_ini] + hero + cabeza[hero_viejo_fin:]

FAQ = [
 ('¿Mi certificado ISO 9001:2015 deja de valer?',
  'No. Un certificado no caduca porque se publique una versión nueva de la norma. Sigue siendo válido hasta su fecha, y habrá un periodo de transición en el que convivirán las dos versiones.'),
 ('¿Cuánto tiempo tengo para la transición?',
  'El plazo lo fija el IAF, no la norma ni tu consultor, y esa resolución vinculante todavía no está publicada. La expectativa del sector, por el precedente de 2015, es de unos tres años desde la publicación. Cualquier fecha que veas hoy es una previsión, no un dato: confírmala con tu entidad de certificación.'),
 ('¿Tengo que rehacer el sistema?',
  'No. La estructura de diez capítulos es la misma, el enfoque a procesos y el ciclo PHVA siguen igual, y los siete principios no se tocan. Si tu sistema está vivo, la transición es un ajuste. Si lleva dos años dormido, el trabajo no es la transición: es despertarlo.'),
 ('¿Qué es lo que más trabajo da?',
  'Separar riesgos de oportunidades si los llevabas en una sola tabla, añadir a la gestión del cambio el seguimiento de la eficacia y la revisión de resultados, y aterrizar la cultura de la calidad en evidencias comprobables en lugar de en un párrafo de la política.'),
 ('¿Y el cambio climático?',
  'No es una novedad de 2026. Llegó en 2024 con la modificación A1 y lo que hace esta edición es integrarlo en el cuerpo de la norma (4.1 y 4.2). Si ya lo aplicaste, no tienes trabajo nuevo por ahí.'),
 ('¿En qué consiste vuestro diagnóstico de transición?',
  'Una revisión requisito a requisito de tu sistema actual contra la edición de 2026, con el resultado en un documento corto: qué cumples ya, qué hay que tocar y cuánto trabajo es. Sin compromiso y sin vendaje: en sistemas maduros el resultado suele caber en dos folios.'),
]

def carta(num, t, d):
    return (f'<div class="norm-card"><div class="norm-num">{num}</div>'
            f'<h3 class="norm-name">{t}</h3><div class="norm-desc">{d}</div></div>')

seis = ''.join([
  carta('01', 'Términos y definiciones en el capítulo 3',
        'Un número limitado de términos fundamentales de los sistemas de gestión de ISO pasa a estar dentro de la norma. ISO 9000 sigue siendo la referencia del resto del vocabulario.'),
  carta('02', 'Cultura de la calidad y comportamiento ético',
        'Entran en los requisitos: liderazgo (5.1.1), toma de conciencia (7.3) y ambiente para la operación de los procesos (7.1.4). Se auditan por lo que se hace, no por lo que se declara.'),
  carta('03', 'Separación de riesgos y oportunidades',
        'Lo que iba junto se parte en 6.1.2 y 6.1.3, con acciones propias. Y la eficacia de unos y otras se evalúa por separado en el análisis de datos y en la revisión por la dirección.'),
  carta('04', 'Gestión del cambio reforzada',
        'El apartado 6.3 amplía lo que hay que considerar. Lo nuevo: comunicar el cambio, evaluar su eficacia y revisar sus resultados. Planificarlo ya no basta.'),
  carta('05', 'Anexo A ampliado',
        'Aclara estructura, terminología y finalidad de los requisitos, incluidos matices que llevan años generando discusiones en auditoría. Es informativo: no añade ninguna exigencia.'),
  carta('06', 'Anexo B eliminado',
        'Remitía a otras normas del comité ISO/TC 176. Esas referencias están ahora en el anexo A y en la web del propio comité.'),
])

hitos = ''.join(
  f'<div class="how-card"><div class="how-num">{n}</div><h3>{t}</h3><p>{d}</p></div>'
  for n, t, d in [
    ('10 ago 2026', 'CEN aprueba la norma europea',
     'EN ISO 9001:2026 se aprueba sin ninguna modificación sobre el texto de ISO.'),
    ('16 sep 2026', 'Se publica la norma',
     'Sexta edición. Anula y sustituye a ISO 9001:2015 y a su modificación Amd 1:2024. Ya hay versión oficial en español: UNE-EN ISO 9001:2026.'),
    ('Marzo 2027', 'Adopción nacional obligatoria',
     'Los organismos de normalización de los países CEN deben adoptarla y anular las normas nacionales que diverjan antes de finales de marzo de 2027.'),
    ('Por confirmar', 'Fin del periodo de transición',
     'Lo fija el IAF y todavía no está publicado. La previsión del sector es de unos tres años. Hasta entonces, tu certificado de 2015 sigue siendo válido.'),
  ])

faq_html = ''.join(
  f'<details class="faq-item"><summary class="faq-q">{q}<span class="icon">+</span></summary>'
  f'<div class="faq-a">{a}</div></details>' for q, a in FAQ)

main = f'''<main id="main">
<section class="norms" style="padding-top:70px">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Qué cambia</div>
      <h2><span class="strong">Los seis cambios</span> <span class="accent">que enumera la propia norma.</span></h2>
    </div>
    <p style="color:var(--muted);max-width:820px;margin:-8px 0 30px">Ni uno más. Si ves listas de ocho o diez
      «novedades», alguien está contando dos veces o inflando el presupuesto.</p>
    <div class="norms-grid">{seis}</div>
  </div>
</section>

<section class="how">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Contexto normativo</div>
      <h2><span class="strong">El calendario real,</span> <span class="accent">sin fechas inventadas.</span></h2>
    </div>
    <div class="how-grid two">{hitos}</div>
  </div>
</section>

<section class="norms" style="background:var(--cream)">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Lo que no cambia</div>
      <h2><span>Bastante más</span> <span class="accent">de lo que cambia.</span></h2>
    </div>
    <ul class="check-list" style="max-width:820px">
      <li>La <strong>estructura de diez capítulos</strong> es la misma. No hay que reorganizar la documentación.</li>
      <li>El <strong>enfoque a procesos</strong> y el ciclo <strong>PHVA</strong> siguen siendo el armazón.</li>
      <li>Los <strong>siete principios</strong> de la gestión de la calidad se mantienen tal cual.</li>
      <li>La <strong>información documentada</strong> no cambia de lógica: sigue sin haber manual de calidad obligatorio.</li>
      <li>La norma sigue sin exigir uniformidad de estructura ni que uses su terminología dentro de tu organización.</li>
    </ul>
  </div>
</section>

<section class="consultify-band" id="diagnostico">
  <div class="container" style="text-align:center">
    <div class="section-eyebrow" style="justify-content:center">El siguiente paso</div>
    <h2 style="font-size:clamp(28px,3.5vw,40px);letter-spacing:-0.03em;margin-bottom:14px">
      <span class="strong">Diagnóstico de transición</span> <span class="accent">ISO 9001:2026.</span></h2>
    <p style="color:var(--muted);max-width:680px;margin:0 auto 26px">Revisamos tu sistema requisito a requisito
      contra la edición de 2026 y te decimos qué cumples ya, qué hay que tocar y cuánto trabajo es de verdad.
      Sin compromiso. Escríbenos abajo y te contamos.</p>
    <a href="#hablemos" class="btn btn-primary">Pedir el diagnóstico</a>
  </div>
</section>

<section class="faq">
  <div class="container">
    <div class="section-head"><div class="section-eyebrow">Preguntas frecuentes</div>
      <h2><span>Transición a</span> <span class="accent">ISO 9001:2026</span></h2></div>
    <div class="faq-list">{faq_html}</div>
  </div>
</section>

<section class="norms">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Para leer más</div>
      <h2><span>Lo hemos contado</span> <span class="accent">con la norma delante.</span></h2>
    </div>
    <div class="norms-grid">
      <a class="norm-card" href="/blog/post.html?p=iso-9001-2026-novedades" style="display:block"><h3 class="norm-name">El análisis completo</h3><div class="norm-desc">Los seis cambios requisito a requisito, lo que no cambia y qué hacer ahora. Con infografía descargable.</div></a>
      <a class="norm-card" href="/areas/calidad/iso-9001.html" style="display:block"><h3 class="norm-name">ISO 9001</h3><div class="norm-desc">El servicio: implantación, mantenimiento y ahora también transición.</div></a>
      <a class="norm-card" href="/areas/calidad/" style="display:block"><h3 class="norm-name">Calidad y excelencia</h3><div class="norm-desc">El resto del área: EFQM, 13485, 17025, IATF 16949 y más.</div></a>
    </div>
  </div>
</section>
'''

ld = {
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "WebPage", "@id": BASE + "#webpage", "url": BASE, "name": TITULO, "inLanguage": "es-ES",
     "isPartOf": {"@id": "https://www.tuconsultor.com/#website"},
     "about": {"@id": "https://www.tuconsultor.com/#organization"}, "description": DESC},
    {"@type": "BreadcrumbList", "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.tuconsultor.com/"},
      {"@type": "ListItem", "position": 2, "name": "ISO 9001:2026", "item": BASE}]},
    {"@type": "FAQPage", "mainEntity": [
      {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
    {"@type": "Service", "name": "Diagnóstico de transición ISO 9001:2026",
     "serviceType": "Transición ISO 9001:2026", "url": BASE, "description": DESC,
     "provider": {"@id": "https://www.tuconsultor.com/#organization"},
     "areaServed": [{"@type": "Country", "name": "España"}, {"@type": "AdministrativeArea", "name": "Madrid"}]},
  ],
}
cabeza = re.sub(r'<script type="application/ld\+json">.*?</script>',
                '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>',
                cabeza, count=1, flags=re.S)

import os
os.makedirs(RAIZ + 'iso-9001-2026', exist_ok=True)
io.open(RAIZ + 'iso-9001-2026/index.html', 'w', encoding='utf-8').write(cabeza + main + cola)
print('escrito iso-9001-2026/index.html ·', len(cabeza + main + cola), 'bytes')
