/* ═══════════════════════════════════════════════════════════════════════════
   PREVIEW DE CARGA · Orbita 360
   ---------------------------------------------------------------------------
   Cortina con la marca animada mientras carga la portada. Reglas de sensatez,
   porque una pantalla de carga mal hecha es una barrera:

     · Solo en la primera visita de la sesión (sessionStorage).
     · No aparece si el sistema pide movimiento reducido.
     · Se va al terminar de cargar, con un mínimo de 700 ms para que no
       parpadee y un tope duro de 2,5 s para no atrapar a nadie nunca.
     · Es una capa por encima: el contenido ya está en el DOM desde el primer
       byte, así que no afecta a lo que indexa Google.
     · Se puede saltar con un clic o con Escape.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var CLAVE = 'tc-orbita-preview';
  var MIN = 700;      // ms visible como mínimo
  var TOPE = 2500;    // ms como máximo, pase lo que pase

  // Movimiento reducido → nos la saltamos entera.
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (sessionStorage.getItem(CLAVE)) return;
    sessionStorage.setItem(CLAVE, '1');
  } catch (e) { /* sin sessionStorage, se muestra igual */ }

  var css = ''
    + '#tc-preview{position:fixed;inset:0;z-index:99998;display:grid;place-items:center;'
    + 'background:radial-gradient(circle at 50% 45%,#123244 0%,#0E1730 60%,#0A1024 100%);'
    + 'transition:opacity .45s ease,visibility .45s ease}'
    + '#tc-preview.tc-fuera{opacity:0;visibility:hidden;pointer-events:none}'
    + '#tc-preview .tc-p-caja{display:flex;flex-direction:column;align-items:center;gap:18px}'
    + '#tc-preview img{width:min(210px,42vw);height:auto;display:block}'
    + '#tc-preview .tc-p-linea{width:min(180px,36vw);height:2px;border-radius:2px;'
    + 'background:rgba(255,255,255,.14);overflow:hidden}'
    + '#tc-preview .tc-p-linea i{display:block;height:100%;width:35%;border-radius:2px;'
    + 'background:linear-gradient(90deg,#1FA1A6,#F99001);animation:tc-p-va 1.15s ease-in-out infinite}'
    + '@keyframes tc-p-va{0%{transform:translateX(-110%)}100%{transform:translateX(320%)}}'
    + '#tc-preview .tc-p-saltar{background:none;border:0;color:rgba(255,255,255,.35);'
    + "font:600 11px/1 'Manrope',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;cursor:pointer}"
    + '#tc-preview .tc-p-saltar:hover{color:rgba(255,255,255,.7)}';

  var st = document.createElement('style');
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var capa = document.createElement('div');
  capa.id = 'tc-preview';
  capa.setAttribute('role', 'status');
  capa.setAttribute('aria-label', 'Cargando');
  capa.innerHTML = ''
    + '<div class="tc-p-caja">'
    + '<img src="/marca/orbita-pmtool.svg" alt="Orbita 360" width="300" height="350" />'
    + '<div class="tc-p-linea"><i></i></div>'
    + '<button type="button" class="tc-p-saltar">Saltar</button>'
    + '</div>';

  function montar() {
    if (document.body && !document.getElementById('tc-preview')) document.body.appendChild(capa);
  }
  if (document.body) montar();
  else document.addEventListener('DOMContentLoaded', montar);

  var nacido = Date.now();
  var ido = false;
  function quitar() {
    if (ido) return;
    ido = true;
    capa.classList.add('tc-fuera');
    setTimeout(function () { if (capa.parentNode) capa.parentNode.removeChild(capa); }, 600);
  }
  function quitarConMinimo() {
    var falta = MIN - (Date.now() - nacido);
    setTimeout(quitar, falta > 0 ? falta : 0);
  }

  if (document.readyState === 'complete') quitarConMinimo();
  else window.addEventListener('load', quitarConMinimo);
  setTimeout(quitar, TOPE);                                  // red de seguridad
  capa.addEventListener('click', quitar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') quitar(); });
})();
