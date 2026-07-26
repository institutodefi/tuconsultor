/* ═══════════════════════════════════════════════════════════════════════════
   BANNER DE PORTADA · cinco creatividades
   ---------------------------------------------------------------------------
   Cada anuncio es una pieza con su propio color de marca, su logotipo y UN
   objeto que resume su promesa. Nada de cinco variantes del mismo bloque de
   texto:

     1 · TuConsultor  · naranja  · los cuatro modelos de relación, con su
                                   dedicación real (de calcEngine)
     2 · ENS          · teal     · los tres niveles de categoría y qué exige
                                   cada uno (RD 311/2022)
     3 · Consultify   · azul     · la tarjeta de precio, desde 350 €/mes
     4 · Orbita 360   · teal     · la esfera animada y el estado del proyecto
     5 · Ecosistema   · degradado· las tres marcas y el papel de cada una

   Mejora progresiva: el anuncio 1 es el hero real del HTML —no se reconstruye,
   así Google sigue viendo el mismo H1 y el LCP no depende de este script—; solo
   se le añade su panel derecho. Los anuncios 2 a 5 los monta este fichero, en
   los cinco idiomas del sitio.

   Sobre el ENS: no se usa ningún emblema oficial del Esquema Nacional de
   Seguridad ni del CCN. El sello de categoría es tipográfico y propio, para no
   dar a entender una acreditación que no corresponde mostrar en un anuncio.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var hero = document.querySelector('.hero .hero-content');
  if (!hero) return;
  if (hero.querySelector('.tc-b-slide')) return;

  var lang = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2).toLowerCase();
  var rtl = lang === 'ar';
  var PERIODO = 8000;

  var LOGO = {
    tuconsultor: '/marca/horizontal-dark.svg',
    consultify: '/marca/consultify-horizontal-blanco.svg',
    orbita: '/marca/orbita-esfera-anim.svg',
    isotipo: '/marca/isotipo-dark.svg',
  };

  // ── Textos ────────────────────────────────────────────────────────────────
  var D = {
    es: {
      mandos: { ant: 'Anuncio anterior', sig: 'Anuncio siguiente', ir: 'Ver anuncio', de: 'de' },
      modelos: {
        rotulo: 'Modelos de relación',
        pie: 'Elige la intensidad. El precio se calcula sobre las horas.',
        items: [
          ['Apoyo', 'Bolsa de horas prepagada', ''],
          ['Relación', '2 h online por sistema y mes', ''],
          ['Implicación', '4 h online por sistema + 2 h presenciales', 'el más elegido'],
          ['Compromiso', '6 h online por sistema + 2 h presenciales', ''],
        ],
      },
      ens: {
        pre: 'ENS · REAL DECRETO 311/2022',
        h: [['Si trabajas con', ''], ['el sector público,', 'strong'], ['el ENS te obliga.', 'accent']],
        sub: 'Categorización, análisis de riesgos, plan de adecuación y auditoría. Te llevamos de la declaración responsable a la certificación, con el alcance ajustado a lo que de verdad prestas.',
        cta: [['Ver el ENS', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['Habla con el equipo', '/contacto.html', 'btn-primary']],
        rotulo: 'Niveles de categoría',
        items: [
          ['BÁSICA', 'Declaración de conformidad'],
          ['MEDIA', 'Certificación con entidad acreditada'],
          ['ALTA', 'Certificación y control reforzado'],
        ],
        pie: 'La categoría la fija el impacto, no el tamaño de la empresa.',
      },
      consultify: {
        pre: 'CONSULTIFY · CONSULTORÍA POR SUSCRIPCIÓN',
        h: [['Tu ISO', ''], ['por suscripción,', 'strong'], ['con precio en 60 segundos.', 'accent']],
        sub: 'Calculadora en línea, propuesta al instante y acompañamiento impulsado por IA. Sin horas sorpresa: lo que ves en pantalla es lo que se firma.',
        cta: [['Calcula tu oferta', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['Qué es Consultify', '/servicios/consultify.html', 'btn-primary']],
        desde: 'desde', precio: '350 €', periodo: '/mes', iva: 'sin IVA',
        bullets: ['9 normas en la calculadora', 'Propuesta en PDF al momento', 'Permanencia mínima 12 meses'],
      },
      orbita: {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Tu proyecto,', ''], ['en tiempo real,', 'strong'], ['sin correos perdidos.', 'accent']],
        sub: 'Portal de cliente y panel del equipo consultor: tareas con responsable y fecha, documentos del sistema y agenda compartida en un solo sitio.',
        cta: [['Entrar en Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['Cómo funciona', '/servicios-tecnologicos.html', 'btn-primary']],
        rotulo: 'Tu proyecto ahora',
        tareas: [['Análisis de contexto', 'hecho'], ['Mapa de procesos', 'en curso'], ['Auditoría interna', 'planificada']],
        estados: { hecho: 'hecho', 'en curso': 'en curso', planificada: 'planificada' },
      },
      eco: {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['El ecosistema', ''], ['humano', 'strong'], ['impulsado por IA.', 'accent']],
        sub: 'Personas que conocen tu sector y tecnología que se come el trabajo repetitivo. Tres marcas, un mismo equipo y una sola forma de trabajar.',
        cta: [['Conócenos', '/quienes-somos.html', 'btn-orange'], ['Pide tu cita', '/contacto.html', 'btn-primary']],
        papeles: [
          ['TuConsultor', 'La consultoría, con acompañamiento a medida'],
          ['Consultify', 'El producto por suscripción, con precio cerrado'],
          ['Orbita 360', 'La herramienta donde vive tu proyecto'],
        ],
      },
    },
    en: {
      mandos: { ant: 'Previous slide', sig: 'Next slide', ir: 'Go to slide', de: 'of' },
      modelos: {
        rotulo: 'Service models', pie: 'Choose the intensity. Price follows the hours.',
        items: [
          ['Apoyo', 'Prepaid block of hours', ''],
          ['Relación', '2 h online per system per month', ''],
          ['Implicación', '4 h online per system + 2 h on site', 'most chosen'],
          ['Compromiso', '6 h online per system + 2 h on site', ''],
        ],
      },
      ens: {
        pre: 'ENS · SPANISH ROYAL DECREE 311/2022',
        h: [['If you work with', ''], ['the public sector,', 'strong'], ['ENS is mandatory.', 'accent']],
        sub: 'Categorisation, risk analysis, adequacy plan and audit. From the responsible declaration to certification, with the scope matched to what you actually provide.',
        cta: [['About ENS', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['Talk to the team', '/contacto.html', 'btn-primary']],
        rotulo: 'Category levels',
        items: [['BASIC', 'Declaration of conformity'], ['MEDIUM', 'Certification by an accredited body'], ['HIGH', 'Certification and reinforced control']],
        pie: 'The category depends on impact, not on company size.',
      },
      consultify: {
        pre: 'CONSULTIFY · CONSULTING BY SUBSCRIPTION',
        h: [['Your ISO', ''], ['by subscription,', 'strong'], ['priced in 60 seconds.', 'accent']],
        sub: 'Online calculator, instant proposal and AI-powered support. No surprise hours: what you see on screen is what you sign.',
        cta: [['Get your quote', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['What is Consultify', '/servicios/consultify.html', 'btn-primary']],
        desde: 'from', precio: '€350', periodo: '/month', iva: 'excl. VAT',
        bullets: ['9 standards in the calculator', 'PDF proposal right away', '12-month minimum term'],
      },
      orbita: {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Your project,', ''], ['in real time,', 'strong'], ['no lost emails.', 'accent']],
        sub: 'Client portal and consulting-team dashboard: tasks with owner and date, system documents and a shared calendar in one place.',
        cta: [['Enter Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['How it works', '/servicios-tecnologicos.html', 'btn-primary']],
        rotulo: 'Your project right now',
        tareas: [['Context analysis', 'hecho'], ['Process map', 'en curso'], ['Internal audit', 'planificada']],
        estados: { hecho: 'done', 'en curso': 'in progress', planificada: 'planned' },
      },
      eco: {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['The human', ''], ['ecosystem', 'strong'], ['powered by AI.', 'accent']],
        sub: 'People who know your sector and technology that eats the repetitive work. Three brands, one team, one way of working.',
        cta: [['About us', '/quienes-somos.html', 'btn-orange'], ['Book a meeting', '/contacto.html', 'btn-primary']],
        papeles: [['TuConsultor', 'The consultancy, tailored support'], ['Consultify', 'The subscription product, fixed price'], ['Orbita 360', 'The tool where your project lives']],
      },
    },
    fr: {
      mandos: { ant: 'Précédent', sig: 'Suivant', ir: 'Aller au message', de: 'sur' },
      modelos: {
        rotulo: 'Modèles de relation', pie: "Choisissez l'intensité. Le prix suit les heures.",
        items: [
          ['Apoyo', "Forfait d'heures prépayé", ''],
          ['Relación', '2 h en ligne par système et par mois', ''],
          ['Implicación', '4 h en ligne par système + 2 h sur site', 'le plus choisi'],
          ['Compromiso', '6 h en ligne par système + 2 h sur site', ''],
        ],
      },
      ens: {
        pre: 'ENS · DÉCRET ROYAL ESPAGNOL 311/2022',
        h: [['Si vous travaillez avec', ''], ['le secteur public,', 'strong'], ["l'ENS s'impose.", 'accent']],
        sub: "Catégorisation, analyse des risques, plan d'adéquation et audit. De la déclaration de conformité à la certification, avec un périmètre ajusté à vos services réels.",
        cta: [["Voir l'ENS", '/areas/ciberseguridad/ens.html', 'btn-orange'], ["Parler à l'équipe", '/contacto.html', 'btn-primary']],
        rotulo: 'Niveaux de catégorie',
        items: [['BASIQUE', 'Déclaration de conformité'], ['MOYEN', 'Certification par un organisme accrédité'], ['ÉLEVÉ', 'Certification et contrôle renforcé']],
        pie: "La catégorie dépend de l'impact, pas de la taille.",
      },
      consultify: {
        pre: 'CONSULTIFY · CONSEIL PAR ABONNEMENT',
        h: [['Votre ISO', ''], ['par abonnement,', 'strong'], ['chiffrée en 60 secondes.', 'accent']],
        sub: "Calculateur en ligne, proposition immédiate et accompagnement propulsé par IA. Aucune heure surprise : ce qui s'affiche est ce qui se signe.",
        cta: [['Calculez votre offre', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ["Qu'est-ce que Consultify", '/servicios/consultify.html', 'btn-primary']],
        desde: 'à partir de', precio: '350 €', periodo: '/mois', iva: 'hors TVA',
        bullets: ['9 normes dans le calculateur', 'Proposition PDF immédiate', 'Engagement minimum 12 mois'],
      },
      orbita: {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Votre projet,', ''], ['en temps réel,', 'strong'], ['sans e-mails perdus.', 'accent']],
        sub: "Portail client et tableau de bord de l'équipe : tâches avec responsable et date, documents du système et agenda partagé au même endroit.",
        cta: [['Entrer dans Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['Comment ça marche', '/servicios-tecnologicos.html', 'btn-primary']],
        rotulo: 'Votre projet maintenant',
        tareas: [['Analyse du contexte', 'hecho'], ['Cartographie des processus', 'en curso'], ['Audit interne', 'planificada']],
        estados: { hecho: 'fait', 'en curso': 'en cours', planificada: 'planifié' },
      },
      eco: {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [["L'écosystème", ''], ['humain', 'strong'], ['propulsé par IA.', 'accent']],
        sub: 'Des personnes qui connaissent votre secteur et une technologie qui avale le travail répétitif. Trois marques, une équipe.',
        cta: [['Qui sommes-nous', '/quienes-somos.html', 'btn-orange'], ['Prenez rendez-vous', '/contacto.html', 'btn-primary']],
        papeles: [['TuConsultor', 'Le conseil, accompagnement sur mesure'], ['Consultify', 'Le produit par abonnement, prix fixe'], ['Orbita 360', 'Là où vit votre projet']],
      },
    },
    de: {
      mandos: { ant: 'Zurück', sig: 'Weiter', ir: 'Zu Anzeige', de: 'von' },
      modelos: {
        rotulo: 'Betreuungsmodelle', pie: 'Sie wählen die Intensität. Der Preis folgt den Stunden.',
        items: [
          ['Apoyo', 'Vorausbezahltes Stundenpaket', ''],
          ['Relación', '2 h online pro System und Monat', ''],
          ['Implicación', '4 h online pro System + 2 h vor Ort', 'am häufigsten gewählt'],
          ['Compromiso', '6 h online pro System + 2 h vor Ort', ''],
        ],
      },
      ens: {
        pre: 'ENS · SPANISCHES DEKRET 311/2022',
        h: [['Wer mit der', ''], ['öffentlichen Hand arbeitet,', 'strong'], ['braucht ENS.', 'accent']],
        sub: 'Kategorisierung, Risikoanalyse, Anpassungsplan und Audit. Von der Konformitätserklärung bis zur Zertifizierung, mit passendem Anwendungsbereich.',
        cta: [['ENS ansehen', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['Team kontaktieren', '/contacto.html', 'btn-primary']],
        rotulo: 'Kategoriestufen',
        items: [['NIEDRIG', 'Konformitätserklärung'], ['MITTEL', 'Zertifizierung durch akkreditierte Stelle'], ['HOCH', 'Zertifizierung und verstärkte Kontrolle']],
        pie: 'Die Kategorie richtet sich nach der Auswirkung, nicht nach der Größe.',
      },
      consultify: {
        pre: 'CONSULTIFY · BERATUNG IM ABO',
        h: [['Ihre ISO', ''], ['im Abo,', 'strong'], ['Preis in 60 Sekunden.', 'accent']],
        sub: 'Online-Rechner, Angebot in Sekunden und KI-gestützte Begleitung. Keine Überraschungsstunden: was auf dem Bildschirm steht, wird unterschrieben.',
        cta: [['Angebot berechnen', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['Was ist Consultify', '/servicios/consultify.html', 'btn-primary']],
        desde: 'ab', precio: '350 €', periodo: '/Monat', iva: 'zzgl. MwSt.',
        bullets: ['9 Normen im Rechner', 'PDF-Angebot sofort', 'Mindestlaufzeit 12 Monate'],
      },
      orbita: {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['Ihr Projekt,', ''], ['in Echtzeit,', 'strong'], ['ohne verlorene Mails.', 'accent']],
        sub: 'Kundenportal und Dashboard des Beratungsteams: Aufgaben mit Verantwortung und Termin, Systemdokumente und gemeinsamer Kalender an einem Ort.',
        cta: [['Zu Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['So funktioniert es', '/servicios-tecnologicos.html', 'btn-primary']],
        rotulo: 'Ihr Projekt jetzt',
        tareas: [['Kontextanalyse', 'hecho'], ['Prozesslandkarte', 'en curso'], ['Internes Audit', 'planificada']],
        estados: { hecho: 'erledigt', 'en curso': 'läuft', planificada: 'geplant' },
      },
      eco: {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['Das menschliche', ''], ['Ökosystem,', 'strong'], ['angetrieben von KI.', 'accent']],
        sub: 'Menschen, die Ihre Branche kennen, und Technik, die die Routinearbeit schluckt. Drei Marken, ein Team.',
        cta: [['Über uns', '/quienes-somos.html', 'btn-orange'], ['Termin anfragen', '/contacto.html', 'btn-primary']],
        papeles: [['TuConsultor', 'Die Beratung, maßgeschneidert'], ['Consultify', 'Das Abo-Produkt, Festpreis'], ['Orbita 360', 'Das Werkzeug für Ihr Projekt']],
      },
    },
    ar: {
      mandos: { ant: 'السابق', sig: 'التالي', ir: 'انتقل إلى', de: 'من' },
      modelos: {
        rotulo: 'نماذج المتابعة', pie: 'اختر كثافة المتابعة. السعر يتبع الساعات.',
        items: [
          ['Apoyo', 'حزمة ساعات مدفوعة مقدمًا', ''],
          ['Relación', 'ساعتان عبر الإنترنت لكل نظام شهريًا', ''],
          ['Implicación', '٤ ساعات لكل نظام + ساعتان حضوريًا', 'الأكثر اختيارًا'],
          ['Compromiso', '٦ ساعات لكل نظام + ساعتان حضوريًا', ''],
        ],
      },
      ens: {
        pre: 'ENS · المرسوم الملكي الإسباني ٣١١/٢٠٢٢',
        h: [['إذا كنت تعمل مع', ''], ['القطاع العام،', 'strong'], ['فنظام ENS إلزامي.', 'accent']],
        sub: 'التصنيف وتحليل المخاطر وخطة التوافق والتدقيق. من إعلان المطابقة إلى الشهادة، بنطاق يوافق ما تقدّمه فعلًا.',
        cta: [['تعرّف على ENS', '/areas/ciberseguridad/ens.html', 'btn-orange'], ['تحدّث مع الفريق', '/contacto.html', 'btn-primary']],
        rotulo: 'مستويات التصنيف',
        items: [['أساسي', 'إعلان المطابقة'], ['متوسط', 'شهادة من جهة معتمدة'], ['عالٍ', 'شهادة ورقابة مُعزّزة']],
        pie: 'التصنيف يحدده الأثر، لا حجم الشركة.',
      },
      consultify: {
        pre: 'CONSULTIFY · استشارات بالاشتراك',
        h: [['شهادة الأيزو', ''], ['بالاشتراك،', 'strong'], ['بسعر في ٦٠ ثانية.', 'accent']],
        sub: 'حاسبة على الإنترنت وعرض فوري ومواكبة مدعومة بالذكاء الاصطناعي. لا ساعات مفاجئة: ما تراه هو ما تُوقّعه.',
        cta: [['احسب عرضك', 'https://consultify.tuconsultor.com/app/calculadora', 'btn-orange'], ['ما هو Consultify', '/servicios/consultify.html', 'btn-primary']],
        desde: 'تبدأ من', precio: '٣٥٠ €', periodo: '/شهر', iva: 'قبل الضريبة',
        bullets: ['٩ معايير في الحاسبة', 'عرض PDF فوري', 'مدة لا تقل عن ١٢ شهرًا'],
      },
      orbita: {
        pre: 'ORBITA 360 · PM TOOL',
        h: [['مشروعك،', ''], ['في الوقت الحقيقي،', 'strong'], ['بلا رسائل ضائعة.', 'accent']],
        sub: 'بوابة العميل ولوحة الفريق الاستشاري: مهام بمسؤول وتاريخ، ومستندات النظام، وتقويم مشترك في مكان واحد.',
        cta: [['ادخل إلى Orbita 360', 'https://consultify.tuconsultor.com/app/acceso', 'btn-orange'], ['كيف يعمل', '/servicios-tecnologicos.html', 'btn-primary']],
        rotulo: 'مشروعك الآن',
        tareas: [['تحليل السياق', 'hecho'], ['خريطة العمليات', 'en curso'], ['تدقيق داخلي', 'planificada']],
        estados: { hecho: 'منجز', 'en curso': 'جارٍ', planificada: 'مُخطَّط' },
      },
      eco: {
        pre: 'TUCONSULTOR · CONSULTIFY · ORBITA 360',
        h: [['المنظومة', ''], ['الإنسانية', 'strong'], ['المدعومة بالذكاء الاصطناعي.', 'accent']],
        sub: 'أشخاص يعرفون قطاعك وتقنية تتولى العمل المتكرر. ثلاث علامات وفريق واحد.',
        cta: [['من نحن', '/quienes-somos.html', 'btn-orange'], ['احجز موعدًا', '/contacto.html', 'btn-primary']],
        papeles: [['TuConsultor', 'الاستشارات بمواكبة مخصّصة'], ['Consultify', 'المنتج بالاشتراك وبسعر مغلق'], ['Orbita 360', 'الأداة التي يعيش فيها مشروعك']],
      },
    },
  };
  var t = D[lang] || D.es;
  var L = t.mandos;

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ── Estilos ───────────────────────────────────────────────────────────────
  var css = [
    /* rejilla: texto a la izquierda, creatividad a la derecha */
    '.tc-b-slide{display:none}',
    '.tc-b-slide.tc-viva{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);',
    'gap:clamp(24px,4vw,54px);align-items:center;animation:tc-b-entra .5s ease both}',
    '@media(max-width:960px){.tc-b-slide.tc-viva{grid-template-columns:1fr;gap:22px}}',
    '@keyframes tc-b-entra{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}',
    '.tc-b-texto{min-width:0}',

    /* panel de la creatividad */
    '.tc-b-panel{--acento:#F99001;position:relative;border-radius:20px;padding:22px;min-width:0;',
    'background:linear-gradient(150deg,rgba(255,255,255,.075),rgba(255,255,255,.025));',
    'border:1px solid rgba(255,255,255,.13);box-shadow:0 22px 60px rgba(0,0,0,.32)}',
    '.tc-b-panel::before{content:"";position:absolute;inset:0;border-radius:20px;pointer-events:none;',
    'background:radial-gradient(120% 90% at 85% 0%,rgba(255,255,255,.07),transparent 62%);',
    'background:radial-gradient(120% 90% at 85% 0%,color-mix(in srgb,var(--acento) 22%,transparent),transparent 62%)}',
    '.tc-b-panel>*{position:relative}',
    '@media(max-width:960px){.tc-b-panel{padding:18px}}',

    '.tc-b-logo{height:26px;width:auto;max-width:180px;display:block;margin-bottom:16px}',
    '.tc-b-rotulo{margin:0 0 12px;font:700 10px/1 "Rubik",system-ui,sans-serif;letter-spacing:.2em;',
    'text-transform:uppercase;color:var(--acento)}',
    '.tc-b-pie{margin:14px 0 0;font-size:11.5px;line-height:1.45;color:rgba(255,255,255,.45)}',

    /* lista de modelos y de papeles */
    '.tc-b-lista{list-style:none;margin:0;padding:0;display:grid;gap:7px}',
    '.tc-b-lista li{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;padding:9px 12px;border-radius:12px;',
    'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.07)}',
    '.tc-b-lista li.tc-destacada{border-color:var(--acento);background:rgba(249,144,1,.14);',
    'background:color-mix(in srgb,var(--acento) 14%,transparent)}',
    '.tc-b-lista b{font:600 13.5px/1.2 "Rubik",system-ui,sans-serif;color:#fff;white-space:nowrap}',
    '.tc-b-lista span{flex:1 1 auto;min-width:0;font-size:11.5px;line-height:1.4;color:rgba(255,255,255,.62)}',
    '.tc-b-marca-mini{display:inline-block;padding:2px 7px;border-radius:999px;font-size:9.5px;font-weight:700;',
    'letter-spacing:.08em;text-transform:uppercase;background:var(--acento);color:#0A1024;margin-inline-start:auto;white-space:nowrap}',

    /* sellos de categoría del ENS */
    '.tc-b-sellos{display:grid;gap:8px}',
    '.tc-b-sello{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;',
    'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}',
    '.tc-b-sello i{flex:0 0 auto;width:38px;height:38px;border-radius:10px;display:grid;place-items:center;',
    'font:700 10px/1 "Rubik",system-ui,sans-serif;letter-spacing:.02em;font-style:normal;',
    'border:1.5px solid var(--acento);color:var(--acento);background:rgba(255,255,255,.08);',
    'background:color-mix(in srgb,var(--acento) 12%,transparent)}',
    '.tc-b-sello span{font-size:12px;line-height:1.35;color:rgba(255,255,255,.72)}',

    /* tarjeta de precio de Consultify */
    '.tc-b-precio{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;margin:0 0 4px}',
    '.tc-b-precio em{font-style:normal;font-size:12.5px;font-weight:700;letter-spacing:.1em;',
    'text-transform:uppercase;color:rgba(255,255,255,.5)}',
    '.tc-b-precio strong{font:600 clamp(38px,5.4vw,54px)/1 "Rubik",system-ui,sans-serif;color:#fff;letter-spacing:-.02em}',
    '.tc-b-precio i{font-style:normal;font-size:15px;font-weight:600;color:var(--acento)}',
    '.tc-b-checks{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:6px}',
    '.tc-b-checks li{display:flex;gap:8px;font-size:12px;line-height:1.4;color:rgba(255,255,255,.7)}',
    '.tc-b-checks li::before{content:"✓";color:var(--acento);font-weight:700;flex:0 0 auto}',

    /* mini panel de Orbita */
    '.tc-b-orbita{display:flex;gap:16px;align-items:center}',
    '.tc-b-orbita img{width:88px;height:88px;flex:0 0 auto}',
    '.tc-b-tareas{list-style:none;margin:0;padding:0;display:grid;gap:6px;flex:1;min-width:0}',
    '.tc-b-tareas li{display:flex;align-items:center;gap:8px;font-size:12px;color:rgba(255,255,255,.78)}',
    '.tc-b-tareas u{text-decoration:none;margin-inline-start:auto;padding:2px 7px;border-radius:999px;',
    'font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap}',
    '.tc-b-tareas .e-hecho u{background:rgba(52,211,153,.18);color:#6EE7B7}',
    '.tc-b-tareas .e-curso u{background:rgba(79,217,222,.2);color:var(--acento);',
    'background:color-mix(in srgb,var(--acento) 22%,transparent)}',
    '.tc-b-tareas .e-plan u{background:rgba(255,255,255,.1);color:rgba(255,255,255,.55)}',

    /* tres marcas del ecosistema */
    '.tc-b-marcas{display:grid;gap:10px}',
    '.tc-b-marcas div{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;',
    'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}',
    '.tc-b-marcas img{height:20px;width:auto;max-width:104px;flex:0 0 auto}',
    '.tc-b-marcas p{margin:0;font-size:11.5px;line-height:1.35;color:rgba(255,255,255,.6)}',
    '.tc-b-marcas .tc-b-nombre{font:600 13px/1 "Rubik",system-ui,sans-serif;color:#fff;flex:0 0 auto;min-width:96px}',

    /* mandos */
    '.tc-b-mandos{display:flex;align-items:center;gap:14px;margin:18px 0 22px;flex-wrap:wrap}',
    '.tc-b-puntos{display:flex;gap:8px;align-items:center}',
    '.tc-b-punto{width:11px;height:11px;padding:0;border:0;border-radius:50%;cursor:pointer;',
    'background:rgba(255,255,255,.26);transition:background .2s,transform .2s}',
    '.tc-b-punto:hover{background:rgba(255,255,255,.5)}',
    '.tc-b-punto[aria-current="true"]{background:var(--tc-naranja,#F99001);transform:scale(1.3);',
    'box-shadow:0 0 0 4px rgba(249,144,1,.22)}',
    '.tc-b-flecha{width:32px;height:32px;display:grid;place-items:center;border-radius:50%;cursor:pointer;',
    'border:1px solid rgba(255,255,255,.18);background:transparent;color:rgba(255,255,255,.6);',
    'font:700 14px/1 "Manrope",system-ui,sans-serif;transition:border-color .2s,color .2s}',
    '.tc-b-flecha:hover,.tc-b-flecha:focus-visible{border-color:var(--tc-naranja,#F99001);color:#fff;outline:none}',
    '.tc-b-cuenta{font-size:11px;font-weight:700;letter-spacing:.1em;color:rgba(255,255,255,.35)}',
    '@media(prefers-reduced-motion:reduce){.tc-b-slide.tc-viva{animation:none}}',
  ].join('');
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  // ── Paneles ───────────────────────────────────────────────────────────────
  function panel(acento, dentro) {
    return '<aside class="tc-b-panel" style="--acento:' + acento + '" aria-hidden="true">' + dentro + '</aside>';
  }
  var img = function (src, alto, clase) {
    return '<img class="' + (clase || 'tc-b-logo') + '" src="' + src + '" alt="" height="' + alto + '" loading="lazy" />';
  };

  function panelModelos() {
    var m = t.modelos;
    return panel('#F99001',
      img(LOGO.tuconsultor, 26)
      + '<p class="tc-b-rotulo">' + esc(m.rotulo) + '</p>'
      + '<ul class="tc-b-lista">' + m.items.map(function (x) {
          return '<li' + (x[2] ? ' class="tc-destacada"' : '') + '><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span>'
               + (x[2] ? '<span class="tc-b-marca-mini">' + esc(x[2]) + '</span>' : '') + '</li>';
        }).join('') + '</ul>'
      + '<p class="tc-b-pie">' + esc(m.pie) + '</p>');
  }

  function panelEns() {
    var e = t.ens;
    return panel('#4FD9DE',
      '<p class="tc-b-rotulo">' + esc(e.rotulo) + '</p>'
      + '<div class="tc-b-sellos">' + e.items.map(function (x) {
          return '<div class="tc-b-sello"><i>' + esc(x[0]) + '</i><span>' + esc(x[1]) + '</span></div>';
        }).join('') + '</div>'
      + '<p class="tc-b-pie">' + esc(e.pie) + '</p>');
  }

  function panelConsultify() {
    var c = t.consultify;
    return panel('#7FB3FF',
      img(LOGO.consultify, 26)
      + '<p class="tc-b-precio"><em>' + esc(c.desde) + '</em><strong>' + esc(c.precio) + '</strong>'
      + '<i>' + esc(c.periodo) + '</i><em>' + esc(c.iva) + '</em></p>'
      + '<ul class="tc-b-checks">' + c.bullets.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>');
  }

  function panelOrbita() {
    var o = t.orbita;
    var clase = { hecho: 'e-hecho', 'en curso': 'e-curso', planificada: 'e-plan' };
    return panel('#4FD9DE',
      '<p class="tc-b-rotulo">' + esc(o.rotulo) + '</p>'
      + '<div class="tc-b-orbita">' + img(LOGO.orbita, 88, '')
      + '<ul class="tc-b-tareas">' + o.tareas.map(function (x) {
          return '<li class="' + clase[x[1]] + '">' + esc(x[0]) + '<u>' + esc(o.estados[x[1]]) + '</u></li>';
        }).join('') + '</ul></div>');
  }

  function panelEco() {
    var e = t.eco;
    var logos = [LOGO.tuconsultor, LOGO.consultify, null];
    return panel('#1FA1A6',
      '<div class="tc-b-marcas">' + e.papeles.map(function (x, i) {
          var marca = logos[i] ? img(logos[i], 20, '') : '<span class="tc-b-nombre">' + esc(x[0]) + '</span>';
          return '<div>' + marca + '<p>' + esc(x[1]) + '</p></div>';
        }).join('') + '</div>'
      + '<p class="tc-b-pie">' + esc(e.pre) + '</p>');
  }

  // ── Anuncio 1: el hero real, envuelto en la rejilla ───────────────────────
  var cifras = hero.querySelector('.stats-row');
  if (cifras) cifras.remove();

  var pista = document.createElement('div');
  var primero = document.createElement('div');
  primero.className = 'tc-b-slide tc-viva';
  var texto1 = document.createElement('div');
  texto1.className = 'tc-b-texto';
  while (hero.firstChild) texto1.appendChild(hero.firstChild);
  primero.appendChild(texto1);
  primero.insertAdjacentHTML('beforeend', panelModelos());
  pista.appendChild(primero);

  // ── Anuncios 2 a 5 ────────────────────────────────────────────────────────
  var anuncios = [
    { d: t.ens, panel: panelEns },
    { d: t.consultify, panel: panelConsultify },
    { d: t.orbita, panel: panelOrbita },
    { d: t.eco, panel: panelEco },
  ];
  anuncios.forEach(function (a) {
    var d = document.createElement('div');
    d.className = 'tc-b-slide';
    d.innerHTML = '<div class="tc-b-texto">'
      + '<div class="pre-tag">' + esc(a.d.pre) + '</div>'
      + '<h2 class="tc-b-titular">' + a.d.h.map(function (l) {
          return '<span' + (l[1] ? ' class="' + l[1] + '"' : '') + '>' + esc(l[0]) + '</span>';
        }).join('') + '</h2>'
      + '<p class="sub">' + esc(a.d.sub) + '</p>'
      + '<div class="hero-actions">' + a.d.cta.map(function (c) {
          var externo = /^https?:/.test(c[1]);
          return '<a href="' + c[1] + '" class="btn ' + c[2] + '"'
               + (externo ? ' target="_blank" rel="noopener"' : '') + '>' + esc(c[0]) + '</a>';
        }).join('') + '</div>'
      + '</div>' + a.panel();
    pista.appendChild(d);
  });

  // El titular añadido hereda el tamaño del H1, pero es un H2: solo puede haber
  // un H1 por página.
  var h1 = hero.querySelector('h1') || texto1.querySelector('h1');
  if (h1) {
    var e1 = window.getComputedStyle(h1);
    var reglaH2 = document.createElement('style');
    reglaH2.textContent = '.tc-b-titular{font-size:' + e1.fontSize + ';line-height:' + e1.lineHeight
      + ';font-weight:' + e1.fontWeight + ';letter-spacing:' + e1.letterSpacing
      + ';margin:0 0 ' + e1.marginBottom + ';color:' + e1.color + '}'
      + '.tc-b-titular span{display:block}';
    document.head.appendChild(reglaH2);
  }

  hero.appendChild(pista);

  // ── Mandos ────────────────────────────────────────────────────────────────
  var total = 1 + anuncios.length;
  var mandos = document.createElement('div');
  mandos.className = 'tc-b-mandos';
  mandos.innerHTML = '<button type="button" class="tc-b-flecha" data-paso="-1" aria-label="' + esc(L.ant) + '">' + (rtl ? '›' : '‹') + '</button>'
    + '<div class="tc-b-puntos" role="tablist"></div>'
    + '<button type="button" class="tc-b-flecha" data-paso="1" aria-label="' + esc(L.sig) + '">' + (rtl ? '‹' : '›') + '</button>'
    + '<span class="tc-b-cuenta"><b>1</b> ' + esc(L.de) + ' ' + total + '</span>';
  hero.appendChild(mandos);
  if (cifras) hero.appendChild(cifras);

  var puntos = mandos.querySelector('.tc-b-puntos');
  for (var i = 0; i < total; i++) {
    var p = document.createElement('button');
    p.type = 'button'; p.className = 'tc-b-punto';
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
    var f = e.target.closest('.tc-b-flecha'), pt = e.target.closest('.tc-b-punto');
    if (f) { mostrar(actual + Number(f.dataset.paso)); reiniciar(); }
    else if (pt) { mostrar(Number(pt.dataset.i)); reiniciar(); }
  });

  var zona = hero.closest('.hero') || hero;
  zona.addEventListener('mouseenter', parar);
  zona.addEventListener('mouseleave', arrancar);
  zona.addEventListener('focusin', parar);
  zona.addEventListener('focusout', arrancar);
  document.addEventListener('visibilitychange', function () { document.hidden ? parar() : arrancar(); });

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
