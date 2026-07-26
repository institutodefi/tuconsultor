/* ═══════════════════════════════════════════════════════════════════════════
   FORMULARIO DE PROYECTO · se inyecta en la sección «Hablemos de tu proyecto»
   ---------------------------------------------------------------------------
   Un único fichero para las 288 páginas y los cinco idiomas del sitio: el
   idioma se toma de <html lang>. Envía a /api/contacto, que ya hace tres cosas
   (netlify/functions/contacto.mjs): correo a hola@tuconsultor.com, alta del
   contacto en Brevo y alta del lead en Orbita.PMTool como cliente potencial.

   Redacción con perspectiva de género en los cinco idiomas: sin masculino
   genérico, tratamiento directo en segunda persona.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var SECCION = '.final-cta';
  if (!document.querySelector(SECCION)) return;

  // ── Diccionario ───────────────────────────────────────────────────────────
  var T = {
    es: {
      titulo: 'Cuéntanos tu proyecto', o: 'o escríbenos a',
      nombre: 'Nombre y apellidos', empresa: 'Empresa', email: 'Correo electrónico',
      tel: 'Teléfono', tamano: 'Tamaño de la plantilla', necesidad: '¿Qué necesitas?',
      plazo: '¿Para cuándo?', mensaje: 'Cuéntanos brevemente tu situación',
      elige: 'Selecciona una opción',
      tamanos: ['1–9 personas', '10–49 personas', '50–249 personas', '250 o más'],
      necesidades: ['Certificarme por primera vez', 'Mantener un sistema ya certificado',
        'Ampliar a nuevas normas', 'Preparar una auditoría', 'Todavía no lo sé'],
      plazos: ['Cuanto antes', 'En 1–3 meses', 'En 3–6 meses', 'Solo estoy explorando'],
      privacidad: 'He leído y acepto la',
      privacidadEnlace: 'política de privacidad',
      comercial: 'Quiero recibir información sobre servicios y contenidos de TuConsultor.',
      enviar: 'Enviar mi consulta', enviando: 'Enviando…',
      okTitulo: '¡Recibido!',
      okTexto: 'Hemos registrado tu consulta. Una persona del equipo te responde en menos de 24 h laborables.',
      errorEnvio: 'No hemos podido enviar la consulta. Inténtalo de nuevo o escríbenos a hola@tuconsultor.com.',
      obligatorios: 'Revisa los campos obligatorios: nombre, correo, mensaje y aceptación de la política.',
      emailMal: 'El correo electrónico no parece válido.',
      nota: 'Campos marcados con * obligatorios.',
    },
    en: {
      titulo: 'Tell us about your project', o: 'or email us at',
      nombre: 'Full name', empresa: 'Company', email: 'Email address',
      tel: 'Phone', tamano: 'Headcount', necesidad: 'What do you need?',
      plazo: 'What is your timeline?', mensaje: 'Briefly describe your situation',
      elige: 'Select an option',
      tamanos: ['1–9 people', '10–49 people', '50–249 people', '250 or more'],
      necesidades: ['First-time certification', 'Maintaining a certified system',
        'Adding new standards', 'Preparing an audit', 'Not sure yet'],
      plazos: ['As soon as possible', 'In 1–3 months', 'In 3–6 months', 'Just exploring'],
      privacidad: 'I have read and accept the',
      privacidadEnlace: 'privacy policy',
      comercial: 'I would like to receive information about TuConsultor services and content.',
      enviar: 'Send my enquiry', enviando: 'Sending…',
      okTitulo: 'Got it!',
      okTexto: 'Your enquiry is registered. Someone from the team will reply within 24 working hours.',
      errorEnvio: 'We could not send your enquiry. Please try again or email hola@tuconsultor.com.',
      obligatorios: 'Please check the required fields: name, email, message and privacy acceptance.',
      emailMal: 'That email address does not look valid.',
      nota: 'Fields marked * are required.',
    },
    fr: {
      titulo: 'Parlez-nous de votre projet', o: 'ou écrivez-nous à',
      nombre: 'Nom et prénom', empresa: 'Entreprise', email: 'Adresse e-mail',
      tel: 'Téléphone', tamano: 'Effectif', necesidad: 'De quoi avez-vous besoin ?',
      plazo: 'Dans quel délai ?', mensaje: 'Décrivez brièvement votre situation',
      elige: 'Choisissez une option',
      tamanos: ['1–9 personnes', '10–49 personnes', '50–249 personnes', '250 ou plus'],
      necesidades: ['Première certification', 'Maintenir un système certifié',
        'Ajouter de nouvelles normes', 'Préparer un audit', 'Je ne sais pas encore'],
      plazos: ['Dès que possible', 'Dans 1–3 mois', 'Dans 3–6 mois', 'Simple exploration'],
      privacidad: "J'ai lu et j'accepte la",
      privacidadEnlace: 'politique de confidentialité',
      comercial: 'Je souhaite recevoir des informations sur les services et contenus de TuConsultor.',
      enviar: 'Envoyer ma demande', enviando: 'Envoi…',
      okTitulo: 'Bien reçu !',
      okTexto: "Votre demande est enregistrée. Une personne de l'équipe vous répond sous 24 h ouvrées.",
      errorEnvio: "Impossible d'envoyer la demande. Réessayez ou écrivez à hola@tuconsultor.com.",
      obligatorios: 'Vérifiez les champs obligatoires : nom, e-mail, message et acceptation de la politique.',
      emailMal: "L'adresse e-mail ne semble pas valide.",
      nota: 'Les champs marqués * sont obligatoires.',
    },
    de: {
      titulo: 'Erzählen Sie uns von Ihrem Projekt', o: 'oder schreiben Sie an',
      nombre: 'Vor- und Nachname', empresa: 'Unternehmen', email: 'E-Mail-Adresse',
      tel: 'Telefon', tamano: 'Beschäftigtenzahl', necesidad: 'Was brauchen Sie?',
      plazo: 'Bis wann?', mensaje: 'Beschreiben Sie kurz Ihre Situation',
      elige: 'Bitte auswählen',
      tamanos: ['1–9 Personen', '10–49 Personen', '50–249 Personen', '250 oder mehr'],
      necesidades: ['Erstzertifizierung', 'Ein zertifiziertes System pflegen',
        'Um neue Normen erweitern', 'Ein Audit vorbereiten', 'Noch unklar'],
      plazos: ['So schnell wie möglich', 'In 1–3 Monaten', 'In 3–6 Monaten', 'Nur informativ'],
      privacidad: 'Ich habe die',
      privacidadEnlace: 'Datenschutzerklärung',
      comercial: 'Ich möchte Informationen zu Leistungen und Inhalten von TuConsultor erhalten.',
      enviar: 'Anfrage senden', enviando: 'Senden…',
      okTitulo: 'Angekommen!',
      okTexto: 'Ihre Anfrage ist registriert. Das Team antwortet innerhalb von 24 Arbeitsstunden.',
      errorEnvio: 'Die Anfrage konnte nicht gesendet werden. Bitte erneut versuchen oder an hola@tuconsultor.com schreiben.',
      obligatorios: 'Bitte Pflichtfelder prüfen: Name, E-Mail, Nachricht und Datenschutz-Zustimmung.',
      emailMal: 'Die E-Mail-Adresse scheint nicht gültig zu sein.',
      nota: 'Mit * markierte Felder sind Pflichtfelder.',
      privacidadSufijo: 'gelesen und akzeptiere sie.',
    },
    ar: {
      titulo: 'حدثنا عن مشروعك', o: 'أو راسلنا على',
      nombre: 'الاسم الكامل', empresa: 'الشركة', email: 'البريد الإلكتروني',
      tel: 'الهاتف', tamano: 'عدد العاملين والعاملات', necesidad: 'ما الذي تحتاجه؟',
      plazo: 'ما هو الإطار الزمني؟', mensaje: 'اشرح لنا وضعك بإيجاز',
      elige: 'اختر خيارًا',
      tamanos: ['١–٩ أشخاص', '١٠–٤٩ شخصًا', '٥٠–٢٤٩ شخصًا', '٢٥٠ أو أكثر'],
      necesidades: ['الحصول على الشهادة لأول مرة', 'الحفاظ على نظام معتمد',
        'إضافة معايير جديدة', 'الإعداد لتدقيق', 'لا أعرف بعد'],
      plazos: ['في أسرع وقت', 'خلال ١–٣ أشهر', 'خلال ٣–٦ أشهر', 'مجرد استكشاف'],
      privacidad: 'قرأت وأوافق على',
      privacidadEnlace: 'سياسة الخصوصية',
      comercial: 'أرغب في تلقي معلومات عن خدمات ومحتوى TuConsultor.',
      enviar: 'إرسال الاستفسار', enviando: 'جارٍ الإرسال…',
      okTitulo: 'تم الاستلام!',
      okTexto: 'تم تسجيل استفسارك. سيرد عليك أحد أفراد الفريق خلال ٢٤ ساعة عمل.',
      errorEnvio: 'لم نتمكن من إرسال الاستفسار. حاول مرة أخرى أو راسلنا على hola@tuconsultor.com.',
      obligatorios: 'تحقق من الحقول المطلوبة: الاسم والبريد والرسالة والموافقة على السياسة.',
      emailMal: 'البريد الإلكتروني لا يبدو صحيحًا.',
      nota: 'الحقول المعلّمة بـ * مطلوبة.',
    },
  };

  var lang = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2).toLowerCase();
  var t = T[lang] || T.es;
  var rtl = lang === 'ar';
  var privacidadHref = '/legal/privacidad.html';

  // ── Estilos (autocontenidos: no dependen de estilo-base.css) ─────────────
  var css = ''
    + '.tc-fp{margin:32px auto 0;max-width:760px;text-align:' + (rtl ? 'right' : 'left') + ';'
    + 'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);'
    + 'border-radius:22px;padding:24px;backdrop-filter:blur(4px)}'
    + '.tc-fp h3{margin:0 0 4px;font-size:1.25rem;font-weight:600;color:#fff;text-align:center}'
    + '.tc-fp .tc-fp-sub{margin:0 0 18px;font-size:.85rem;color:rgba(255,255,255,.6);text-align:center}'
    + '.tc-fp .tc-fp-sub a{color:var(--tc-naranja,#F99001);font-weight:600}'
    + '.tc-fp-grid{display:grid;gap:14px;grid-template-columns:1fr 1fr}'
    + '.tc-fp-full{grid-column:1/-1}'
    + '@media(max-width:620px){.tc-fp-grid{grid-template-columns:1fr}.tc-fp{padding:16px}'
    + '.tc-fp-envio{flex-direction:column;align-items:stretch;gap:10px}'
    + '.tc-fp-envio .btn{width:100%;text-align:center;padding-block:13px}'
    + '.tc-fp-nota{text-align:center}}'
    + '.tc-fp label{display:block;font-size:.74rem;font-weight:700;letter-spacing:.08em;'
    + 'text-transform:uppercase;color:rgba(255,255,255,.72);margin-bottom:6px}'
    + '.tc-fp input,.tc-fp select,.tc-fp textarea{width:100%;box-sizing:border-box;'
    + 'font-family:inherit;font-size:16px;color:#fff;background:rgba(255,255,255,.09);'
    + 'border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:11px 13px;'
    + 'transition:border-color .15s,box-shadow .15s}'
    + '.tc-fp textarea{resize:vertical;min-height:96px}'
    + '.tc-fp input::placeholder,.tc-fp textarea::placeholder{color:rgba(255,255,255,.42)}'
    + '.tc-fp select option{color:#12303D;background:#fff}'
    + '.tc-fp input:focus,.tc-fp select:focus,.tc-fp textarea:focus{outline:none;'
    + 'border-color:var(--tc-naranja,#F99001);box-shadow:0 0 0 3px rgba(249,144,1,.28)}'
    + '.tc-fp-check{display:flex;gap:10px;align-items:center;min-height:24px;font-size:.84rem;'
    + 'line-height:1.5;color:rgba(255,255,255,.78);cursor:pointer}'
    + '.tc-fp-check input{width:24px;height:24px;flex:0 0 auto;margin:0;accent-color:var(--tc-naranja,#F99001)}'
    + '.tc-fp-check a{color:var(--tc-naranja,#F99001);font-weight:600;text-decoration:underline}'
    + '.tc-fp-envio{grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:14px;'
    + 'justify-content:space-between;margin-top:2px}'
    + '.tc-fp-nota{font-size:.74rem;color:rgba(255,255,255,.45)}'
    + '.tc-fp-aviso{grid-column:1/-1;border-radius:12px;padding:11px 13px;font-size:.85rem;font-weight:600}'
    + '.tc-fp-aviso.err{background:rgba(220,38,38,.18);color:#FECACA}'
    + '.tc-fp-ok{text-align:center;padding:14px 4px}'
    + '.tc-fp-ok h3{color:var(--tc-naranja,#F99001)}'
    + '.tc-fp-ok p{color:rgba(255,255,255,.8);font-size:.95rem;margin:6px 0 0}'
    + '.tc-fp-hp{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;'
    + 'clip-path:inset(50%);white-space:nowrap;border:0}';
  var st = document.createElement('style');
  st.setAttribute('data-tc', 'formulario-proyecto');
  st.textContent = css;
  document.head.appendChild(st);

  // ── Utilidades ───────────────────────────────────────────────────────────
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function opciones(lista) {
    return '<option value="">' + esc(t.elige) + '</option>'
      + lista.map(function (o) { return '<option value="' + esc(o) + '">' + esc(o) + '</option>'; }).join('');
  }
  function campo(id, etiqueta, extra, tipo, req) {
    return '<div class="' + (extra || '') + '"><label for="' + id + '">' + esc(etiqueta) + (req ? ' *' : '')
      + '</label><input id="' + id + '" name="' + id + '" type="' + (tipo || 'text') + '"'
      + (req ? ' required' : '') + ' /></div>';
  }
  function selector(id, etiqueta, lista) {
    return '<div><label for="' + id + '">' + esc(etiqueta) + '</label><select id="' + id + '" name="' + id + '">'
      + opciones(lista) + '</select></div>';
  }

  // Etiqueta del consentimiento: el alemán coloca el verbo al final.
  var textoPrivacidad = t.privacidadSufijo
    ? esc(t.privacidad) + ' <a href="' + privacidadHref + '" target="_blank" rel="noreferrer">' + esc(t.privacidadEnlace) + '</a> ' + esc(t.privacidadSufijo)
    : esc(t.privacidad) + ' <a href="' + privacidadHref + '" target="_blank" rel="noreferrer">' + esc(t.privacidadEnlace) + '</a>.';

  var html = ''
    + '<form class="tc-fp" novalidate' + (rtl ? ' dir="rtl"' : '') + '>'
    + '<h3>' + esc(t.titulo) + '</h3>'
    + '<p class="tc-fp-sub">' + esc(t.o) + ' <a href="mailto:hola@tuconsultor.com">hola@tuconsultor.com</a></p>'
    + '<div class="tc-fp-grid">'
    + campo('nombre', t.nombre, '', 'text', true)
    + campo('empresa', t.empresa)
    + campo('email', t.email, '', 'email', true)
    + campo('telefono', t.tel, '', 'tel')
    + selector('tamano', t.tamano, t.tamanos)
    + selector('necesidad', t.necesidad, t.necesidades)
    + selector('plazo', t.plazo, t.plazos)
    + '<div></div>'
    + '<div class="tc-fp-full"><label for="mensaje">' + esc(t.mensaje) + ' *</label>'
    + '<textarea id="mensaje" name="mensaje" required></textarea></div>'
    + '<div class="tc-fp-full"><label class="tc-fp-check"><input type="checkbox" id="acepta_privacidad" required />'
    + '<span>' + textoPrivacidad + ' *</span></label></div>'
    + '<div class="tc-fp-full"><label class="tc-fp-check"><input type="checkbox" id="acepta_comercial" />'
    + '<span>' + esc(t.comercial) + '</span></label></div>'
    + '<div class="tc-fp-hp"><label for="tc-fp-web">Web</label><input id="tc-fp-web" name="web" type="text" tabindex="-1" autocomplete="off" /></div>'
    + '<div class="tc-fp-envio"><button type="submit" class="btn btn-orange">' + esc(t.enviar) + '</button>'
    + '<span class="tc-fp-nota">' + esc(t.nota) + '</span></div>'
    + '</div></form>';

  // ── Inyección: en TODAS las secciones .final-cta de la página ─────────────
  var secciones = document.querySelectorAll(SECCION);
  for (var i = 0; i < secciones.length; i++) {
    var host = secciones[i].querySelector('.final-cta-inner') || secciones[i];
    if (host.querySelector('.tc-fp')) continue;
    var envoltorio = document.createElement('div');
    envoltorio.innerHTML = html;
    var form = envoltorio.firstChild;
    host.appendChild(form);
    conectar(form, secciones[i]);
  }

  function conectar(form, seccion) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var boton = form.querySelector('button[type="submit"]');
      var rejilla = form.querySelector('.tc-fp-grid');

      // Limpia avisos anteriores
      var viejo = form.querySelector('.tc-fp-aviso');
      if (viejo) viejo.remove();

      function avisar(texto) {
        var d = document.createElement('div');
        d.className = 'tc-fp-aviso err';
        d.setAttribute('role', 'alert');
        d.textContent = texto;
        rejilla.appendChild(d);
      }

      var v = function (id) { var e = form.querySelector('#' + id); return e ? e.value.trim() : ''; };
      var marcado = function (id) { var e = form.querySelector('#' + id); return !!(e && e.checked); };

      if (!v('nombre') || !v('email') || !v('mensaje') || !marcado('acepta_privacidad')) { avisar(t.obligatorios); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('email'))) { avisar(t.emailMal); return; }

      var etiquetaBoton = boton.textContent;
      boton.disabled = true;
      boton.textContent = t.enviando;

      var titulo = document.querySelector('h1');
      var carga = {
        nombre: v('nombre'), empresa: v('empresa'), email: v('email'), telefono: v('telefono'),
        tamano: v('tamano'), necesidad: v('necesidad'), plazo: v('plazo'), mensaje: v('mensaje'),
        producto: (titulo ? titulo.textContent.trim().slice(0, 120) : document.title.slice(0, 120)),
        origen: location.pathname + ' · formulario de proyecto · ' + lang,
        acepta_privacidad: 'si',
        acepta_comercial: marcado('acepta_comercial') ? 'si' : 'no',
        web: v('tc-fp-web'),
      };

      fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(carga),
      })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (j) {
          if (!j || !j.ok) throw new Error((j && j.error) || 'error');
          // Evento para Google Tag Manager (solo se registra si hay consentimiento).
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({
            event: 'formulario_proyecto_enviado',
            formulario: 'proyecto',
            idioma: lang,
            pagina: location.pathname,
            consentimiento_comercial: carga.acepta_comercial === 'si',
          });
          var ok = document.createElement('div');
          ok.className = 'tc-fp tc-fp-ok';
          ok.innerHTML = '<h3>' + esc(t.okTitulo) + '</h3><p>' + esc(t.okTexto) + '</p>';
          form.replaceWith(ok);
        })
        .catch(function () {
          boton.disabled = false;
          boton.textContent = etiquetaBoton;
          avisar(t.errorEnvio);
        });
    });
  }
})();
