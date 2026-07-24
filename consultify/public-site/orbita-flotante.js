/* =============================================================================
   Botón flotante de acceso a ÓRBITA · esquina inferior derecha, en todas las
   páginas que incluyan este script. Lleva al login (/app/acceso).
   Se coloca ENCIMA del de WhatsApp (que va más abajo).
   ============================================================================= */
(function () {
  if (document.getElementById('orbita-flotante')) return;
  var DESTINO = '/app/acceso';

  var css = document.createElement('style');
  css.textContent = [
    '#orbita-flotante{position:fixed;right:20px;bottom:86px;z-index:9997;display:flex;align-items:center;gap:0;',
    'background:#04173F;color:#fff;border-radius:999px;height:52px;padding:0 6px;text-decoration:none;',
    'box-shadow:0 6px 18px rgba(6,27,69,.28);font-family:Rubik,Manrope,system-ui,sans-serif;font-weight:600;',
    'overflow:hidden;transition:padding .2s ease}',
    '#orbita-flotante img{height:34px;width:34px;object-fit:contain;flex:0 0 auto}',
    '#orbita-flotante span{max-width:0;opacity:0;white-space:nowrap;font-size:14px;transition:max-width .25s ease,opacity .2s ease,margin .2s ease;margin:0}',
    '#orbita-flotante:hover span{max-width:90px;opacity:1;margin:0 10px 0 4px}',
    '#orbita-flotante::after{content:"";position:absolute;inset:0;border-radius:999px;box-shadow:0 0 0 0 rgba(245,166,35,.5);animation:orb-pulse 2.8s infinite}',
    '@keyframes orb-pulse{0%{box-shadow:0 0 0 0 rgba(245,166,35,.45)}70%{box-shadow:0 0 0 12px rgba(245,166,35,0)}100%{box-shadow:0 0 0 0 rgba(245,166,35,0)}}',
    '@media(max-width:560px){#orbita-flotante{right:16px;bottom:78px;height:48px}#orbita-flotante img{height:30px;width:30px}}'
  ].join('');

  var a = document.createElement('a');
  a.id = 'orbita-flotante';
  a.href = DESTINO;
  a.setAttribute('aria-label', 'Acceder a Órbita');
  // Icono a color (blanco no hace falta: el símbolo ya se ve bien sobre navy por el naranja)
  a.innerHTML = '<img src="/orbita-icono-blanco.png" alt="Órbita" /><span>Órbita</span>';

  function montar() { document.head.appendChild(css); document.body.appendChild(a); }
  if (document.body) montar();
  else document.addEventListener('DOMContentLoaded', montar);
})();
