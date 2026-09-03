/* ═══════════════════════════════════════════════════════════════════════════
   CORTINA DE BIENVENIDA · con selector de idioma
   ---------------------------------------------------------------------------
   Saluda a TuConsultor mientras carga la portada, con los cinco idiomas del
   sitio a la vista para poder elegir desde el primer segundo.

   La animación es el isotipo de la órbita SIN el logotipo «Orbita.PMTools»
   (marca/orbita-esfera-anim.svg): quien entra en tuconsultor.com viene a
   TuConsultor, y cambiarle la marca en la primera pantalla despista. Orbita.PMTools se presenta más abajo, en su anuncio del banner.

   Reglas de sensatez, porque una pantalla de carga mal hecha es una barrera:
     · Solo en la primera visita de la sesión (sessionStorage).
     · No aparece si el sistema pide movimiento reducido.
     · Se va al terminar de cargar, con un mínimo de 700 ms para que no
       parpadee y un tope duro de 3 s para no atrapar a nadie nunca.
     · Mientras el puntero o el teclado están sobre los idiomas, la cortina NO
       se cierra: cerrarse justo cuando alguien va a pulsar sería peor que no
       ofrecerlo.
     · Es una capa por encima: el contenido ya está en el DOM desde el primer
       byte, así que no afecta a lo que indexa Google.
     · Se salta con un clic fuera, con Escape o con el botón.

   El idioma elegido se recuerda (localStorage) sólo para destacarlo la próxima
   vez. NO se redirige a nadie automáticamente: una redirección por idioma
   sorprende al visitante y ensucia lo que ve el buscador.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var CLAVE_SESION = 'tc-orbita-preview';
  var CLAVE_IDIOMA = 'tc-idioma';
  var MIN = 4000;      // ms visible como mínimo
  var TOPE = 6000;    // ms como máximo, pase lo que pase

  // La presentación se ve AL MENOS 4 segundos. Antes duraba lo que tardara en
  // cargar la página, que en una conexión buena es medio segundo: se veía un
  // parpadeo en vez de una entrada. El tope sube en consecuencia: si no,
  // cortaría el mínimo por arriba.

  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem(CLAVE_SESION)) return;
    sessionStorage.setItem(CLAVE_SESION, '1');
  } catch (e) { /* sin sessionStorage, se muestra igual */ }

  // ── Idiomas del sitio ──────────────────────────────────────────────────────
  // ES vive en la raíz; el resto en su carpeta.
  var IDIOMAS = [
    { k: 'es', nombre: 'Español',  corto: 'ES', bandera: '🇪🇸', raiz: '/' },
    { k: 'en', nombre: 'English',  corto: 'EN', bandera: '🇬🇧', raiz: '/en/' },
    { k: 'fr', nombre: 'Français', corto: 'FR', bandera: '🇫🇷', raiz: '/fr/' },
    { k: 'de', nombre: 'Deutsch',  corto: 'DE', bandera: '🇩🇪', raiz: '/de/' },
    { k: 'ar', nombre: 'العربية',   corto: 'AR', bandera: '🇸🇦', raiz: '/ar/' },
  ];

  // Saludo grande en el idioma de la página, y debajo la bienvenida en los
  // otros cuatro: la cortina es la puerta de un sitio en cinco idiomas y así lo
  // dice desde el primer segundo, sin necesidad de rotar (la cortina dura menos
  // de un segundo y una rotación no se llegaría a ver).
  var T = {
    es: { cargando: 'Cargando', elige: 'Elige tu idioma', saltar: 'Entrar',
          saluda: ['Bienvenido a', 'TuConsultor'] },
    en: { cargando: 'Loading',  elige: 'Choose your language', saltar: 'Enter',
          saluda: ['Welcome to', 'TuConsultor'] },
    fr: { cargando: 'Chargement', elige: 'Choisissez votre langue', saltar: 'Entrer',
          saluda: ['Bienvenue chez', 'TuConsultor'] },
    de: { cargando: 'Wird geladen', elige: 'Sprache wählen', saltar: 'Eintreten',
          saluda: ['Willkommen bei', 'TuConsultor'] },
    ar: { cargando: 'جارٍ التحميل', elige: 'اختر لغتك', saltar: 'ابدأ',
          saluda: ['مرحبًا بك في', 'TuConsultor'] },
  };

  // Solo la palabra, para la línea multilingüe.
  var BIENVENIDA = { es: 'Bienvenido', en: 'Welcome', fr: 'Bienvenue', de: 'Willkommen', ar: 'مرحبًا' };

  var lang = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2).toLowerCase();
  var t = T[lang] || T.es;
  var rtl = lang === 'ar';

  /* Traduce la ruta actual a otro idioma. La cortina solo vive en las portadas,
     pero se resuelve en general para que sirva si algún día se usa en otras. */
  function rutaEn(destino) {
    var p = location.pathname;
    // Quitar el prefijo de idioma actual, si lo hay.
    var resto = p.replace(/^\/(en|fr|de|ar)(\/|$)/, '/');
    if (destino === 'es') return resto || '/';
    var raiz = '/' + destino + '/';
    return resto === '/' ? raiz : raiz.replace(/\/$/, '') + resto;
  }

  var css = ''
    + '#tc-preview{position:fixed;inset:0;z-index:var(--capa-presentacion,9800);display:grid;place-items:center;'
    + 'background:radial-gradient(circle at 50% 42%,#123244 0%,#0E1730 60%,#0A1024 100%);'
    + 'transition:opacity .45s ease,visibility .45s ease}'
    + '#tc-preview.tc-fuera{opacity:0;visibility:hidden;pointer-events:none}'
    + '#tc-preview .tc-p-caja{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px}'
    + '#tc-preview img{width:min(150px,32vw);height:auto;display:block}'
    + "#tc-preview .tc-p-saludo{margin:0;text-align:center;"
    + "font-family:'Rubik','Noto Sans Arabic',system-ui,sans-serif;letter-spacing:-.015em;"
    + 'font-weight:600;line-height:1.15;font-size:clamp(1.35rem,3.4vw,2.1rem);color:#fff}'
    + '#tc-preview .tc-p-saludo b{display:block;font-weight:700;color:var(--tc-naranja,#F99001)}'
    + '#tc-preview .tc-p-progreso{width:190px;height:2px;margin:14px auto 0;border-radius:2px;'
    +   'background:rgba(255,255,255,.14);overflow:hidden}'
    + '#tc-preview .tc-p-progreso i{display:block;height:100%;width:0;border-radius:2px;'
    +   'background:linear-gradient(90deg,#1FA1A6,#F99001);animation:tc-p-avanza 4s linear forwards}'
    + '@keyframes tc-p-avanza{from{width:0}to{width:100%}}'
    + '#tc-preview .tc-p-marcas{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;'
    +   'gap:12px;margin-top:26px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);opacity:.75}'
    + '#tc-preview .tc-p-marcas img{height:17px;width:auto;display:block}'
    + '#tc-preview .tc-p-marcas span{color:#5E8494;font-size:13px}'
    + '@media (max-width:520px){#tc-preview .tc-p-marcas{gap:8px}'
    +   '#tc-preview .tc-p-marcas img{height:14px}#tc-preview .tc-p-marcas span{display:none}}'
    // Quien tenga reducido el movimiento no ve la barra avanzar: se le muestra
    // llena, porque su función es informar, no animar.
    + '@media (prefers-reduced-motion:reduce){#tc-preview .tc-p-progreso i{animation:none;width:100%}}'
    + '#tc-preview .tc-p-otros{display:flex;flex-wrap:wrap;gap:4px 12px;justify-content:center;'
    + "margin:0;font:500 12.5px/1.4 'Rubik','Noto Sans Arabic',system-ui,sans-serif;"
    + "color:rgba(255,255,255,.62)}"
    + '#tc-preview .tc-p-otros span{white-space:nowrap}'
    + '#tc-preview .tc-p-otros span+span::before{content:\'·\';margin-inline-end:12px;opacity:.5}'
    + '#tc-preview .tc-p-linea{width:min(170px,34vw);height:2px;border-radius:2px;'
    + 'background:rgba(255,255,255,.14);overflow:hidden}'
    + '#tc-preview .tc-p-linea i{display:block;height:100%;width:35%;border-radius:2px;'
    + 'background:linear-gradient(90deg,#1FA1A6,#F99001);animation:tc-p-va 1.15s ease-in-out infinite}'
    + '@keyframes tc-p-va{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}'
    + "#tc-preview .tc-p-rot{font:700 10px/1 'Manrope',system-ui,sans-serif;letter-spacing:.2em;"
    + 'text-transform:uppercase;color:rgba(255,255,255,.62);margin-top:6px}'
    + '#tc-preview .tc-p-idiomas{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:340px}'
    + '#tc-preview .tc-p-idioma{display:inline-flex;align-items:center;gap:6px;cursor:pointer;'
    + 'border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.05);border-radius:999px;'
    + "padding:7px 13px;color:rgba(255,255,255,.78);font:700 12px/1 'Manrope',system-ui,sans-serif;"
    + 'text-decoration:none;transition:border-color .18s,color .18s,background .18s}'
    + '#tc-preview .tc-p-idioma:hover,#tc-preview .tc-p-idioma:focus-visible{'
    + 'border-color:#F99001;color:#fff;background:rgba(249,144,1,.14);outline:none}'
    + '#tc-preview .tc-p-idioma[aria-current="true"]{border-color:#1FA1A6;color:#fff;background:rgba(31,161,166,.18)}'
    + '#tc-preview .tc-p-saltar{margin-top:2px;background:none;border:0;cursor:pointer;'
    + "color:rgba(255,255,255,.4);font:700 11px/1 'Manrope',system-ui,sans-serif;letter-spacing:.14em;"
    + 'text-transform:uppercase}'
    + '#tc-preview .tc-p-saltar:hover{color:#fff}';

  var st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var recordado = null;
  try { recordado = localStorage.getItem(CLAVE_IDIOMA); } catch (e) {}

  var capa = document.createElement('div');
  capa.id = 'tc-preview';
  capa.setAttribute('role', 'status');
  capa.setAttribute('aria-label', t.saluda.join(' ') + ' · ' + t.cargando);
  if (rtl) capa.setAttribute('dir', 'rtl');

  var botones = IDIOMAS.map(function (i) {
    var activo = i.k === lang;
    return '<a class="tc-p-idioma" href="' + rutaEn(i.k) + '" hreflang="' + i.k + '" lang="' + i.k + '"'
      + ' data-idioma="' + i.k + '" aria-current="' + (activo ? 'true' : 'false') + '"'
      + ' title="' + i.nombre + '"><span aria-hidden="true">' + i.bandera + '</span>'
      + '<span>' + i.corto + '</span></a>';
  }).join('');

  capa.innerHTML = ''
    + '<div class="tc-p-caja">'
    + '<img src="/marca/orbita-esfera-anim.svg" alt="TuConsultor" width="300" height="300" />'
    + '<p class="tc-p-saludo">' + t.saluda[0] + '<b>' + t.saluda[1] + '</b></p>'
    + '<p class="tc-p-otros">' + IDIOMAS.filter(function (i) { return i.k !== lang; })
        .map(function (i) { return '<span lang="' + i.k + '">' + BIENVENIDA[i.k] + '</span>'; }).join('') + '</p>'
    + '<div class="tc-p-linea"><i></i></div>'
    // Cuenta atrás visible. Cuatro segundos sin saber cuánto queda se hacen
    // largos; con una barra que avanza, se esperan sin impaciencia.
    + '<div class="tc-p-progreso" role="presentation"><i></i></div>'
    + '<p class="tc-p-rot">' + t.elige + '</p>'
    + '<nav class="tc-p-idiomas" aria-label="' + t.elige + '">' + botones + '</nav>'
    + '<button type="button" class="tc-p-saltar">' + t.saltar + '</button>'
    // Las tres marcas al pie: quien llega por primera vez ve de un golpe que
    // TuConsultor, Consultify y Orbita son la misma casa. Es la pregunta que
    // se hace todo el mundo al ver tres nombres distintos.
    + '<div class="tc-p-marcas" aria-hidden="true">'
    +   '<img src="/marca/horizontal-dark.svg" alt="" />'
    +   '<span>·</span>'
    +   '<img src="/marca/consultify-horizontal-blanco.svg" alt="" />'
    +   '<span>·</span>'
    +   '<img src="/marca/orbita-pmtool-h-blanco.svg" alt="" />'
    + '</div>'
    + '</div>';

  function montar() {
    if (document.body && !document.getElementById('tc-preview')) document.body.appendChild(capa);
  }
  if (document.body) montar();
  else document.addEventListener('DOMContentLoaded', montar);

  var nacido = Date.now();
  var ido = false;
  var retenida = false;      // el puntero/teclado está sobre los idiomas
  var pendiente = false;     // ya toca cerrarse, en cuanto se suelte

  function quitar() {
    if (ido) return;
    if (retenida) { pendiente = true; return; }   // no cerrar bajo el dedo
    ido = true;
    capa.classList.add('tc-fuera');
    setTimeout(function () { if (capa.parentNode) capa.parentNode.removeChild(capa); }, 600);
  }
  function quitarConMinimo() {
    var falta = MIN - (Date.now() - nacido);
    setTimeout(quitar, falta > 0 ? falta : 0);
  }

  // Retener mientras se está eligiendo idioma.
  var zonaIdiomas = capa.querySelector('.tc-p-idiomas');
  ['mouseenter', 'focusin'].forEach(function (ev) {
    zonaIdiomas.addEventListener(ev, function () { retenida = true; });
  });
  ['mouseleave', 'focusout'].forEach(function (ev) {
    zonaIdiomas.addEventListener(ev, function () {
      retenida = false;
      if (pendiente) quitar();
    });
  });

  // Elegir idioma: se recuerda y se navega (el navegador hace el resto).
  zonaIdiomas.addEventListener('click', function (e) {
    var a = e.target.closest('.tc-p-idioma');
    if (!a) return;
    try { localStorage.setItem(CLAVE_IDIOMA, a.dataset.idioma); } catch (err) {}
    // El destino se abre en la misma pestaña; dejamos que el enlace haga su
    // trabajo y limpiamos la marca de sesión para que la cortina salga también
    // en el idioma nuevo (es la primera vez que se ve en ese idioma).
    try { sessionStorage.removeItem(CLAVE_SESION); } catch (err) {}
  });

  capa.querySelector('.tc-p-saltar').addEventListener('click', function (e) {
    e.stopPropagation(); retenida = false; quitar();
  });
  capa.addEventListener('click', function (e) {
    if (!e.target.closest('.tc-p-idiomas') && !e.target.closest('.tc-p-saltar')) quitar();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { retenida = false; quitar(); } });

  if (document.readyState === 'complete') quitarConMinimo();
  else window.addEventListener('load', quitarConMinimo);
  setTimeout(quitar, TOPE);   // red de seguridad

  // Si el idioma recordado no es el de esta página, se destaca el suyo para
  // que lo encuentre de un vistazo (sin moverle de sitio a nadie).
  if (recordado && recordado !== lang) {
    var suyo = capa.querySelector('.tc-p-idioma[data-idioma="' + recordado + '"]');
    if (suyo) {
      suyo.style.borderColor = '#F99001';
      suyo.style.background = 'rgba(249,144,1,.18)';
      suyo.style.color = '#fff';
    }
  }
})();
