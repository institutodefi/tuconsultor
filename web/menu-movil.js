/* ════════════════════════════════════════════════════════════════════════════
   MENÚ DE NAVEGACIÓN EN MÓVIL

   En pantallas estrechas `.nav-mid` se ocultaba con display:none y no había
   ningún botón para abrirlo: los seis enlaces de la navegación quedaban
   INALCANZABLES desde el móvil. No estaban escondidos, estaban perdidos.

   El botón se crea aquí y no se escribe en las 299 páginas: así hay un solo
   sitio donde arreglarlo.
   ══════════════════════════════════════════════════════════════════════════ */
(function () {
  var nav = document.querySelector('nav[aria-label]');
  if (!nav) return;
  var mid = nav.querySelector('.nav-mid');
  if (!mid || nav.querySelector('.nav-menu-btn')) return;

  var lang = (document.documentElement.getAttribute('lang') || 'es').slice(0, 2);
  var T = {
    es: { abrir: 'Abrir el menú', cerrar: 'Cerrar el menú' },
    en: { abrir: 'Open menu', cerrar: 'Close menu' },
    fr: { abrir: 'Ouvrir le menu', cerrar: 'Fermer le menu' },
    de: { abrir: 'Menü öffnen', cerrar: 'Menü schließen' },
    ar: { abrir: 'فتح القائمة', cerrar: 'إغلاق القائمة' },
  }[lang] || { abrir: 'Abrir el menú', cerrar: 'Cerrar el menú' };

  var btn = document.createElement('button');
  btn.className = 'nav-menu-btn';
  btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', 'nav-mid-menu');
  btn.setAttribute('aria-label', T.abrir);
  btn.innerHTML = '<span class="nav-menu-linea"></span>'
                + '<span class="nav-menu-linea"></span>'
                + '<span class="nav-menu-linea"></span>';

  mid.id = 'nav-mid-menu';

  // El botón va el PRIMERO de la barra derecha: es lo que se busca al llegar.
  var derecha = nav.querySelector('.nav-right');
  if (derecha) derecha.appendChild(btn);
  else nav.appendChild(btn);

  function alternar(abrir) {
    var estaba = nav.classList.contains('menu-abierto');
    var nuevo = abrir === undefined ? !estaba : abrir;
    nav.classList.toggle('menu-abierto', nuevo);
    btn.setAttribute('aria-expanded', String(nuevo));
    btn.setAttribute('aria-label', nuevo ? T.cerrar : T.abrir);
    document.body.style.overflow = nuevo ? 'hidden' : '';
  }

  btn.addEventListener('click', function () { alternar(); });

  // Se cierra al elegir un destino: dejarlo abierto tapa la página a la que
  // acabas de ir.
  mid.addEventListener('click', function (e) {
    if (e.target.closest('a')) alternar(false);
  });

  // Y con Escape, como cualquier cosa que se abre encima.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('menu-abierto')) {
      alternar(false);
      btn.focus();
    }
  });

  // Si se ensancha la ventana, el menú vuelve a su sitio y el estado se limpia:
  // si no, quedaría el desplazamiento bloqueado sin nada abierto.
  var ancha = window.matchMedia('(min-width: 861px)');
  (ancha.addEventListener ? ancha.addEventListener.bind(ancha, 'change') : ancha.addListener.bind(ancha))(
    function (e) { if (e.matches) alternar(false); });
})();
