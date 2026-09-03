#!/usr/bin/env python3
"""
Genera la página de los Premios Vanguardistas desde el JSON de bases.

Por qué generarla y no escribirla: las bases cambian cada edición —fechas,
ámbitos, dotación, lugar del acto— y mantener eso a mano en HTML es como acaba
publicada una fecha del año pasado. El JSON es la fuente; la página, el
resultado.

Para la edición que viene: se cambia el JSON y se vuelve a ejecutar.

    python3 scripts/premios-web.py
"""
import html
import json
import os
import sys
from datetime import date

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JSON = os.path.join(RAIZ, 'web', 'premios', 'bases-2026.json')
SALIDA = os.path.join(RAIZ, 'web', 'premios', 'index.html')

MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
         'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']


def esc(s):
    return html.escape(str(s or ''), quote=True)


def fecha_larga(iso):
    """«30 de octubre de 2026»."""
    if not iso:
        return ''
    y, m, d = str(iso)[:10].split('-')
    return f'{int(d)} de {MESES[int(m) - 1]} de {y}'


def fecha_corta(iso):
    y, m, d = str(iso)[:10].split('-')
    return f'{int(d)} {MESES[int(m) - 1][:3]}'


def main():
    b = json.load(open(JSON, encoding='utf-8'))
    ed, seo, intro = b['edicion'], b['seo'], b['introduccion']
    acto = b['actoEntrega']
    cierre = next((c for c in b['calendario'] if c['id'] == 'cierre'), None)
    url_form = b['candidatura']['formularioUrl']

    # Días que quedan: lo calcula el navegador, no el generador. Si se escribe
    # aquí, al día siguiente la página miente.
    partes = []
    A = partes.append

    A(f'''<!DOCTYPE html>
<html lang="es" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="msvalidate.01" content="5E68C86191818A62B99BF6C108403776" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{esc(seo['title'])}</title>
<meta name="description" content="{esc(seo['description'])}" />
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
<link rel="canonical" href="https://www.tuconsultor.com/premios/" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{esc(seo['title'])}" />
<meta property="og:description" content="{esc(seo['description'])}" />
<meta property="og:url" content="https://www.tuconsultor.com/premios/" />
<meta property="og:image" content="https://www.tuconsultor.com/social-img/og-default.png" />
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="stylesheet" href="/tokens.css" />
<link rel="stylesheet" href="/estilo-base.css" />
<link rel="stylesheet" href="/capas.css" />

<script type="application/ld+json">
{json.dumps({
    "@context": "https://schema.org",
    "@graph": [{
      "@type": "WebPage",
      "name": seo['title'],
      "description": seo['description'],
      "url": "https://www.tuconsultor.com/premios/",
      "inLanguage": "es",
    }, {
    "@type": "Event",
    "name": ed['titulo'],
    "description": seo['description'],
    "startDate": f"{acto['fecha']}T{acto['hora']}",
    "eventStatus": "https://schema.org/EventScheduled",
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "location": {"@type": "Place", "name": acto['lugar'],
                 "address": {"@type": "PostalAddress", "addressLocality": acto['ciudad'],
                             "addressCountry": "ES"}},
    "organizer": {"@type": "Organization", "name": b['evento']['organizador']['nombre'],
                  "url": b['evento']['organizador']['web']},
    }],
}, ensure_ascii=False, indent=2)}
</script>
</head>
<body>
<a class="skip-link" href="#main">Ir al contenido</a>
''')

    # ── Cabecera ──
    A('''<header class="nav">
  <div class="container nav-inner">
    <a class="nav-logo" href="/"><img src="/marca/horizontal-dark.svg" alt="TuConsultor" style="height:36px;width:auto" /></a>
    <nav class="nav-mid">
      <a href="/">Inicio</a><a href="/areas/">Áreas</a><a href="/quienes-somos.html">Quiénes somos</a>
    </nav>
    <a class="btn-primary" href="#candidatura">Presenta tu candidatura</a>
  </div>
</header>

<main id="main">''')

    # ── Portada ──
    A(f'''<section class="hero-premios">
  <div class="container">
    <p class="section-eyebrow">{esc(ed['subtitulo'])}</p>
    <h1>{esc(ed['titulo'])}</h1>
    <p class="hero-claim">{esc(ed['claim'])}</p>
    <p class="hero-espiritu">{esc(intro['espiritu'])}</p>

    <div class="premios-cta">
      <a class="btn-primary btn-lg" href="{esc(url_form)}" target="_blank" rel="noopener">Presenta tu candidatura</a>
      <span class="premios-plazo" id="plazo" data-cierre="{esc(cierre['fecha'])}">
        Plazo hasta el {fecha_larga(cierre['fecha'])}
      </span>
    </div>
    <p class="premios-duracion">{b['candidatura']['duracionMinutos']} minutos · formulario online</p>
  </div>
</section>''')

    # ── Por qué ──
    A('<section class="norms"><div class="container"><div class="section-head">'
      '<div class="section-eyebrow">Por qué</div>'
      '<h2><span>Veinte años</span> <span class="accent">viendo cómo se avanza.</span></h2></div>'
      '<div class="premios-texto">')
    for p in intro['porQue']:
        A(f'<p>{esc(p)}</p>')
    A(f'<p class="premios-vanguardia-in">{esc(intro["vanguardia"]["entradilla"])}</p><ul class="premios-hitos">')
    for h_ in intro['vanguardia']['hitos']:
        A(f'<li>{esc(h_)}</li>')
    A(f'</ul><p>{esc(intro["vanguardia"]["cierre"])}</p></div></div></section>')

    # ── Ámbitos ──
    A('<section class="norms" style="padding-top:0"><div class="container"><div class="section-head">'
      '<div class="section-eyebrow">Ámbitos</div>'
      '<h2><span>Cuatro perspectivas</span> <span class="accent">de la gestión.</span></h2></div>'
      '<div class="norms-grid">')
    for a in b['ambitos']:
        A(f'''<div class="norm-card" style="border-top:3px solid {esc(a['color'])}">
  <div class="norm-name">{esc(a['nombre'])}</div>
  <div class="norm-desc">{esc(a['descripcion'])}</div>
</div>''')
    A('</div></div></section>')

    # ── Categorías y requisitos ──
    A('<section class="norms" style="padding-top:0"><div class="container">'
      '<div class="premios-dos">')
    A('<div><div class="section-eyebrow">Categorías</div><ul class="premios-lista">')
    for c in b['categorias']:
        A(f'<li><strong>{esc(c["nombre"])}</strong><span>{esc(c["alcance"])}</span></li>')
    A('</ul></div>')
    A('<div><div class="section-eyebrow">Qué buscamos</div><ul class="premios-lista">')
    for r in b['requisitos']:
        A(f'<li><strong>{esc(r["nombre"])}</strong><span>{esc(r["descripcion"])}</span></li>')
    A('</ul></div>')
    A('</div>'
      f'<p class="premios-elegibilidad">{esc(b["elegibilidad"]["texto"])}</p>'
      '</div></section>')

    # ── Premio especial ──
    pe = b['premioEspecial']
    total = sum(d['importe'] for d in pe['dotacion'])
    A(f'''<section class="norms" style="padding-top:0"><div class="container">
  <div class="premio-especial">
    <div class="section-eyebrow">{esc(pe['nombre'])}</div>
    <p class="premio-especial-desc">{esc(pe['descripcion'])}</p>
    <div class="premio-dotacion">''')
    for d in pe['dotacion']:
        A(f'<div><span class="premio-importe">{d["importe"]:,}</span><span class="premio-moneda">€</span>'
          f'<span class="premio-concepto">{esc(d["concepto"])}</span></div>'.replace(',', '.'))
    A(f'</div><p class="premio-total">Dotación total: <strong>{total:,} €</strong></p>'.replace(',', '.'))
    A('</div></div></section>')

    # ── Calendario ──
    A('<section class="norms" style="padding-top:0"><div class="container"><div class="section-head">'
      '<div class="section-eyebrow">Calendario</div></div><ol class="premios-calendario">')
    for c in b['calendario']:
        hora = f' · {c["hora"]} h' if c.get('hora') else ''
        A(f'<li><span class="cal-fecha">{fecha_corta(c["fecha"])}</span>'
          f'<span class="cal-titulo">{esc(c["titulo"])}{hora}</span></li>')
    A('</ol>'
      f'<p class="premios-acto">El acto se celebra el <strong>{acto["diaSemana"]} {fecha_larga(acto["fecha"])}</strong>, '
      f'a las {acto["hora"]} h, en {esc(acto["lugar"])} ({esc(acto["ciudad"])}), en el marco del {esc(acto["marco"])}.<br />'
      f'<span class="premios-nota">{esc(acto["obligacion"])}</span></p>'
      '</div></section>')

    # ── Candidatura ──
    A('<section class="norms" id="candidatura" style="padding-top:0"><div class="container"><div class="section-head">'
      '<div class="section-eyebrow">Cómo presentarla</div>'
      f'<h2><span>Cinco preguntas,</span> <span class="accent">{b["candidatura"]["duracionMinutos"]} minutos.</span></h2></div>'
      '<ol class="premios-bloques">')
    for bl in b['candidatura']['bloques']:
        A(f'<li><span class="bloque-n">{bl["orden"]}</span><div>'
          f'<strong>{esc(bl["titulo"])}</strong><span>{esc(bl["ayuda"])}</span></div></li>')
    A(f'</ol><div class="premios-cta"><a class="btn-primary btn-lg" href="{esc(url_form)}" '
      'target="_blank" rel="noopener">Presenta tu candidatura</a></div></div></section>')

    # ── Evaluación ──
    ev = b['evaluacion']
    A('<section class="norms" style="padding-top:0"><div class="container"><div class="section-head">'
      '<div class="section-eyebrow">Cómo se evalúa</div></div>'
      f'<p class="premios-texto">{esc(ev["jurado"])}</p><ol class="premios-proceso">')
    for p in ev['proceso']:
        A(f'<li><strong>{esc(p["titulo"])}</strong><span>{esc(p["descripcion"])}</span></li>')
    A('</ol><div class="premios-dos" style="margin-top:24px">'
      '<div><div class="section-eyebrow">Criterios</div><ul class="premios-lista">')
    for c in ev['criterios']:
        A(f'<li><strong>{esc(c["nombre"])}</strong><span>{esc(c["descripcion"])}</span></li>')
    A('</ul></div>'
      f'<div><div class="section-eyebrow">Devolución</div><p class="premios-texto">{esc(ev["feedback"])}</p></div>'
      '</div></div></section>')

    # ── Ediciones anteriores ──
    A('<section class="norms" style="padding-top:0"><div class="container"><div class="section-head">'
      '<div class="section-eyebrow">Ediciones anteriores</div></div><ul class="premios-ediciones">')
    for e in b['edicionesAnteriores']:
        A(f'<li><strong>{e["anio"]}</strong><span>{e["premios"]} premios · {e["menciones"]} menciones</span>'
          f'<span class="ed-lugar">{esc(e["lugar"])}</span></li>')
    A('</ul></div></section>')

    # ── Privacidad y contacto ──
    pr = b['privacidad']
    A('<section class="norms" style="padding-top:0"><div class="container">'
      '<details class="premios-privacidad"><summary>Protección de datos</summary>'
      f'<p class="premios-nota">Responsable: {esc(pr["responsable"])} · {esc(pr["direccion"])} · '
      f'<a href="mailto:{esc(pr["emailRgpd"])}">{esc(pr["emailRgpd"])}</a></p>')
    for ap in pr['apartados']:
        A(f'<p><strong>{esc(ap["titulo"])}.</strong> {esc(ap["texto"])}</p>')
    A('</details><div class="premios-contacto">')
    for c in b['contacto']:
        A(f'<span><strong>{esc(c["asunto"])}</strong>'
          f'<a href="mailto:{esc(c["email"])}">{esc(c["email"])}</a></span>')
    A('</div></div></section>')

    A('''</main>

<script>
// Los días que quedan se calculan en el navegador. Escritos en el HTML, al día
// siguiente la página miente.
(function () {
  var el = document.getElementById('plazo');
  if (!el) return;
  var cierre = new Date(el.dataset.cierre + 'T23:59:59');
  var d = Math.ceil((cierre - new Date()) / 86400000);
  if (d > 0 && d <= 45) {
    el.innerHTML = 'Quedan <strong>' + d + ' día' + (d === 1 ? '' : 's') + '</strong> para presentar tu candidatura';
    el.classList.add('urgente');
  } else if (d <= 0) {
    el.textContent = 'El plazo de candidaturas está cerrado';
    el.classList.add('cerrado');
  }
})();
</script>
</body>
</html>''')

    os.makedirs(os.path.dirname(SALIDA), exist_ok=True)
    open(SALIDA, 'w', encoding='utf-8').write('\n'.join(partes))
    print(f'✓ {SALIDA}')
    print(f'  {len(b["ambitos"])} ámbitos · {len(b["categorias"])} categorías · '
          f'{len(b["calendario"])} hitos · {len(b["evaluacion"]["criterios"])} criterios')
    return 0


if __name__ == '__main__':
    sys.exit(main())
