/* ════════════════════════════════════════════════════════════════════════
   PREMIOS VANGUARDISTAS 2026 · CUENTA ATRÁS
   Mejora progresiva: sin este archivo, el módulo se sigue entendiendo. El
   HTML ya lleva escrita la fecha límite; esto solo la convierte en un
   contador vivo.

   ── Por qué el instante va escrito en UTC ──
   El cierre es el 30 de octubre de 2026 a las 23:59:59 hora de Madrid. Ese
   día España ya está en horario de invierno: el cambio fue el 25 de octubre,
   último domingo del mes. Así que el desfase es UTC+01:00, no UTC+02:00 como
   se anotó en el briefing. Escrito con la Z, el navegador del visitante lo
   interpreta igual esté donde esté, que es justo lo que se pedía: contar
   contra Madrid y no contra la hora local de quien mira.

   Si alguna vez cambia la fecha, hay que recalcular el desfase: en verano
   (última semana de marzo a última de octubre) Madrid es UTC+02:00.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // 2026-10-30 23:59:59 en Madrid (CET, UTC+01:00).
  var CIERRE = Date.parse('2026-10-30T22:59:59Z');
  // A partir de aquí el módulo de portada desaparece solo: el acto de entrega
  // es el 3 de diciembre a las 19:00 (UTC+01:00) y al día siguiente ya no
  // pinta nada en la home.
  var CADUCIDAD = Date.parse('2026-12-04T00:00:00Z');
  // Umbral de «últimos días», en días.
  var AVISO = 10;

  var DIA = 86400000, HORA = 3600000, MINUTO = 60000;

  function plural(n, singular, plural_) { return n === 1 ? singular : plural_; }

  // Rellena una caja de cifra («12» + «días»). Devuelve el texto plano
  // equivalente, para poder componer la etiqueta accesible.
  function pinta(caja, valor, singular, plural_) {
    if (!caja) return '';
    var num = caja.querySelector('[data-num]');
    var eti = caja.querySelector('[data-eti]');
    if (num) num.textContent = valor < 10 ? '0' + valor : String(valor);
    var palabra = plural(valor, singular, plural_);
    if (eti) eti.textContent = palabra;
    return valor + ' ' + palabra;
  }

  function arranca(raiz) {
    var reloj = raiz.querySelector('[data-cuenta-atras]');
    var estatico = raiz.querySelector('[data-plazo-estatico]');
    var cerrado = raiz.querySelector('[data-cerrado]');
    var cta = raiz.querySelector('[data-cta]');
    if (!reloj) return;

    var cajas = {
      d: reloj.querySelector('[data-dias]'),
      h: reloj.querySelector('[data-horas]'),
      m: reloj.querySelector('[data-minutos]'),
      s: reloj.querySelector('[data-segundos]')
    };

    function tick() {
      var resta = CIERRE - Date.now();

      // ── Plazo cerrado ──
      if (resta <= 0) {
        raiz.setAttribute('data-estado', 'cerrado');
        if (reloj) reloj.hidden = true;
        if (estatico) estatico.hidden = true;
        if (cerrado) cerrado.hidden = false;
        if (cta) {
          // El botón deja de llevar al formulario: ya no se puede presentar
          // nada. Lleva al acto de entrega, que es lo siguiente que pasa.
          cta.href = cta.dataset.hrefCerrado || '/premios/#calendario';
          cta.textContent = cta.dataset.textoCerrado || 'El acto de entrega';
          cta.removeAttribute('target');
          cta.removeAttribute('rel');
        }
        // Y el módulo entero se retira de la portada pasado el acto.
        if (Date.now() >= CADUCIDAD && raiz.dataset.caduca === 'si') raiz.hidden = true;
        return false;
      }

      // ── Plazo abierto ──
      var d = Math.floor(resta / DIA);
      var h = Math.floor((resta % DIA) / HORA);
      var m = Math.floor((resta % HORA) / MINUTO);
      var s = Math.floor((resta % MINUTO) / 1000);

      raiz.setAttribute('data-estado', d < AVISO ? 'ultimos' : 'normal');
      if (estatico) estatico.hidden = true;
      if (reloj) reloj.hidden = false;

      var partes = [
        pinta(cajas.d, d, 'día', 'días'),
        pinta(cajas.h, h, 'hora', 'horas'),
        pinta(cajas.m, m, 'minuto', 'minutos'),
        pinta(cajas.s, s, 'segundo', 'segundos')
      ];

      // El contador se marca `aria-hidden`: un lector de pantalla que anuncie
      // cuatro cifras cada segundo es inutilizable. La información va en el
      // texto fijo que hay al lado, que dice la fecha límite completa.
      reloj.setAttribute('title', 'Quedan ' + partes.join(', '));
      return true;
    }

    if (tick()) {
      // Al segundo justo, no cada 1000 ms desde que cargó: si no, el contador
      // se va desincronizando y salta de dos en dos.
      (function bucle() {
        setTimeout(function () { if (tick()) bucle(); }, 1000 - (Date.now() % 1000));
      })();
    }
  }

  function init() {
    var modulos = document.querySelectorAll('[data-premios-modulo]');
    for (var i = 0; i < modulos.length; i++) arranca(modulos[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
