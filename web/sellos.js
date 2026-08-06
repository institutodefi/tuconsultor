/* ════════════════════════════════════════════════════════════════════════════
   SELLOS DE CERTIFICACIÓN
   
   Los cuatro que TuConsultor tiene, según la exportación de WordPress:
   ISO 9001, ISO 14001 e ISO 27001 acreditadas por ENAC, y el ENS en categoría
   BÁSICA conforme al Real Decreto 311/2022.
   
   ⚠ TRES COSAS QUE NO SON DECORACIÓN:
   
   · El sello pertenece a la ENTIDAD CERTIFICADORA, no a nosotros. Se cede su
     uso mientras el certificado esté en vigor, y normalmente hay que usar el
     archivo que ellos facilitan sin recortar ni recolorear.
   
   · El número de certificado debe acompañar al sello. Sin él, un sello es solo
     una imagen: nadie puede comprobar que sea cierto. Rellena `numero`.
   
   · Un sello caducado en la web es peor que no tenerlo. Por eso cada uno lleva
     `vence`: si la fecha ha pasado, el sello NO se pinta y se avisa por
     consola. Es deliberado — más vale una web sin sellos que con uno falso.
   ══════════════════════════════════════════════════════════════════════════ */

// ⚠ NO son todos de la misma entidad, y eso importa: cada una tiene sus
// propias condiciones de uso de la marca.
//   · 9001 y 14001 → Bureau Veritas Certification
//   · 27001        → OCA Global
//   · ENS          → declaración de conformidad, RD 311/2022, categoría Básica
// Los cuatro certificados están a nombre de GRUPO TUCONSULTOR y cubren las
// tres sociedades: Trescore Proyectos ITE, Instituto Excelencia Europea e
// Instituto Europeo de Blockchain y DeFi.
//
// Todos emitidos por OCA Instituto de Certificación, S.L.U. (OCA Global),
// entidad acreditada por ENAC.
//
// ⚠ Los sellos de Bureau Veritas que había en el WordPress son de la
// certificación ANTERIOR: retirados, porque mostrar el sello de una entidad
// que ya no os certifica es una afirmación falsa.
window.TC_SELLOS = [
  {
    id: '9001',
    alt: 'ISO 9001 · Sistema de gestión de la calidad, certificado por OCA Global, entidad acreditada por ENAC',
    archivo: '/marca/sellos/9001-oca.png',
    entidad: 'OCA Global',
    numero: '34/5200/23/3163',
    pdf: '/certificados/iso-9001.pdf',
    norma: 'UNE-EN ISO 9001:2015',
    vence: '2029-03-30',
  },
  {
    id: '14001',
    alt: 'ISO 14001 · Sistema de gestión ambiental, certificado por OCA Global, entidad acreditada por ENAC',
    archivo: '/marca/sellos/14001-oca.png',
    entidad: 'OCA Global',
    numero: '34/5400/23/3164',
    pdf: '/certificados/iso-14001.pdf',
    norma: 'UNE-EN ISO 14001:2015',
    vence: '2029-03-30',
  },
  {
    id: '27001',
    alt: 'ISO/IEC 27001 · Sistema de gestión de la seguridad de la información, certificado por OCA Global, entidad acreditada por ENAC',
    archivo: '/marca/sellos/27001-oca.png',
    entidad: 'OCA Global',
    numero: '34/5700/24/10271',
    pdf: '/certificados/iso-27001.pdf',
    // Hay dos versiones: el de 2022 fue sustituido por el de 2023 el 29/10/2024.
    // El vigente es éste.
    norma: 'UNE-EN ISO/IEC 27001:2023',
    vence: '2027-10-22',
  },
  {
    id: 'ens',
    alt: 'Esquema Nacional de Seguridad · categoría Básica, conforme al Real Decreto 311/2022',
    archivo: '/marca/sellos/ens-basica.png',
    entidad: 'OCA Global',
    numero: '34/5704/24/10277',
    pdf: '/certificados/ens-basica.pdf',
    norma: 'RD 311/2022 · categoría Básica',
    // ⚠ RENUEVA EL 22/10/2026. El aviso salta con 60 días de antelación.
    vence: '2026-10-22',
  },
];

(function () {
  var sellos = window.TC_SELLOS || [];
  var destino = document.getElementById('tc-sellos');
  if (!destino) return;

  var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  var vigentes = sellos.filter(function (s) {
    if (!s.vence) return true;                       // sin fecha: se muestra
    var d = new Date(s.vence + 'T00:00:00');
    if (isNaN(d.getTime())) return true;
    if (d < hoy) {
      console.warn('[sellos] «' + s.id + '» caducó el ' + s.vence + ': no se muestra.');
      return false;
    }
    // Aviso con dos meses de antelación: renovar lleva tiempo.
    if ((d - hoy) / 864e5 < 60) console.warn('[sellos] «' + s.id + '» vence el ' + s.vence + '.');
    return true;
  });

  if (!vigentes.length) { destino.style.display = 'none'; return; }

  destino.innerHTML = vigentes.map(function (s) {
    // El sello enlaza al CERTIFICADO en PDF, no a la web de la entidad.
    // Dos motivos: es el documento que de verdad prueba lo que el sello afirma,
    // y no depende de que un tercero mantenga viva una URL.
    var vence = s.vence
      ? ' · válido hasta ' + s.vence.split('-').reverse().join('/')
      : '';
    var titulo = (s.norma || s.id) + ' · certificado ' + (s.numero || '') + vence
      + '. Se abre el certificado en PDF.';

    var interior =
        '<span class="tc-sello-img">'
      + '<img src="' + s.archivo + '" alt="' + s.alt.replace(/"/g, '&quot;') + '" loading="lazy" />'
      + '</span>'
      + (s.numero
          ? '<figcaption>' + (s.entidad || '')
            + '<span class="num">' + s.numero + '</span></figcaption>'
          : '');

    if (!s.pdf) return '<figure class="tc-sello">' + interior + '</figure>';

    return '<figure class="tc-sello">'
      + '<a class="tc-sello-enlace" href="' + s.pdf + '" target="_blank" rel="noopener"'
      + ' title="' + titulo.replace(/"/g, '&quot;') + '">'
      + interior
      + '<span class="tc-sello-ver">Ver certificado</span>'
      + '</a></figure>';
  }).join('');
})();
