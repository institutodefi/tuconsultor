/* Banner de cookies RGPD · manual B10: tres botones con idéntico peso visual */
(function () {
  var CLAVE = 'tc-cookies-v1';
  function elegido() { try { return localStorage.getItem(CLAVE); } catch (e) { return null; } }
  function guardar(v) { try { localStorage.setItem(CLAVE, v); } catch (e) {} cerrar(); aplicar(v); }
  function aplicar(v) {
    // Analíticas solo con consentimiento explícito ('todas' o config con analiticas)
    window.tcCookiesAnaliticas = (v === 'todas' || v === 'config-analiticas');
  }
  var banner;
  function cerrar() { if (banner) { banner.remove(); banner = null; } }
  function pintar(config) {
    cerrar();
    banner = document.createElement('div');
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Configuración de cookies');
    banner.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:10000;max-width:720px;margin:0 auto;' +
      'background:#17233F;border:1.5px solid #3D4C77;border-radius:18px;padding:20px 22px;color:#FFFFFF;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.5);font-family:Manrope,system-ui,sans-serif;font-size:14px;line-height:1.6';
    var botones = 'display:inline-flex;align-items:center;justify-content:center;padding:12px 20px;min-height:44px;border-radius:999px;' +
      'border:1.5px solid #FFAD33;background:transparent;color:#FFAD33;font-weight:800;font-size:14px;cursor:pointer;font-family:inherit';
    var html = '<p style="margin:0 0 6px;font-weight:800">Cookies</p>' +
      '<p style="margin:0 0 14px;color:#A5B1CB">Utilizamos cookies propias y de terceros para el funcionamiento del sitio y para analizar su uso. ' +
      'Puede aceptarlas todas, rechazarlas todas o configurarlas. Consulte la <a href="/legal/cookies.html" style="color:#FFAD33;text-decoration:underline">Política de Cookies</a>.</p>';
    if (config) {
      html += '<label style="display:flex;gap:10px;align-items:center;margin-bottom:8px;color:#A5B1CB">' +
        '<input type="checkbox" checked disabled style="width:18px;height:18px"/> Técnicas (necesarias: idioma, sesión)</label>' +
        '<label style="display:flex;gap:10px;align-items:center;margin-bottom:14px;color:#A5B1CB">' +
        '<input id="tc-ck-analiticas" type="checkbox" style="width:18px;height:18px"/> Analíticas (medición de uso)</label>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button id="tc-ck-guardar" style="' + botones + '">Guardar selección</button></div>';
    } else {
      html += '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button id="tc-ck-si" style="' + botones + '">Aceptar todas</button>' +
        '<button id="tc-ck-no" style="' + botones + '">Rechazar todas</button>' +
        '<button id="tc-ck-cf" style="' + botones + '">Configurar</button></div>';
    }
    document.body.appendChild(banner);
    banner.innerHTML = '<div>' + html + '</div>';
    if (config) {
      banner.querySelector('#tc-ck-guardar').onclick = function () {
        guardar(banner.querySelector('#tc-ck-analiticas').checked ? 'config-analiticas' : 'config-minimas');
      };
    } else {
      banner.querySelector('#tc-ck-si').onclick = function () { guardar('todas'); };
      banner.querySelector('#tc-ck-no').onclick = function () { guardar('ninguna'); };
      banner.querySelector('#tc-ck-cf').onclick = function () { pintar(true); };
    }
  }
  window.abrirCookies = function () { pintar(false); };
  function init() { var v = elegido(); if (v) aplicar(v); else pintar(false); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
