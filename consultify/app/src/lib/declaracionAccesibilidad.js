// ════════════════════════════════════════════════════════════════════════════
// DECLARACIÓN DE APLICABILIDAD Y DE CONFORMIDAD
//
// Genera el documento a partir de los datos reales del checklist, no de una
// plantilla con huecos. Tres avisos de fondo, porque se confunden a diario:
//
//  · «Declaración de aplicabilidad» NO es un artefacto de WCAG. Es la forma de
//    la Declaración de Aplicabilidad de ISO 27001, y como documento interno es
//    útil: dice qué criterios entran, cuáles no y por qué. Se genera igual.
//
//  · Lo que WCAG define (apartado 5.3) es una DECLARACIÓN DE CONFORMIDAD, con
//    cinco componentes obligatorios. Solo se puede firmar si TODOS los criterios
//    del nivel se cumplen. Si uno falla, no hay conformidad de ese nivel.
//
//  · Lo que el RD 1112/2018 obliga a publicar en España es una DECLARACIÓN DE
//    ACCESIBILIDAD, que es otro documento con su propia estructura.
//
// La función avisa cuando los datos no sostienen la declaración en lugar de
// emitirla igualmente.
// ════════════════════════════════════════════════════════════════════════════

const MECANISMO_TEXTO = {
  condicion_no_se_da: 'La condición que dispara el criterio no se produce en el contenido evaluado. Se declara CUMPLIDO (WCAG no contempla la categoría «no aplicable»).',
  excepcion_del_criterio: 'El propio texto del criterio exime este caso.',
  esencial: 'Es esencial: eliminarlo cambiaría la información o la función, y no se puede lograr de otra forma conforme.',
  agente_de_usuario: 'La presentación la determina el agente de usuario y el autor no la modifica.',
  fuera_de_alcance: 'Queda fuera del alcance declarado de la evaluación.',
};

const METODO_TEXTO = {
  manual: 'inspección manual del código y del comportamiento',
  automatico: 'validador automático',
  lector: 'lector de pantalla',
  teclado: 'recorrido completo solo con teclado',
  contraste: 'medición del ratio de contraste',
  zoom: 'ampliación al 200 % y 400 %',
  usuarios: 'prueba con personas usuarias',
};

const ORIGEN_TEXTO = {
  une: 'UNE 139803:2012 (WCAG 2.0)',
  wcag21: 'WCAG 2.1',
  wcag22: 'WCAG 2.2',
};

const NIVELES = ['A', 'AA', 'AAA'];

/**
 * @param {Array}  criterios  filas de accesibilidad_criterios
 * @param {Array}  conformidad filas de accesibilidad_conformidad
 * @param {Object} ctx  { sitio, alcance, tecnologias, evaluador, nivelObjetivo, fecha }
 */
