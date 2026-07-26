/* ═══════════════════════════════════════════════════════════════════════════
   PREVIEW DE CARGA · Orbita 360 · con selector de idioma
   ---------------------------------------------------------------------------
   Cortina con la marca animada mientras carga la portada, y con los cinco
   idiomas del sitio a la vista para poder elegir desde el primer segundo.

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
  var MIN = 700;      // ms visible como mínimo
  var TOPE = 3000;    // ms como máximo, pase lo que pase

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

  var T = {
    es: { cargando: 'Cargando', elige: 'Elige tu idioma', saltar: 'Entrar' },
    en: { cargando: 'Loading',  elige: 'Choose your language', saltar: 'Enter' },
    fr: { cargando: 'Chargement', elige: 'Choisissez votre langue', saltar: 'Entrer' },
    de: { cargando: 'Wird geladen', elige: 'Sprache wählen', saltar: 'Eintreten' },
    ar: { cargando: 'جارٍ التحميل', elige: 'اختر لغتك', saltar: 'ابدأ' },
  };

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
    + '#tc-preview{position:fixed;inset:0;z-index:99998;display:grid;place-items:center;'
    + 'background:radial-gradient(circle at 50% 42%,#123244 0%,#0E1730 60%,#0A1024 100%);'
    + 'transition:opacity .45s ease,visibility .45s ease}'
    + '#tc-preview.tc-fuera{opacity:0;visibility:hidden;pointer-events:none}'
    + '#tc-preview .tc-p-caja{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px}'
    + '#tc-preview img{width:min(190px,38vw);height:auto;display:block}'
    + '#tc-preview .tc-p-linea{width:min(170px,34vw);height:2px;border-radius:2px;'
    + 'background:rgba(255,255,255,.14);overflow:hidden}'
    + '#tc-preview .tc-p-linea i{display:block;height:100%;width:35%;border-radius:2px;'
    + 'background:linear-gradient(90deg,#1FA1A6,#F99001);animation:tc-p-va 1.15s ease-in-out infinite}'
    + '@keyframes tc-p-va{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}'
    + "#tc-preview .tc-p-rot{font:700 10px/1 'Manrope',system-ui,sans-serif;letter-spacing:.2em;"
    + 'text-transform:uppercase;color:rgba(255,255,255,.34);margin-top:6px}'
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
  capa.setAttribute('aria-label', t.cargando);
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
    + '<img src="/marca/orbita-pmtool.svg" alt="Orbita 360" width="300" height="350" />'
    + '<div class="tc-p-linea"><i></i></div>'
    + '<p class="tc-p-rot">' + t.elige + '</p>'
    + '<nav class="tc-p-idiomas" aria-label="' + t.elige + '">' + botones + '</nav>'
    + '<button type="button" class="tc-p-saltar">' + t.saltar + '</button>'
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
