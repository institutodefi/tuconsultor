/* ═══════════════════════════════════════════════════════════════════════════
   GOOGLE TAG MANAGER · GTM-PKVWZF5N · carga condicionada al consentimiento
   ---------------------------------------------------------------------------
   El contenedor NO se carga hasta que la persona acepta las analíticas en el
   banner de cookies. Antes de eso se declara Consent Mode v2 en estado
   'denied', de forma que ninguna etiqueta pueda escribir cookies ni enviar
   identificadores aunque se dispare.

   Flujo:
     1 · dataLayer + consent default = denied (siempre, aunque no haya consentimiento)
     2 · si ya hay consentimiento guardado → carga GTM y consent update = granted
     3 · si no lo hay → espera el evento 'tc-cookies' que emite cookies-banner.js

   El <noscript> del snippet original de Google se ha omitido a propósito: sin
   JavaScript el banner no puede pedir consentimiento, así que ese iframe
   rastrearía sin base legal posible. Si se quiere el snippet literal de Google,
   se añade a mano en cada plantilla.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  var ID = 'GTM-PKVWZF5N';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  // 1 · Estado por defecto: todo denegado hasta que se acepte.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });

  var cargado = false;
  function cargarGTM() {
    if (cargado) return;
    cargado = true;
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = document.getElementsByTagName('script')[0];
    var j = document.createElement('script');
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + ID;
    if (f && f.parentNode) f.parentNode.insertBefore(j, f);
    else document.head.appendChild(j);
  }

  function conceder() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted',
    });
    cargarGTM();
  }

  // 2 · ¿Ya hay consentimiento de una visita anterior?
  function consentidoYa() {
    if (window.tcCookiesAnaliticas === true) return true;
    try {
      var v = localStorage.getItem('tc-cookies-v1');
      return v === 'todas' || v === 'config-analiticas';
    } catch (e) { return false; }
  }
  if (consentidoYa()) conceder();

  // 3 · …o esperamos a que se acepte en el banner.
  document.addEventListener('tc-cookies', function (ev) {
    var v = ev && ev.detail;
    if (v === 'todas' || v === 'config-analiticas') conceder();
  });
})();
