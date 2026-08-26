/* ═══════════════════════════════════════════════════════════════════════════
   BANNER DE COOKIES · AEPD «Guía sobre el uso de las cookies» (julio 2023)

   Ajustado a los procedimientos SPLSSI0107 y SPLSSI0105 de Protechplus:

   · Primera capa: información, enlace a la política y TRES botones con el mismo
     peso visual. Rechazar no puede costar más que aceptar; si cuesta más, el
     consentimiento no es libre y no vale.
   · Segunda capa («Deber de informar»): desglose por categoría con nombre,
     finalidad, duración, gestor, transferencia internacional y datos usados
     para perfiles, y un interruptor real por categoría no técnica.
   · El interruptor hace lo que dice: activa o desactiva de verdad.
   · Renovación del consentimiento a los 24 meses, como recomienda el CEPD,
     conservando la elección mientras tanto sin volver a preguntar.
   · Cinco idiomas.

   ⚠ El inventario de abajo es el MEDIDO en este sitio. Como advierte el propio
   procedimiento, verificar su exactitud es responsabilidad del editor: si se
   añade una herramienta que ponga cookies, hay que declararla aquí.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var CLAVE = 'tc-cookies-v1';
  var MESES_RENOVACION = 24;          // recomendación del CEPD
  var lang = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2).toLowerCase();
  var rtl = lang === 'ar';

  // ── Inventario real ───────────────────────────────────────────────────────
  var INVENTARIO = {
    tecnicas: [
      { nombre: 'tc-cookies-v1', gestor: 'propia', duracion: { es: 'Persistente (24 meses)', en: 'Persistent (24 months)', fr: 'Persistant (24 mois)', de: 'Dauerhaft (24 Monate)', ar: 'دائم (٢٤ شهرًا)' },
        transferencia: false, perfiles: false,
        finalidad: { es: 'Recuerda qué has elegido sobre las cookies, para no volver a preguntártelo en cada visita.',
                     en: 'Remembers your cookie choice so you are not asked again on every visit.',
                     fr: 'Mémorise votre choix sur les cookies pour ne pas vous le redemander à chaque visite.',
                     de: 'Merkt sich Ihre Cookie-Auswahl, damit Sie nicht bei jedem Besuch erneut gefragt werden.',
                     ar: 'يتذكّر اختيارك بشأن ملفات تعريف الارتباط حتى لا نسألك في كل زيارة.' } },
      { nombre: 'tc-idioma', gestor: 'propia', duracion: { es: 'Persistente', en: 'Persistent', fr: 'Persistant', de: 'Dauerhaft', ar: 'دائم' },
        transferencia: false, perfiles: false,
        finalidad: { es: 'Guarda el idioma que has elegido para el sitio.', en: 'Stores the language you chose for the site.',
                     fr: 'Enregistre la langue choisie pour le site.', de: 'Speichert die für die Website gewählte Sprache.',
                     ar: 'يحفظ اللغة التي اخترتها للموقع.' } },
      { nombre: 'tc-orbita-preview', gestor: 'propia', duracion: { es: 'De sesión', en: 'Session', fr: 'De session', de: 'Sitzung', ar: 'للجلسة' },
        transferencia: false, perfiles: false,
        finalidad: { es: 'Evita repetir la animación de entrada dentro de la misma sesión.',
                     en: 'Avoids repeating the intro animation within the same session.',
                     fr: "Évite de répéter l'animation d'accueil dans la même session.",
                     de: 'Vermeidet das Wiederholen der Eingangsanimation in derselben Sitzung.',
                     ar: 'يمنع تكرار حركة الدخول ضمن الجلسة نفسها.' } },
    ],
    analiticas: [
      { nombre: '_ga', gestor: 'Google Analytics', duracion: { es: 'Persistente (2 años)', en: 'Persistent (2 years)', fr: 'Persistant (2 ans)', de: 'Dauerhaft (2 Jahre)', ar: 'دائم (سنتان)' },
        transferencia: true, perfiles: true,
        finalidad: { es: 'Distingue visitantes para medir cuánta gente entra y por dónde llega, en forma estadística.',
                     en: 'Distinguishes visitors to measure how many people arrive and where from, statistically.',
                     fr: 'Distingue les visiteurs pour mesurer statistiquement la fréquentation et sa provenance.',
                     de: 'Unterscheidet Besucher, um statistisch zu messen, wie viele kommen und woher.',
                     ar: 'يميّز الزوار لقياس عدد الزيارات ومصدرها إحصائيًا.' } },
      { nombre: '_ga_PKVWZF5N', gestor: 'Google Analytics', duracion: { es: 'Persistente (2 años)', en: 'Persistent (2 years)', fr: 'Persistant (2 ans)', de: 'Dauerhaft (2 Jahre)', ar: 'دائم (سنتان)' },
        transferencia: true, perfiles: true,
        finalidad: { es: 'Mantiene el estado de la sesión de medición de este sitio.',
                     en: 'Keeps the measurement session state for this site.',
                     fr: 'Conserve l’état de la session de mesure de ce site.',
                     de: 'Behält den Messsitzungsstatus dieser Website bei.',
                     ar: 'يحافظ على حالة جلسة القياس لهذا الموقع.' } },
    ],
  };

  // ── Textos ────────────────────────────────────────────────────────────────
  var T = {
    es: {
      titulo: 'Cookies',
      primera: 'Utilizamos cookies técnicas y de análisis, propias y de terceros, necesarias para el correcto funcionamiento del sitio web, y que nos permiten analizar su navegación y ofrecerle diversas funcionalidades dentro del sitio. Para obtener información adicional, consulte nuestra',
      politica: 'Política de Cookies',
      menores: 'Si tienes menos de 14 años, pide a tu padre, madre o tutor que lea este mensaje.',
      aceptar: 'Aceptar todas', rechazar: 'Rechazar todas', configurar: 'Configurar cookies',
      guardar: 'Guardar mi elección', volver: '← Volver',
      capa2: 'Deber de informar sobre cookies',
      intro2: 'Desglose de las cookies que usa este sitio. Las técnicas son necesarias para que funcione y no se pueden desactivar. El resto solo se activan si las aceptas.',
      catTec: 'Cookies técnicas', catAna: 'Cookies de análisis o medición',
      defTec: 'Son las que permiten la navegación por el sitio y el uso de sus opciones. Su no aceptación podría dificultar o impedir la navegación.',
      defAna: 'Permiten cuantificar el número de personas usuarias y hacer la medición estadística del uso del servicio, para mejorar lo que ofrecemos.',
      fNombre: 'Nombre', fGestor: 'Gestor', fDuracion: 'Duración', fTransf: 'Transferencia internacional',
      fPerfiles: 'Datos usados para perfiles', fFinalidad: 'Finalidad',
      siTransf: 'Sí, a Estados Unidos (Google). Puede consultar las garantías en policies.google.com',
      noTransf: 'No hay transferencia', siPerfiles: 'Dirección IP de conexión', noPerfiles: 'Ninguno',
      propia: 'Propia', activar: 'Activar cookies de análisis',
      renovado: 'Han pasado 24 meses desde tu última elección. Confírmala, por favor.',
    },
    en: {
      titulo: 'Cookies',
      primera: 'We use technical and analytics cookies, our own and third-party, needed for the website to work properly and which let us analyse your browsing and offer you various features. For further information, see our',
      politica: 'Cookie Policy',
      menores: 'If you are under 14, ask your parent or guardian to read this message.',
      aceptar: 'Accept all', rechazar: 'Reject all', configurar: 'Configure cookies',
      guardar: 'Save my choice', volver: '← Back',
      capa2: 'Duty to inform about cookies',
      intro2: 'Breakdown of the cookies this site uses. Technical ones are needed for it to work and cannot be switched off. The rest are only set if you accept them.',
      catTec: 'Technical cookies', catAna: 'Analytics or measurement cookies',
      defTec: 'These allow browsing the site and using its options. Not accepting them could hinder or prevent navigation.',
      defAna: 'These let us count users and measure use of the service statistically, to improve what we offer.',
      fNombre: 'Name', fGestor: 'Manager', fDuracion: 'Duration', fTransf: 'International transfer',
      fPerfiles: 'Data used for profiling', fFinalidad: 'Purpose',
      siTransf: 'Yes, to the United States (Google). Safeguards at policies.google.com',
      noTransf: 'No transfer', siPerfiles: 'Connection IP address', noPerfiles: 'None',
      propia: 'Own', activar: 'Enable analytics cookies',
      renovado: '24 months have passed since your last choice. Please confirm it.',
    },
    fr: {
      titulo: 'Cookies',
      primera: "Nous utilisons des cookies techniques et d'analyse, propres et de tiers, nécessaires au bon fonctionnement du site et qui nous permettent d'analyser votre navigation et de vous proposer diverses fonctionnalités. Pour plus d'informations, consultez notre",
      politica: 'Politique de cookies',
      menores: 'Si vous avez moins de 14 ans, demandez à votre parent ou tuteur de lire ce message.',
      aceptar: 'Tout accepter', rechazar: 'Tout refuser', configurar: 'Configurer les cookies',
      guardar: 'Enregistrer mon choix', volver: '← Retour',
      capa2: "Devoir d'information sur les cookies",
      intro2: "Détail des cookies utilisés par ce site. Les techniques sont nécessaires au fonctionnement et ne peuvent être désactivés. Les autres ne sont activés que si vous les acceptez.",
      catTec: 'Cookies techniques', catAna: "Cookies d'analyse ou de mesure",
      defTec: "Ils permettent la navigation sur le site et l'utilisation de ses options. Leur refus pourrait gêner ou empêcher la navigation.",
      defAna: "Ils permettent de quantifier le nombre d'utilisateurs et de mesurer statistiquement l'usage du service, pour améliorer notre offre.",
      fNombre: 'Nom', fGestor: 'Gestionnaire', fDuracion: 'Durée', fTransf: 'Transfert international',
      fPerfiles: 'Données utilisées pour le profilage', fFinalidad: 'Finalité',
      siTransf: 'Oui, vers les États-Unis (Google). Garanties sur policies.google.com',
      noTransf: 'Pas de transfert', siPerfiles: 'Adresse IP de connexion', noPerfiles: 'Aucune',
      propia: 'Propre', activar: "Activer les cookies d'analyse",
      renovado: '24 mois se sont écoulés depuis votre dernier choix. Merci de le confirmer.',
    },
    de: {
      titulo: 'Cookies',
      primera: 'Wir verwenden technische und Analyse-Cookies, eigene und von Dritten, die für den ordnungsgemäßen Betrieb der Website erforderlich sind und uns erlauben, Ihre Navigation auszuwerten und Ihnen verschiedene Funktionen anzubieten. Weitere Informationen in unserer',
      politica: 'Cookie-Richtlinie',
      menores: 'Wenn Sie unter 14 Jahre alt sind, bitten Sie einen Elternteil oder Erziehungsberechtigten, diese Nachricht zu lesen.',
      aceptar: 'Alle akzeptieren', rechazar: 'Alle ablehnen', configurar: 'Cookies konfigurieren',
      guardar: 'Auswahl speichern', volver: '← Zurück',
      capa2: 'Informationspflicht zu Cookies',
      intro2: 'Aufstellung der Cookies dieser Website. Technische sind für den Betrieb nötig und nicht abschaltbar. Alle anderen werden nur mit Ihrer Zustimmung gesetzt.',
      catTec: 'Technische Cookies', catAna: 'Analyse- oder Mess-Cookies',
      defTec: 'Sie ermöglichen die Navigation und die Nutzung der Optionen. Ihre Ablehnung kann die Navigation erschweren oder verhindern.',
      defAna: 'Sie erlauben es, die Zahl der Nutzenden zu quantifizieren und die Nutzung statistisch zu messen, um unser Angebot zu verbessern.',
      fNombre: 'Name', fGestor: 'Verwalter', fDuracion: 'Dauer', fTransf: 'Internationale Übermittlung',
      fPerfiles: 'Für Profile genutzte Daten', fFinalidad: 'Zweck',
      siTransf: 'Ja, in die USA (Google). Garantien unter policies.google.com',
      noTransf: 'Keine Übermittlung', siPerfiles: 'Verbindungs-IP-Adresse', noPerfiles: 'Keine',
      propia: 'Eigen', activar: 'Analyse-Cookies aktivieren',
      renovado: 'Seit Ihrer letzten Auswahl sind 24 Monate vergangen. Bitte bestätigen Sie sie.',
    },
    ar: {
      titulo: 'ملفات تعريف الارتباط',
      primera: 'نستخدم ملفات تعريف ارتباط تقنية وتحليلية، خاصة بنا ومن أطراف ثالثة، لازمة لعمل الموقع بشكل صحيح وتتيح لنا تحليل تصفحك وتقديم وظائف متعددة داخل الموقع. لمزيد من المعلومات راجع',
      politica: 'سياسة ملفات تعريف الارتباط',
      menores: 'إذا كان عمرك أقل من ١٤ عامًا، اطلب من والديك أو وليّ أمرك قراءة هذه الرسالة.',
      aceptar: 'قبول الكل', rechazar: 'رفض الكل', configurar: 'إعدادات ملفات الارتباط',
      guardar: 'حفظ اختياري', volver: '→ رجوع',
      capa2: 'واجب الإبلاغ عن ملفات تعريف الارتباط',
      intro2: 'تفصيل ملفات تعريف الارتباط التي يستخدمها هذا الموقع. التقنية لازمة لعمله ولا يمكن تعطيلها. أما البقية فلا تُفعّل إلا بموافقتك.',
      catTec: 'ملفات تقنية', catAna: 'ملفات التحليل والقياس',
      defTec: 'تتيح التصفح في الموقع واستخدام خياراته. قد يؤدي رفضها إلى إعاقة التصفح أو منعه.',
      defAna: 'تتيح حساب عدد المستخدمين وقياس استخدام الخدمة إحصائيًا لتحسين ما نقدّمه.',
      fNombre: 'الاسم', fGestor: 'الجهة المديرة', fDuracion: 'المدة', fTransf: 'النقل الدولي',
      fPerfiles: 'بيانات تُستخدم للملفات الشخصية', fFinalidad: 'الغرض',
      siTransf: 'نعم، إلى الولايات المتحدة (Google). الضمانات في policies.google.com',
      noTransf: 'لا يوجد نقل', siPerfiles: 'عنوان IP للاتصال', noPerfiles: 'لا شيء',
      propia: 'خاصة', activar: 'تفعيل ملفات التحليل',
      renovado: 'مرّت ٢٤ شهرًا على اختيارك الأخير. يُرجى تأكيده.',
    },
  };
  var t = T[lang] || T.es;

  // ── Estado guardado ───────────────────────────────────────────────────────
  function leer() {
    try {
      var v = localStorage.getItem(CLAVE);
      if (!v) return null;
      if (v.charAt(0) !== '{') return { analiticas: v === 'todas', fecha: 0 };   // formato antiguo
      return JSON.parse(v);
    } catch (e) { return null; }
  }
  function caducado(s) {
    if (!s || !s.fecha) return true;
    return (Date.now() - s.fecha) > MESES_RENOVACION * 30 * 864e5;
  }
  function guardar(analiticas) {
    try { localStorage.setItem(CLAVE, JSON.stringify({ analiticas: !!analiticas, fecha: Date.now() })); } catch (e) {}
    cerrar(); aplicar(analiticas);
  }
  function aplicar(analiticas) {
    window.tcCookiesAnaliticas = !!analiticas;
    // El interruptor tiene que HACER lo que dice: si se rechaza, se borran las
    // cookies de análisis ya puestas, no solo se deja de poner otras nuevas.
    if (!analiticas) borrarAnaliticas();
    try { document.dispatchEvent(new CustomEvent('tc-cookies', { detail: analiticas ? 'todas' : 'ninguna' })); } catch (e) {}
  }
  function borrarAnaliticas() {
    try {
      var dominio = '.' + location.hostname.replace(/^www\./, '');
      document.cookie.split(';').forEach(function (c) {
        var n = c.split('=')[0].trim();
        if (n.indexOf('_ga') === 0 || n.indexOf('_gid') === 0 || n.indexOf('_gat') === 0) {
          document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
          document.cookie = n + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=' + dominio;
        }
      });
    } catch (e) {}
  }

  // ── Pintado ───────────────────────────────────────────────────────────────
  var caja, previo;
  function cerrar() {
    if (caja) { caja.remove(); caja = null; }
    document.body.classList.remove('cookies-abiertas');
    document.removeEventListener('keydown', esc);
  }
  function esc(e) { if (e.key === 'Escape' && caja && caja.dataset.capa === '2') pintar(1); }
  function esconder(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  var BTN = 'display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;min-height:44px;' +
    'border-radius:999px;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit;border:1.5px solid #F99001;';
  var BTN_HUECO = BTN + 'background:transparent;color:#F99001;';
  var BTN_LLENO = BTN + 'background:#F99001;color:#0A2B3A;';

  function fichaCookie(c, i) {
    var filas = [
      [t.fNombre, '<code style="font-family:ui-monospace,monospace">' + esconder(c.nombre) + '</code>'],
      [t.fGestor, c.gestor === 'propia' ? t.propia : esconder(c.gestor)],
      [t.fDuracion, esconder(c.duracion[lang] || c.duracion.es)],
      [t.fTransf, c.transferencia ? t.siTransf : t.noTransf],
      [t.fPerfiles, c.perfiles ? t.siPerfiles : t.noPerfiles],
      [t.fFinalidad, esconder(c.finalidad[lang] || c.finalidad.es)],
    ];
    return '<div style="border:1px solid #1E5468;border-radius:12px;padding:12px 14px;margin-bottom:8px">' +
      filas.map(function (f) {
        return '<p style="margin:0 0 4px;font-size:12.5px;line-height:1.5;color:#B9D2DA">' +
          '<b style="color:#EAF4F7">' + f[0] + ':</b> ' + f[1] + '</p>';
      }).join('') + '</div>';
  }

  function pintar(capa) {
    cerrar();
    caja = document.createElement('div');
    caja.dataset.capa = String(capa);
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-modal', 'true');
    caja.setAttribute('aria-label', capa === 1 ? t.titulo : t.capa2);
    if (rtl) caja.setAttribute('dir', 'rtl');
    caja.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:var(--capa-cookies,10000);max-width:' +
      (capa === 1 ? '760px' : '860px') + ';margin:0 auto;max-height:86vh;overflow:auto;' +
      'background:#0A2B3A;border:1.5px solid #1E5468;border-radius:18px;padding:22px;color:#EAF4F7;' +
      'box-shadow:0 18px 50px rgba(0,0,0,.55);font-family:Manrope,system-ui,sans-serif;font-size:14px;line-height:1.6;' +
      'text-align:' + (rtl ? 'right' : 'left');

    var html = '';
    if (capa === 1) {
      html += '<p style="margin:0 0 6px;font-weight:800;font-size:16px">' + t.titulo + '</p>';
      html += '<p style="margin:0 0 10px;font-size:12px;color:#F99001;font-weight:700">' + t.menores + '</p>';
      html += '<p style="margin:0 0 16px;color:#B9D2DA">' + t.primera +
        ' <a href="/legal/cookies.html" style="color:#F99001;text-decoration:underline">' + t.politica + '</a>.</p>';
      if (previo === 'renovar') {
        html += '<p style="margin:0 0 14px;padding:8px 12px;border-radius:10px;background:rgba(249,144,1,.12);color:#F99001;font-size:12.5px">' + t.renovado + '</p>';
      }
      // Los tres, con el mismo peso: rechazar no puede costar más que aceptar.
      html += '<div style="display:flex;flex-wrap:wrap;gap:10px">' +
        '<button id="tc-ck-cf" style="' + BTN_HUECO + '">' + t.configurar + '</button>' +
        '<button id="tc-ck-no" style="' + BTN_HUECO + '">' + t.rechazar + '</button>' +
        '<button id="tc-ck-si" style="' + BTN_LLENO + '">' + t.aceptar + '</button>' +
        '</div>';
    } else {
      var s = leer();
      var marcado = s && s.analiticas ? ' checked' : '';
      html += '<p style="margin:0 0 4px;font-weight:800;font-size:16px">' + t.capa2 + '</p>';
      html += '<p style="margin:0 0 16px;color:#B9D2DA;font-size:13px">' + t.intro2 + '</p>';

      html += '<p style="margin:0 0 4px;font-weight:800;color:#F99001;font-size:13px">' + t.catTec + '</p>';
      html += '<p style="margin:0 0 10px;color:#9FC0CB;font-size:12.5px">' + t.defTec + '</p>';
      html += INVENTARIO.tecnicas.map(fichaCookie).join('');

      html += '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0 4px">' +
        '<p style="margin:0;font-weight:800;color:#F99001;font-size:13px">' + t.catAna + '</p>' +
        '<label style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:12.5px;color:#B9D2DA">' +
        '<input type="checkbox" id="tc-ck-ana"' + marcado + ' style="width:20px;height:20px;accent-color:#F99001;cursor:pointer" />' +
        t.activar + '</label></div>';
      html += '<p style="margin:0 0 10px;color:#9FC0CB;font-size:12.5px">' + t.defAna + '</p>';
      html += INVENTARIO.analiticas.map(fichaCookie).join('');

      html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">' +
        '<button id="tc-ck-volver" style="' + BTN_HUECO + '">' + t.volver + '</button>' +
        '<button id="tc-ck-guardar" style="' + BTN_LLENO + '">' + t.guardar + '</button>' +
        '</div>';
    }

    caja.innerHTML = html;
    document.body.appendChild(caja);
    // Marca el cuerpo: los botones flotantes se apartan para no taparlo.
    // Un botón de WhatsApp encima del aviso de cookies es justo lo que no
    // puede pasar, porque impide responder a algo obligatorio.
    document.body.classList.add('cookies-abiertas');

    var $ = function (id) { return caja.querySelector('#' + id); };
    if (capa === 1) {
      $('tc-ck-si').onclick = function () { guardar(true); };
      $('tc-ck-no').onclick = function () { guardar(false); };
      $('tc-ck-cf').onclick = function () { pintar(2); };
      $('tc-ck-cf').focus();
    } else {
      $('tc-ck-volver').onclick = function () { pintar(1); };
      $('tc-ck-guardar').onclick = function () { guardar($('tc-ck-ana').checked); };
      $('tc-ck-ana').focus();
    }
    document.addEventListener('keydown', esc);
  }

  // ── Arranque ──────────────────────────────────────────────────────────────
  var estado = leer();
  if (estado && !caducado(estado)) {
    aplicar(estado.analiticas);        // elección vigente: no se vuelve a preguntar
  } else {
    if (estado) previo = 'renovar';    // caducada a los 24 meses
    aplicar(false);                    // hasta que decida, nada de analíticas
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { pintar(1); });
    else pintar(1);
  }

  // Enlace «Configurar cookies» del pie: reabre la segunda capa.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-tc-cookies], a[href="#cookies"]');
    if (a) { e.preventDefault(); pintar(2); }
  });
})();
