/* ═══════════════════════════════════════════════════════════════════════════
   BANNER DE PORTADA · 5 anuncios rotatorios
   ---------------------------------------------------------------------------
   Mejora progresiva sobre el hero que ya existe en el HTML:
     · El anuncio 1 es el hero real de la página, tal cual está escrito. No se
       reconstruye con JavaScript, para que Google siga viendo el H1 de siempre
       y el LCP no dependa de un script.
     · Los anuncios 2 a 5 los añade este fichero, en los cinco idiomas del
       sitio (el idioma se toma de <html lang>).
     · Solo hay un anuncio en el DOM visible a la vez, sin posicionamiento
       absoluto: así la altura se adapta sola en cualquier idioma y en móvil.
     · Se detiene al pasar el ratón, al enfocar con teclado, con la pestaña en
       segundo plano y si el sistema pide movimiento reducido.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var hero = document.querySelector('.hero .hero-content');
  if (!hero) return;
  if (hero.querySelector('.tc-b-slide')) return;   // ya montado

  var lang = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2).toLowerCase();
  var rtl = lang === 'ar';
  var PERIODO = 7000;

  // ── Anuncios 2 a 5 · [pretag, [líneas del titular], subtítulo, [CTAs]] ────
  // Cada línea del titular lleva su clase: '' normal · 'strong' teal · 'accent' naranja.
  var A = {
    es: [
      {
        pre: 'ENS · REAL DECRETO 311/2022',
        h: [['¿Trabajas con la', ''], ['Administración?', 'strong'], ['El ENS no es opcional.', 'accent']],
        sub: 'Categorización, análisis de riesgos, declaración o certificación de conformidad y auditoría. Categoría básica, media o alta.',
        cta: [['Ver el ENS', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['Habla con el equipo', '/contacto.html', 'btn-primary']],
      },
      {
        pre: 'CONSULTIFY · CONSULTORÍA POR SUSCRIPCIÓN',
        h: [['Tu ISO', ''], ['por suscripción,', 'strong'], ['con precio en 60 segundos.', 'accent']],
        sub: 'Calculadora en línea, propuesta al instante y acompañamiento impulsado por IA. Desde 350 €/mes, sin sorpresas.',
        cta: [['Calcula tu oferta', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['Qué es Consultify', '/servicios/consultify.html', 'btn-primary']],
      },
      {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Tu proyecto,', ''], ['en tiempo real,', 'strong'], ['sin correos perdidos.', 'accent']],
        sub: 'Portal de cliente y panel del equipo consultor: tareas, plazos, documentos y agenda en un solo sitio.',
        cta: [['Entrar en Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['Cómo funciona', '/servicios-tecnologicos.html', 'btn-primary']],
      },
      {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['El ecosistema', ''], ['humano', 'strong'], ['impulsado por IA.', 'accent']],
        sub: 'Personas que conocen tu sector y tecnología que se come el trabajo repetitivo. Tres marcas, un mismo equipo.',
        cta: [['Conócenos', '/quienes-somos.html', 'btn-orange'], ['Pide tu cita', '/contacto.html', 'btn-primary']],
      },
    ],
    en: [
      {
        pre: 'ENS · SPANISH ROYAL DECREE 311/2022',
        h: [['Working with', ''], ['public administration?', 'strong'], ['ENS is not optional.', 'accent']],
        sub: 'Categorisation, risk analysis, declaration or certification of conformity and audit. Basic, medium or high category.',
        cta: [['About ENS', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['Talk to the team', '/contacto.html', 'btn-primary']],
      },
      {
        pre: 'CONSULTIFY · CONSULTING BY SUBSCRIPTION',
        h: [['Your ISO', ''], ['by subscription,', 'strong'], ['priced in 60 seconds.', 'accent']],
        sub: 'Online calculator, instant proposal and AI-powered support. From €350/month, no surprises.',
        cta: [['Get your quote', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['What is Consultify', '/servicios/consultify.html', 'btn-primary']],
      },
      {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Your project,', ''], ['in real time,', 'strong'], ['no lost emails.', 'accent']],
        sub: 'Client portal and consulting-team dashboard: tasks, deadlines, documents and calendar in one place.',
        cta: [['Enter Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['How it works', '/servicios-tecnologicos.html', 'btn-primary']],
      },
      {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['The human', ''], ['ecosystem', 'strong'], ['powered by AI.', 'accent']],
        sub: 'People who know your sector and technology that eats the repetitive work. Three brands, one team.',
        cta: [['About us', '/quienes-somos.html', 'btn-orange'], ['Book a meeting', '/contacto.html', 'btn-primary']],
      },
    ],
    fr: [
      {
        pre: 'ENS · DÉCRET ROYAL ESPAGNOL 311/2022',
        h: [['Vous travaillez avec', ''], ["l'administration ?", 'strong'], ["L'ENS n'est pas optionnel.", 'accent']],
        sub: 'Catégorisation, analyse des risques, déclaration ou certification de conformité et audit. Catégorie basique, moyenne ou élevée.',
        cta: [["Voir l'ENS", '/areas/ciberseguridad/ens.html', 'btn-orange'], ["Parler à l'équipe", '/contacto.html', 'btn-primary']],
      },
      {
        pre: 'CONSULTIFY · CONSEIL PAR ABONNEMENT',
        h: [['Votre ISO', ''], ['par abonnement,', 'strong'], ['chiffrée en 60 secondes.', 'accent']],
        sub: 'Calculateur en ligne, proposition immédiate et accompagnement propulsé par IA. À partir de 350 €/mois.',
        cta: [['Calculez votre offre', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ["Qu'est-ce que Consultify", '/servicios/consultify.html', 'btn-primary']],
      },
      {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Votre projet,', ''], ['en temps réel,', 'strong'], ['sans e-mails perdus.', 'accent']],
        sub: "Portail client et tableau de bord de l'équipe : tâches, délais, documents et agenda au même endroit.",
        cta: [['Entrer dans Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['Comment ça marche', '/servicios-tecnologicos.html', 'btn-primary']],
      },
      {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [["L'écosystème", ''], ['humain', 'strong'], ['propulsé par IA.', 'accent']],
        sub: 'Des personnes qui connaissent votre secteur et une technologie qui avale le travail répétitif. Trois marques, une équipe.',
        cta: [['Qui sommes-nous', '/quienes-somos.html', 'btn-orange'], ['Prenez rendez-vous', '/contacto.html', 'btn-primary']],
      },
    ],
    de: [
      {
        pre: 'ENS · SPANISCHES DEKRET 311/2022',
        h: [['Arbeiten Sie mit', ''], ['der Verwaltung?', 'strong'], ['ENS ist nicht optional.', 'accent']],
        sub: 'Kategorisierung, Risikoanalyse, Konformitätserklärung oder -zertifizierung und Audit. Kategorie niedrig, mittel oder hoch.',
        cta: [['ENS ansehen', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['Team kontaktieren', '/contacto.html', 'btn-primary']],
      },
      {
        pre: 'CONSULTIFY · BERATUNG IM ABO',
        h: [['Ihre ISO', ''], ['im Abo,', 'strong'], ['Preis in 60 Sekunden.', 'accent']],
        sub: 'Online-Rechner, Angebot in Sekunden und KI-gestützte Begleitung. Ab 350 €/Monat, ohne Überraschungen.',
        cta: [['Angebot berechnen', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['Was ist Consultify', '/servicios/consultify.html', 'btn-primary']],
      },
      {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Ihr Projekt,', ''], ['in Echtzeit,', 'strong'], ['ohne verlorene Mails.', 'accent']],
        sub: 'Kundenportal und Dashboard des Beratungsteams: Aufgaben, Fristen, Dokumente und Termine an einem Ort.',
        cta: [['Zu Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['So funktioniert es', '/servicios-tecnologicos.html', 'btn-primary']],
      },
      {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['Das menschliche', ''], ['Ökosystem,', 'strong'], ['angetrieben von KI.', 'accent']],
        sub: 'Menschen, die Ihre Branche kennen, und Technik, die die Routinearbeit schluckt. Drei Marken, ein Team.',
        cta: [['Über uns', '/quienes-somos.html', 'btn-orange'], ['Termin anfragen', '/contacto.html', 'btn-primary']],
      },
    ],
    ar: [
      {
        pre: 'ENS · المرسوم الملكي الإسباني ٣١١/٢٠٢٢',
        h: [['هل تعمل مع', ''], ['الإدارة العامة؟', 'strong'], ['نظام ENS ليس اختياريًا.', 'accent']],
        sub: 'التصنيف وتحليل المخاطر وإعلان أو شهادة المطابقة والتدقيق. الفئة الأساسية أو المتوسطة أو العالية.',
        cta: [['تعرّف على ENS', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['تحدّث مع الفريق', '/contacto.html', 'btn-primary']],
      },
      {
        pre: 'CONSULTIFY · استشارات بالاشتراك',
        h: [['شهادة الأيزو', ''], ['بالاشتراك،', 'strong'], ['بسعر في ٦٠ ثانية.', 'accent']],
        sub: 'حاسبة على الإنترنت وعرض فوري ومواكبة مدعومة بالذكاء الاصطناعي. تبدأ من ٣٥٠ يورو شهريًا.',
        cta: [['احسب عرضك', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['ما هو Consultify', '/servicios/consultify.html', 'btn-primary']],
      },
      {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['مشروعك،', ''], ['في الوقت الحقيقي،', 'strong'], ['بلا رسائل ضائعة.', 'accent']],
        sub: 'بوابة العميل ولوحة الفريق الاستشاري: المهام والمواعيد والمستندات والتقويم في مكان واحد.',
        cta: [['ادخل إلى Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['كيف يعمل', '/servicios-tecnologicos.html', 'btn-primary']],
      },
      {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['المنظومة', ''], ['الإنسانية', 'strong'], ['المدعومة بالذكاء الاصطناعي.', 'accent']],
        sub: 'أشخاص يعرفون قطاعك وتقنية تتولى العمل المتكرر. ثلاث علامات، فريق واحد.',
        cta: [['من نحن', '/quienes-somos.html', 'btn-orange'], ['احجز موعدًا', '/contacto.html', 'btn-primary']],
      },
    ],
  };
  var anuncios = A[lang] || A.es;

  var ETIQUETAS = {
    es: { ant: 'Anuncio anterior', sig: 'Anuncio siguiente', ir: 'Ver anuncio', de: 'de' },
    en: { ant: 'Previous slide', sig: 'Next slide', ir: 'Go to slide', de: 'of' },
    fr: { ant: 'Précédent', sig: 'Suivant', ir: 'Aller au message', de: 'sur' },
    de: { ant: 'Zurück', sig: 'Weiter', ir: 'Zu Anzeige', de: 'von' },
    ar: { ant: 'السابق', sig: 'التالي', ir: 'انتقل إلى', de: 'من' },
  };
  var L = ETIQUETAS[lang] || ETIQUETAS.es;

  // ── Estilos ───────────────────────────────────────────────────────────────
  var css = ''
    + '.tc-b-slide{display:none}'
    + '.tc-b-slide.tc-viva{display:block;animation:tc-b-entra .5s ease both}'
    + '@keyframes tc-b-entra{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}'
    + '.tc-b-mandos{display:flex;align-items:center;gap:14px;margin-top:26px;flex-wrap:wrap}'
    + '.tc-b-puntos{display:flex;gap:8px;align-items:center}'
    + '.tc-b-punto{width:9px;height:9px;padding:0;border:0;border-radius:50%;cursor:pointer;'
    + 'background:rgba(255,255,255,.26);transition:background .2s,transform .2s}'
    + '.tc-b-punto:hover{background:rgba(255,255,255,.5)}'
    + '.tc-b-punto[aria-current="true"]{background:var(--tc-naranja,#F99001);transform:scale(1.35)}'
    + '.tc-b-flecha{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;cursor:pointer;'
    + 'border:1px solid rgba(255,255,255,.18);background:transparent;color:rgba(255,255,255,.6);'
    + "font:700 14px/1 'Manrope',system-ui,sans-serif;transition:border-color .2s,color .2s}"
    + '.tc-b-flecha:hover{border-color:var(--tc-naranja,#F99001);color:#fff}'
    + '.tc-b-cuenta{font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.35)}'
    + '@media(prefers-reduced-motion:reduce){.tc-b-slide.tc-viva{animation:none}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // ── Anuncio 1 = el hero que ya existe ─────────────────────────────────────
  var pista = document.createElement('div');
  var primero = document.createElement('div');
  primero.className = 'tc-b-slide tc-viva';
  while (hero.firstChild) primero.appendChild(hero.firstChild);
  pista.appendChild(primero);

  // ── Anuncios 2 a 5 ────────────────────────────────────────────────────────
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  anuncios.forEach(function (a) {
    var d = document.createElement('div');
    d.className = 'tc-b-slide';
    d.innerHTML = ''
      + '<div class="pre-tag">' + esc(a.pre) + '</div>'
      + '<h2 class="tc-b-titular">' + a.h.map(function (l) {
          return '<span' + (l[1] ? ' class="' + l[1] + '"' : '') + '>' + esc(l[0]) + '</span>';
        }).join('') + '</h2>'
      + '<p class="sub">' + esc(a.sub) + '</p>'
      + '<div class="hero-actions">' + a.cta.map(function (c) {
          var externo = /^https?:/.test(c[1]);
          return '<a href="' + c[1] + '" class="btn ' + c[2] + '"'
               + (externo ? ' target="_blank" rel="noopener"' : '') + '>' + esc(c[0]) + '</a>';
        }).join('') + '</div>';
    pista.appendChild(d);
  });

  // El titular de los anuncios añadidos hereda el tamaño del H1 del hero,
  // pero es un H2: solo puede haber un H1 por página.
  var estilosH1 = window.getComputedStyle(hero.querySelector('h1') || document.body);
  var reglaH2 = document.createElement('style');
  reglaH2.textContent = '.tc-b-titular{font-size:' + estilosH1.fontSize + ';line-height:' + estilosH1.lineHeight
    + ';font-weight:' + estilosH1.fontWeight + ';letter-spacing:' + estilosH1.letterSpacing
    + ';margin:0 0 ' + estilosH1.marginBottom + ';color:' + estilosH1.color + '}'
    + '.tc-b-titular span{display:block}';
  document.head.appendChild(reglaH2);

  hero.appendChild(pista);

  // ── Mandos ────────────────────────────────────────────────────────────────
  var total = 1 + anuncios.length;
  var mandos = document.createElement('div');
  mandos.className = 'tc-b-mandos';
  mandos.innerHTML = ''
    + '<button type="button" class="tc-b-flecha" data-paso="-1" aria-label="' + esc(L.ant) + '">' + (rtl ? '›' : '‹') + '</button>'
    + '<div class="tc-b-puntos" role="tablist"></div>'
    + '<button type="button" class="tc-b-flecha" data-paso="1" aria-label="' + esc(L.sig) + '">' + (rtl ? '‹' : '›') + '</button>'
    + '<span class="tc-b-cuenta"><b>1</b> ' + esc(L.de) + ' ' + total + '</span>';
  hero.appendChild(mandos);

  var puntos = mandos.querySelector('.tc-b-puntos');
  for (var i = 0; i < total; i++) {
    var p = document.createElement('button');
    p.type = 'button';
    p.className = 'tc-b-punto';
    p.setAttribute('role', 'tab');
    p.setAttribute('aria-label', L.ir + ' ' + (i + 1));
    p.setAttribute('aria-current', i === 0 ? 'true' : 'false');
    p.dataset.i = String(i);
    puntos.appendChild(p);
  }

  var slides = pista.querySelectorAll('.tc-b-slide');
  var cuenta = mandos.querySelector('.tc-b-cuenta b');
  var actual = 0;

  function mostrar(n) {
    actual = (n + total) % total;
    for (var j = 0; j < slides.length; j++) slides[j].classList.toggle('tc-viva', j === actual);
    var ps = puntos.children;
    for (var k = 0; k < ps.length; k++) ps[k].setAttribute('aria-current', k === actual ? 'true' : 'false');
    cuenta.textContent = String(actual + 1);
  }

  var reloj = null;
  var reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function arrancar() { if (!reducido && !reloj) reloj = setInterval(function () { mostrar(actual + 1); }, PERIODO); }
  function parar() { if (reloj) { clearInterval(reloj); reloj = null; } }
  function reiniciar() { parar(); arrancar(); }

  mandos.addEventListener('click', function (e) {
    var f = e.target.closest('.tc-b-flecha');
    var p = e.target.closest('.tc-b-punto');
    if (f) { mostrar(actual + Number(f.dataset.paso)); reiniciar(); }
    else if (p) { mostrar(Number(p.dataset.i)); reiniciar(); }
  });

  var zona = hero.closest('.hero') || hero;
  zona.addEventListener('mouseenter', parar);
  zona.addEventListener('mouseleave', arrancar);
  zona.addEventListener('focusin', parar);
  zona.addEventListener('focusout', arrancar);
  document.addEventListener('visibilitychange', function () { document.hidden ? parar() : arrancar(); });

  // Deslizar en táctil
  var x0 = null;
  zona.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; parar(); }, { passive: true });
  zona.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var d = e.changedTouches[0].clientX - x0;
    if (Math.abs(d) > 45) mostrar(actual + (d < 0 ? 1 : -1) * (rtl ? -1 : 1));
    x0 = null; arrancar();
  }, { passive: true });

  arrancar();
})();
