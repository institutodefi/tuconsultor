"""Genera areas/sostenibilidad/iso-53001.html a partir del esqueleto de iso-14068.

La página nueva reutiliza cabecera, navegación, pie y scripts de una página del
mismo área —así hereda estilos, analítica y widgets sin copiarlos a mano— y
sustituye el <main>, los metadatos y el JSON-LD por los de ISO/UNDP 53001.
"""
import io, json, re

RUTA = '/root/tc/web/areas/sostenibilidad/'
BASE = 'https://www.tuconsultor.com/areas/sostenibilidad/iso-53001.html'
TITULO = 'ISO 53001: consultoría e implantación | TuConsultor'
DESC = ('Sistema de gestión de los Objetivos de Desarrollo Sostenible según ISO/UNDP 53001. '
        'Priorizamos los ODS pertinentes, montamos la gobernanza y dejamos evidencias auditables.')

s = io.open(RUTA + 'iso-14068.html', encoding='utf-8').read()

# ── Cabecera y pie del esqueleto ────────────────────────────────────────────
cabeza = s[:s.index('<main id="main">')]
cola = s[s.index('</main>'):]

# Metadatos: todo lo que nombra a la 14068 pasa a la 53001.
cabeza = cabeza.replace('iso-14068.html', 'iso-53001.html')
cabeza = re.sub(r'<title>[^<]*</title>', f'<title>{TITULO}</title>', cabeza)
cabeza = cabeza.replace('ISO 14068: consultoría e implantación | TuConsultor', TITULO)
cabeza = cabeza.replace(
    'Hoja de ruta hacia la neutralidad climática: reducción, compensación y declaración conforme a ISO 14068, con evidencias y sin greenwashing.',
    DESC)
cabeza = cabeza.replace('<h1><span class="strong">ISO 14068.</span> <span class="accent">Neutralidad en carbono.</span></h1>',
                        '<h1><span class="strong">ISO 53001.</span> <span class="accent">Los ODS, como sistema de gestión.</span></h1>')
cabeza = cabeza.replace('<span aria-current="page">ISO 14068</span>', '<span aria-current="page">ISO 53001</span>')
cabeza = cabeza.replace('"ISO 14068"', '"ISO 53001"').replace('>ISO 14068<', '>ISO 53001<')

# JSON-LD: se reescribe entero para que las FAQ coincidan con las visibles.
FAQ = [
 ('¿Se puede certificar ya en ISO 53001?',
  'La norma está en su fase final de edición: ISO la publica como ISO/UNDP 53001:2026, primera edición, con fecha de septiembre de 2026. La certificación es otra cosa: todavía no hay esquema de acreditación, así que las primeras certificaciones se emitirán sin acreditar. Consulta el catálogo de ISO y a tu entidad antes de comprometer fechas con nadie.'),
 ('¿En qué se diferencia de firmar el Pacto Mundial o publicar una memoria GRI?',
  'En que esto no es una adhesión ni un informe, es un sistema de gestión con requisitos auditables. El Pacto Mundial es un compromiso público y GRI es un marco de reporte: los dos cuentan lo que haces. ISO 53001 define cómo lo gestionas —contexto, liderazgo, objetivos, procesos, medición y mejora— para que lo que cuentas tenga detrás algo que sostenerlo.'),
 ('¿Tengo que trabajar los diecisiete ODS?',
  'No. Se priorizan los pertinentes según el contexto de la organización, su actividad y su impacto real. Una constructora y una consultora no contribuyen a los mismos objetivos, y pretender lo contrario es justo lo que convierte la sostenibilidad en decoración.'),
 ('¿Me sirve para la CSRD o para el estado de información no financiera?',
  'Ayuda, pero no sustituye. La CSRD y el EINF son obligaciones de reporte con su propio contenido y su propia verificación. Lo que aporta un sistema de gestión es la gobernanza y la trazabilidad del dato: quién lo produce, con qué criterio y con qué evidencia. Con eso, el reporte deja de hacerse a última hora.'),
 ('¿Se integra con ISO 14001 o ISO 9001?',
  'Sí. Comparte la Estructura Armonizada de ISO, así que contexto, partes interesadas, liderazgo, objetivos, auditoría interna y revisión por la dirección se construyen una sola vez. Si ya tienes un sistema vivo, esto se apoya en él.'),
 ('¿Por dónde se empieza?',
  'Por un diagnóstico: qué ODS son pertinentes para ti, qué estás haciendo ya sin llamarlo así, y qué datos tienes. En casi todas las organizaciones hay más avanzado de lo que creen; lo que falta es el sistema que lo ordena y lo demuestra.'),
]