export function generarDeclaracion(criterios, conformidad, ctx = {}) {
  const hoy = ctx.fecha || new Date().toISOString().slice(0, 10);
  const nivelObjetivo = ctx.nivelObjetivo || 'AA';
  const sitio = ctx.sitio || 'https://www.tuconsultor.com';
  const alcance = ctx.alcance || 'Todas las páginas bajo el dominio, en sus cinco versiones idiomáticas (es, en, fr, de, ar).';
  const tecnologias = ctx.tecnologias || 'HTML, CSS, JavaScript, SVG';
  const evaluador = ctx.evaluador || '[pendiente de indicar]';

  const orden = (a, b) => String(a.codigo).localeCompare(String(b.codigo), undefined, { numeric: true });
  const filas = (criterios || []).slice().sort(orden);

  // Los niveles que hay que cumplir para el objetivo declarado.
  const exigidos = NIVELES.slice(0, NIVELES.indexOf(nivelObjetivo) + 1);
  const delObjetivo = filas.filter((c) => exigidos.includes(c.nivel) && !c.obsoleto);

  const cumple = delObjetivo.filter((c) => c.estado === 'cumple');
  const noCumple = delObjetivo.filter((c) => c.estado === 'no_cumple');
  const parcial = delObjetivo.filter((c) => c.estado === 'parcial');
  const pendiente = delObjetivo.filter((c) => c.estado === 'pendiente');
  const puedeDeclarar = noCumple.length === 0 && parcial.length === 0 && pendiente.length === 0;

  const L = [];
  const l = (t = '') => L.push(t);

  l('# Declaración de aplicabilidad y estado de conformidad');
  l();
  l(`**Sitio evaluado:** ${sitio}`);
  l(`**Fecha de la evaluación:** ${hoy}`);
  l(`**Responsable de la evaluación:** ${evaluador}`);
  l(`**Nivel objetivo declarado:** ${nivelObjetivo}`);
  l(`**Norma de referencia:** UNE 139803:2012, ampliada con los criterios de WCAG 2.1 y WCAG 2.2`);
  l();

  // ── Veredicto primero: es lo que se va a leer ──
  l('## Estado de la declaración');
  l();
  if (puedeDeclarar) {
    l(`> **Los datos sostienen una declaración de conformidad de nivel ${nivelObjetivo}.** Los ${delObjetivo.length} criterios exigibles de los niveles ${exigidos.join(', ')} están verificados y cumplen.`);
  } else {
    l(`> **⚠ Los datos NO sostienen todavía una declaración de conformidad de nivel ${nivelObjetivo}.**`);
    l('>');
    l(`> De los ${delObjetivo.length} criterios exigibles: **${cumple.length} cumplen**, ${parcial.length} están parcialmente resueltos, ${noCumple.length} no cumplen y ${pendiente.length} están sin evaluar.`);
    l('>');
    l('> WCAG es binario: para declarar un nivel hay que cumplir **todos** sus criterios. Este documento vale como declaración de aplicabilidad y como registro del estado, pero **no debe publicarse como declaración de conformidad** ni acompañarse del logotipo de W3C.');
  }
  l();

  // ── Los cinco componentes obligatorios (apartado 5.3.1 de WCAG) ──
  l('## Componentes de la declaración de conformidad (WCAG 5.3.1)');
  l();
  l('Los cinco que exige WCAG. Aquí quedan documentados para cuando el estado permita firmarla:');
  l();
  l(`1. **Fecha:** ${hoy}`);
  l('2. **Directrices, versión y URI:** Web Content Accessibility Guidelines 2.2, https://www.w3.org/TR/WCAG22/');
  l(`3. **Nivel de conformidad:** ${nivelObjetivo}${puedeDeclarar ? '' : ' — *no alcanzado a esta fecha*'}`);
  l(`4. **Alcance:** ${alcance}`);
  l(`5. **Tecnologías de las que depende el contenido:** ${tecnologias}`);
  l();
  l('*Solo se listan las tecnologías necesarias para que el contenido cumpla, no todo lo que hay en el sitio.*');
  l();

  // ── Resumen por nivel y origen ──
  l('## Resumen por nivel');
  l();
  l('| Nivel | Total | Aplicables | Cumplen | Parciales | No cumplen | Pendientes | % sobre aplicables |');
  l('|---|---|---|---|---|---|---|---|');
  for (const n of NIVELES) {
    const del = filas.filter((c) => c.nivel === n && !c.obsoleto);
    const apl = del.filter((c) => c.aplicable !== false);
    const cu = apl.filter((c) => c.estado === 'cumple').length;
    l(`| ${n} | ${del.length} | ${apl.length} | ${cu} | ${apl.filter((c) => c.estado === 'parcial').length} | ${apl.filter((c) => c.estado === 'no_cumple').length} | ${apl.filter((c) => c.estado === 'pendiente').length} | ${apl.length ? Math.round((cu / apl.length) * 100) : 0} % |`);
  }
  l();
  l('El porcentaje se calcula sobre los criterios **aplicables**: contar los no aplicables como incumplimientos falsearía el resultado a la baja.');
  l();

  l('## Origen de los criterios');
  l();
  l('| Origen | Criterios | Exigibilidad |');
  l('|---|---|---|');
  for (const [k, txt] of Object.entries(ORIGEN_TEXTO)) {
    const n = filas.filter((c) => (c.origen || 'une') === k).length;
    const exig = k === 'une' ? 'Norma española vigente'
      : k === 'wcag21' ? 'Referenciado por EN 301 549, que aplica el RD 1112/2018'
      : 'Mejora voluntaria: aún no exigido por norma en España';
    l(`| ${txt} | ${n} | ${exig} |`);
  }
  l();

  // ── Criterios NO aplicables, con su mecanismo ──
  const noAplicables = filas.filter((c) => c.aplicable === false);
  l('## Criterios excluidos y por qué');
  l();
  if (!noAplicables.length) {
    l('No se ha excluido ningún criterio. Todos se consideran aplicables al contenido evaluado.');
  } else {
    l('Cada exclusión indica el mecanismo de WCAG que la justifica. Sin mecanismo, una exclusión no se sostiene ante una revisión externa.');
    l();
    for (const c of noAplicables) {
      l(`### ${c.codigo} · ${c.titulo} (${c.nivel})`);
      l();
      l(`- **Origen:** ${ORIGEN_TEXTO[c.origen || 'une']}`);
      l(`- **Mecanismo:** ${c.mecanismo ? MECANISMO_TEXTO[c.mecanismo] : '⚠ SIN MECANISMO INDICADO — hay que completarlo'}`);
      l(`- **Justificación:** ${c.justificacion || '⚠ sin justificar'}`);
      l();
    }
  }
  l();

  // ── Criterios verificados, con el cómo ──
  const verificados = filas.filter((c) => c.aplicable !== false && c.estado !== 'pendiente');
  l('## Criterios evaluados, con método y evidencia');
  l();
  if (!verificados.length) {
    l('Todavía no se ha evaluado ningún criterio.');
  } else {
    l('| Criterio | Nivel | Origen | Estado | Método | Evidencia |');
    l('|---|---|---|---|---|---|');
    for (const c of verificados) {
      const met = (c.metodos || []).map((m) => METODO_TEXTO[m] || m).join('; ') || '—';
      const est = { cumple: 'Cumple', parcial: 'Parcial', no_cumple: 'No cumple' }[c.estado] || c.estado;
      l(`| ${c.codigo} ${c.titulo} | ${c.nivel} | ${ORIGEN_TEXTO[c.origen || 'une']} | ${est} | ${met} | ${(c.evidencia || '—').replace(/\|/g, '/')} |`);
    }
    l();
    l('### Detalle de lo evaluado');
    l();
    for (const c of verificados.filter((x) => x.observaciones)) {
      l(`**${c.codigo} · ${c.titulo}** — ${c.observaciones}`);
      l();
    }
  }

  // ── Lo que queda ──
  if (parcial.length || noCumple.length) {
    l('## Contenido no accesible a esta fecha');
    l();
    l('Lo que la declaración de accesibilidad del RD 1112/2018 obliga a enumerar:');
    l();
    for (const c of [...noCumple, ...parcial]) {
      l(`- **${c.codigo} ${c.titulo}** (${c.nivel}, ${c.estado === 'parcial' ? 'parcialmente conforme' : 'no conforme'}): ${c.observaciones || 'sin detallar'}`);
    }
    l();
  }
  if (pendiente.length) {
    l(`## Criterios sin evaluar (${pendiente.length})`);
    l();
    l('Sin evaluar no es lo mismo que conforme. Estos criterios exigibles del nivel objetivo no se han verificado:');
    l();
    l(pendiente.map((c) => `${c.codigo}`).join(' · '));
    l();
  }

  // ── Requisitos de conformidad ──
  if ((conformidad || []).length) {
    l('## Requisitos de conformidad');
    l();
    l('Se evalúan aparte de los criterios: sin ellos no hay conformidad aunque todos los criterios cumplan.');
    l();
    l('| # | Requisito | Estado |');
    l('|---|---|---|');
    for (const k of conformidad.slice().sort(orden)) {
      const est = { cumple: 'Cumple', parcial: 'Parcial', no_cumple: 'No cumple', pendiente: 'Pendiente' }[k.estado] || k.estado;
      l(`| ${k.codigo} | ${(k.requisito || '').replace(/\|/g, '/')} | ${est} |`);
    }
    l();
  }

  l('## Advertencias sobre el uso de este documento');
  l();
  l('- **No es una declaración de accesibilidad del RD 1112/2018.** Esa es un documento público con su propia estructura obligatoria y un mecanismo de comunicación para la ciudadanía. Este sirve de base para redactarla.');
  l('- **«Declaración de aplicabilidad» no es un artefacto de WCAG.** El nombre viene de la Declaración de Aplicabilidad de ISO 27001. Como registro interno es útil; como declaración formal ante terceros, lo que existe es la declaración de conformidad del apartado 5.3 de WCAG.');
  l('- **AAA completo no es un objetivo razonable para un sitio entero.** WCAG advierte que no se recomienda exigir el nivel AAA como política general, porque para algunos contenidos no es posible satisfacer todos sus criterios. Lo habitual es declarar AA y documentar qué criterios AAA se cumplen además.');
  l('- **La conformidad se evalúa por página completa y por proceso completo.** Un formulario accesible dentro de un proceso con un paso inaccesible no da conformidad.');
  l();
  l(`*Documento generado el ${new Date().toISOString().slice(0, 16).replace('T', ' ')} desde el registro de accesibilidad de Orbita 360.*`);

  return L.join('\n');
}
