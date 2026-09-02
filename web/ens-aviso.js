/* ═══════════════════════════════════════════════════════════════════════════
   AVISO ENS · captación en las páginas de ciberseguridad
   ---------------------------------------------------------------------------
   Criterios deliberados, para que ayude en lugar de molestar:

   · Solo aparece en /areas/ciberseguridad/ y solo una vez por visitante.
   · Nunca se muestra en /contacto.html ni a quien ya ha hecho clic en un CTA:
     si la persona ya está convirtiendo, interrumpirla es contraproducente.
   · Nada de cuentas atrás falsas, ni escasez inventada, ni «no, prefiero
     seguir siendo vulnerable». El botón de descarte dice lo que hace.
   · Se cierra con Escape, con clic fuera, con la X y con el enlace de descarte.
     El foco queda atrapado dentro mientras está abierto y vuelve a su sitio al
     cerrarse. Respeta prefers-reduced-motion.
   · Se recuerda el descarte 60 días en localStorage. Si no hay localStorage
     disponible, no se muestra: mejor perder un lead que ser pesado.

   Disparadores (el primero que ocurra):
     · intención de salida en escritorio (el cursor sale por arriba)
     · 55 segundos de permanencia
     · 65 % de scroll
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var CLAVE = 'tc-ens-aviso-v1';
  var DIAS = 60;
  var RUTA = '/areas/ciberseguridad/';

  if (location.pathname.indexOf(RUTA) !== 0) return;
  if (location.pathname.indexOf('/contacto') > -1) return;

  var almacen;
  try {
    almacen = window.localStorage;
    almacen.setItem('tc-test', '1');
    almacen.removeItem('tc-test');
  } catch (e) { return; }

  try {
    var guardado = almacen.getItem(CLAVE);
    if (guardado && Date.now() - Number(guardado) < DIAS * 864e5) return;
  } catch (e) { return; }

  var mostrado = false, fondo = null, foco = null;

  function marcar() {
    try { almacen.setItem(CLAVE, String(Date.now())); } catch (e) {}
  }

  function cerrar() {
    if (!fondo) return;
    marcar();
    fondo.classList.remove('on');
    document.documentElement.style.overflow = '';
    var f = fondo;
    setTimeout(function () { if (f && f.parentNode) f.parentNode.removeChild(f); }, 250);
    fondo = null;
    if (foco && foco.focus) foco.focus();
    if (window.dataLayer) window.dataLayer.push({ event: 'ens_aviso_cerrado' });
  }

  function teclas(ev) {
    if (!fondo) return;
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); return; }
    if (ev.key !== 'Tab') return;
    var f = fondo.querySelectorAll('a[href], button, input, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var pri = f[0], ult = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === pri) { ev.preventDefault(); ult.focus(); }
    else if (!ev.shiftKey && document.activeElement === ult) { ev.preventDefault(); pri.focus(); }
  }

  function abrir() {
    if (mostrado) return;
    mostrado = true;
    foco = document.activeElement;

    fondo = document.createElement('div');
    fondo.className = 'tc-ens-fondo';
    fondo.innerHTML =
      '<div class="tc-ens" role="dialog" aria-modal="true" aria-labelledby="tc-ens-t">' +
        '<button class="tc-ens-cerrar" type="button" aria-label="Cerrar aviso">×</button>' +
        '<div class="tc-ens-eyebrow">Esquema Nacional de Seguridad</div>' +
        '<h2 id="tc-ens-t">¿Te piden el ENS <span class="accent">y no sabes por dónde empezar?</span></h2>' +
        '<p>Muchas empresas descubren en mitad de una licitación que el ENS es requisito de admisión, no un criterio puntuable. Y que la categoría que les corresponde no es la que suponían.</p>' +
        '<ul>' +
          '<li>Determinamos tu categoría con el pliego delante</li>' +
          '<li>Te decimos qué parte ya tienes cubierta</li>' +
          '<li>Plazo realista hasta la auditoría con entidad acreditada</li>' +
        '</ul>' +
        '<div class="tc-ens-acciones">' +
          '<a class="btn btn-orange" href="/contacto.html?s=ens-aviso" data-tc="form">Diagnóstico sin coste</a>' +
          '<a class="btn btn-primary" href="https://wa.me/34672462321?text=Hola%2C%20me%20piden%20el%20ENS%20para%20un%20pliego" rel="noopener" data-tc="wa">Escribir por WhatsApp</a>' +
        '</div>' +
        '<button class="tc-ens-no" type="button">Ahora no, gracias</button>' +
      '</div>';

    document.body.appendChild(fondo);
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { fondo.classList.add('on'); });

    fondo.querySelector('.tc-ens-cerrar').addEventListener('click', cerrar);
    fondo.querySelector('.tc-ens-no').addEventListener('click', cerrar);
    fondo.addEventListener('click', function (ev) { if (ev.target === fondo) cerrar(); });
    fondo.querySelectorAll('[data-tc]').forEach(function (a) {
      a.addEventListener('click', function () {
        marcar();
        if (window.dataLayer) window.dataLayer.push({ event: 'ens_aviso_clic', destino: a.getAttribute('data-tc') });
      });
    });
    document.addEventListener('keydown', teclas);

    var primero = fondo.querySelector('.btn');
    if (primero) primero.focus();
    if (window.dataLayer) window.dataLayer.push({ event: 'ens_aviso_visto' });
  }

  // Si la persona ya está convirtiendo, no la interrumpimos.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href*="contacto"], a[href^="tel:"], a[href*="wa.me"], a[href^="mailto:"]');
    if (a) { mostrado = true; marcar(); }
  }, true);

  var fino = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (fino) {
    document.addEventListener('mouseout', function (ev) {
      if (!ev.relatedTarget && ev.clientY <= 0) abrir();
    });
  }

  setTimeout(abrir, 55000);

  var atado = false;
  function alScroll() {
    var alto = document.documentElement.scrollHeight - window.innerHeight;
    if (alto > 0 && (window.scrollY / alto) > 0.65) {
      abrir();
      if (atado) { window.removeEventListener('scroll', alScroll); atado = false; }
    }
  }
  window.addEventListener('scroll', alScroll, { passive: true });
  atado = true;
})();