ld = {
  "@context": "https://schema.org",
  "@graph": [
    {"@type": "WebPage", "@id": BASE + "#webpage", "url": BASE, "name": TITULO, "inLanguage": "es-ES",
     "isPartOf": {"@id": "https://www.tuconsultor.com/#website"},
     "about": {"@id": "https://www.tuconsultor.com/#organization"}, "description": DESC},
    {"@type": "BreadcrumbList", "itemListElement": [
      {"@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://www.tuconsultor.com/"},
      {"@type": "ListItem", "position": 2, "name": "Sostenibilidad y Medio Ambiente", "item": "https://www.tuconsultor.com/areas/sostenibilidad/"},
      {"@type": "ListItem", "position": 3, "name": "ISO 53001", "item": BASE}]},
    {"@type": "FAQPage", "mainEntity": [
      {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ]},
    {"@type": "Service", "name": "ISO 53001", "serviceType": "ISO 53001", "url": BASE, "description": DESC,
     "provider": {"@id": "https://www.tuconsultor.com/#organization"},
     "areaServed": [{"@type": "Country", "name": "España"}, {"@type": "AdministrativeArea", "name": "Madrid"}]},
  ],
}
cabeza = re.sub(r'<script type="application/ld\+json">.*?</script>',
                '<script type="application/ld+json">' + json.dumps(ld, ensure_ascii=False) + '</script>',
                cabeza, count=1, flags=re.S)

# ── Contenido ───────────────────────────────────────────────────────────────
def carta(t, d):
    return f'<div class="norm-card"><h3 class="norm-name">{t}</h3><div class="norm-desc">{d}</div></div>'

def paso(n, t, d):
    return f'<div class="how-card"><div class="how-num">{n}</div><h3>{t}</h3><p>{d}</p></div>'

qué = ''.join([
  carta('Un sistema, no un informe',
        'Los ODS llevan una década contándose en memorias. ISO 53001 los convierte en requisitos: contexto, liderazgo, objetivos medibles, procesos, evaluación del desempeño y mejora. Lo que se audita es la gestión, no el folleto.'),
  carta('Solo los ODS que te tocan',
        'Se priorizan los pertinentes a tu actividad y a tu impacto. Diecisiete objetivos en una pyme de servicios no son un alcance, son un adorno.'),
  carta('Estructura armonizada',
        'Misma arquitectura de diez capítulos que ISO 9001, ISO 14001 e ISO 45001. Si tienes sistemas vivos, esto se monta encima y no al lado.'),
  carta('El dato, con trazabilidad',
        'Quién produce cada indicador, con qué criterio y con qué evidencia. Es lo que convierte un compromiso en algo defendible ante un cliente, un banco o un auditor.'),
  carta('Desarrollada con el PNUD',
        'La norma se ha elaborado junto al Programa de las Naciones Unidas para el Desarrollo. La designación oficial es ISO/UNDP 53001, y existe además la guía ISO/UNDP PAS 53002 para empezar antes.'),
  carta('Sin greenwashing',
        'Trabajamos igual que en huella de carbono: nada que no se pueda demostrar. Si un objetivo no tiene dato detrás, no entra en el sistema.'),
])

pasos = ''.join([
  paso('01', 'Diagnóstico y materialidad',
       'Qué ODS son pertinentes para tu organización, qué estás haciendo ya sin llamarlo así y qué datos tienes. Casi siempre hay más de lo que se cree.'),
  paso('02', 'Gobernanza y compromiso',
       'Quién responde de qué, con qué autoridad y con qué recursos. Sin esto el sistema se queda en el departamento que lo impulsó.'),
  paso('03', 'Objetivos e indicadores',
       'Objetivos medibles por ODS priorizado, con línea base, responsable y plazo. Y un indicador que se pueda calcular con lo que ya tienes o con lo que vas a empezar a recoger.'),
  paso('04', 'Procesos y evidencias',
       'La documentación mínima para que funcione: cómo se recoge el dato, cómo se valida y dónde queda. Proporcionada al tamaño de la organización.'),
  paso('05', 'Auditoría interna y revisión',
       'Comprobamos el sistema antes de que lo comprueben de fuera, y llevamos los resultados a la revisión por la dirección.'),
  paso('06', 'Certificación y reporte',
       'Acompañamiento a la auditoría externa cuando haya esquema disponible, y encaje de los resultados con tu EINF o tu reporte de sostenibilidad.'),
])

faq_html = ''.join(
  f'<details class="faq-item"><summary class="faq-q">{q}<span class="icon">+</span></summary>'
  f'<div class="faq-a">{a}</div></details>' for q, a in FAQ)

main = f'''<main id="main">
<section class="norms" style="padding-top:70px">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Qué es ISO 53001</div>
      <h2><span class="strong">Los Objetivos de Desarrollo Sostenible,</span> <span class="accent">gestionados de verdad.</span></h2>
    </div>
    <div class="rich" style="max-width:820px;margin-bottom:34px">
      <p><strong>ISO/UNDP 53001</strong> es la primera norma que convierte la contribución a los Objetivos de Desarrollo Sostenible de Naciones Unidas en un sistema de gestión con requisitos. Se ha elaborado junto al Programa de las Naciones Unidas para el Desarrollo (PNUD) y su título completo es <em>Management systems for United Nations Sustainable Development Goals (SDGs) — Requirements</em>.</p>
      <p>ISO la recoge como <strong>ISO/UNDP 53001:2026</strong>, primera edición, con fecha de publicación de septiembre de 2026. Es certificable, aunque el esquema de acreditación todavía está por construir: las primeras certificaciones se emitirán sin acreditar mientras los organismos nacionales lo desarrollan. Quien quiera ir por delante tiene además la guía <strong>ISO/UNDP PAS 53002</strong>, ya disponible.</p>
      <p>Lo interesante no es el sello. Es que por primera vez hay una forma común de responder a la pregunta que cada vez hacen más clientes, más bancos y más pliegos: <em>vale, contribuís a los ODS, ¿pero cómo lo gestionáis y cómo lo demostráis?</em></p>
    </div>
    <div class="norms-grid">{qué}</div>
  </div>
</section>
<section class="how">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Cómo lo implantamos</div>
      <h2><span class="strong">Seis pasos.</span> <span class="accent">Con dato detrás.</span></h2>
    </div>
    <div class="how-grid two">{pasos}</div>
  </div>
</section>
<section class="consultify-band" style="background:var(--cream)">
  <div class="container" style="text-align:center">
    <h2 style="font-size:clamp(28px,3.5vw,40px);letter-spacing:-0.03em;margin-bottom:14px"><span class="strong">Elige la intensidad.</span></h2>
    <p style="color:var(--muted);max-width:640px;margin:0 auto 26px">Relación, Implicación o Compromiso: tú decides cuánto llevamos nosotros y cuánto lleváis vosotros. Y Orbita.PMTools es la plataforma donde vive tu proyecto.</p>
    <a href="/#niveles" class="btn btn-primary">Ver niveles de servicio</a>
  </div>
</section>
<section class="faq">
  <div class="container">
    <div class="section-head"><div class="section-eyebrow">Preguntas frecuentes</div>
      <h2><span>ISO 53001</span></h2></div>
    <div class="faq-list">{faq_html}</div>
  </div>
</section>
<section class="norms">
  <div class="container">
    <div class="section-head">
      <div class="section-eyebrow">Otros servicios del área</div>
      <h2><span>Sostenibilidad</span> <span class="accent">y medio ambiente.</span></h2>
    </div>
    <div class="norms-grid">
      <a class="norm-card" href="/areas/sostenibilidad/iso-14001.html" style="display:block"><h3 class="norm-name">ISO 14001</h3><div class="norm-desc">Gestión ambiental</div></a>
      <a class="norm-card" href="/areas/sostenibilidad/huella-de-carbono.html" style="display:block"><h3 class="norm-name">Huella de carbono</h3><div class="norm-desc">Cálculo, registro y reducción</div></a>
      <a class="norm-card" href="/areas/sostenibilidad/iso-14068.html" style="display:block"><h3 class="norm-name">ISO 14068</h3><div class="norm-desc">Neutralidad en carbono</div></a>
      <a class="norm-card" href="/areas/sostenibilidad/einf.html" style="display:block"><h3 class="norm-name">EINF</h3><div class="norm-desc">Estado de información no financiera</div></a>
      <a class="norm-card" href="/areas/sostenibilidad/csrd.html" style="display:block"><h3 class="norm-name">CSRD</h3><div class="norm-desc">Reporte de sostenibilidad europeo</div></a>
      <a class="norm-card" href="/areas/sostenibilidad/pacto-mundial.html" style="display:block"><h3 class="norm-name">Pacto Mundial</h3><div class="norm-desc">Adhesión e informe de progreso</div></a>
    </div>
  </div>
</section>
'''

io.open(RUTA + 'iso-53001.html', 'w', encoding='utf-8').write(cabeza + main + cola)
print('escrito iso-53001.html ·', len(cabeza + main + cola), 'bytes')
