// ════════════════════════════════════════════════════════════════════════════
// CONTENIDO Y MARCA DE LA OFERTA · fuente única para el PDF y el PPTX
//
// Los dos documentos salían de códigos separados y habían divergido: distinta
// paleta (061B45 frente a 0A2B3A), distinto naranja, y las cláusulas solo
// estaban en el PDF. Cuando el mismo texto vive en dos sitios, uno de los dos
// se queda viejo — y es siempre el que ve el cliente.
//
// Aquí está una sola vez. El PDF lo usa en RGB normalizado y el PPTX en
// hexadecimal sin almohadilla, que es lo que pide pptxgenjs.
// ════════════════════════════════════════════════════════════════════════════

import { NORMA_BY_ID } from '../../app/src/lib/calcEngine.js';
import { FASES } from '../../app/src/lib/fases.js';

/** Paleta, en hexadecimal sin almohadilla (formato de pptxgenjs). */
export const HEX = {
  navy:      '0A2B3A',
  navyHondo: '06131B',
  teal:      '1FA1A6',
  naranja:   'F99001',
  tinta:     '12303D',
  apagado:   '6B8795',
  linea:     'E2EAEF',
  suave:     'F4F8FA',
  blanco:    'FFFFFF',
  claro:     '8CB3C0',   // texto secundario sobre navy
};

/** La misma paleta en 0–1 para pdf-lib. */
export const RGB01 = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, [
    parseInt(v.slice(0, 2), 16) / 255,
    parseInt(v.slice(2, 4), 16) / 255,
    parseInt(v.slice(4, 6), 16) / 255,
  ]]),
);

// Las tres sociedades que pueden emitir. La marca es común; la razón social y
// el CIF, no. Una oferta que dice una sociedad y se factura desde otra deja el
// contrato sin sostener, así que el documento tiene que decir cuál emite.
export const EMISORAS = {
  trescore: { id: 'trescore', marca: 'TuConsultor', razonSocial: 'TRESCORE PROYECTOS ITE, S.L.',
              cif: 'B84867670', domicilio: 'Alcorcón, Madrid' },
  iee:      { id: 'iee', marca: 'TuConsultor', razonSocial: 'INSTITUTO EXCELENCIA EUROPEA, S.L.',
              cif: 'B87093076', domicilio: 'Alcorcón, Madrid' },
  defi:     { id: 'defi', marca: 'TuConsultor', razonSocial: 'INSTITUTO EUROPEO DE BLOCKCHAIN Y DEFI, S.L.',
              cif: 'B06996631', domicilio: 'Alcorcón, Madrid' },
};

const COMUN = {
  email: 'hola@tuconsultor.com',
  rgpd: 'rgpd@tuconsultor.com',
  firmante: 'Alejandro San Nicolás',
  cargo: 'CEO de TuConsultor',
};

/** Datos del emisor de ESTA oferta. Sin emisora indicada, la de por defecto. */
export function emisorDe(r) {
  const e = EMISORAS[r?.emisora_id || r?.emisoraId] || EMISORAS.trescore;
  return {
    ...COMUN, ...e,
    // En el pie va la marca con la razón social entre paréntesis: el cliente
    // reconoce «TuConsultor» y a la vez consta quién emite legalmente.
    legalPie: `${e.marca} (${e.razonSocial}) · CIF ${e.cif} · ${COMUN.email}`,
    pieCorto: `${e.marca} · CIF ${e.cif}`,
  };
}

/** Compatibilidad: quien no pase la oferta recibe la sociedad por defecto. */
export const EMISOR = emisorDe(null);

/** Condiciones generales. `r` es el resultado del cálculo. */
export function condiciones(r) {
  return [
    ...(r?.pagoAdelantado && r?.adelantado ? [
      `Forma de pago: un único pago por adelantado de ${r.adelantado.total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}, `
      + `con vencimiento a la fecha del contrato. Cubre ${r.adelantado.mesesServicio} meses de servicio `
      + `(${r.adelantado.mesesCobrados} mensualidades).`,
    ] : []),
    // ── Ofertas nacidas en la web ──
    // Las calcula el visitante con los datos que él mismo introduce: no ha
    // contado sus sedes ni su plantilla, y nadie de la casa ha mirado su
    // organización. Decirlo aquí, y no en letra pequeña, es lo que separa una
    // estimación de un compromiso.
    //
    // Las emitidas por el equipo NO llevan esta cláusula: van aprobadas y en
    // firme, y añadir un condicional sería dejar la puerta abierta a subirlas.
    ...(r?.canal === 'web' ? [
      'Propuesta pendiente de aprobación. El importe se ha calculado con los datos facilitados en el '
      + 'formulario web y queda sujeto a la revisión del equipo consultor, que confirmará el alcance del '
      + 'sistema, el número de sedes o centros de trabajo y el número de personas trabajadoras antes de '
      + 'emitir la propuesta definitiva.',
    ] : []),
    'Impuestos indirectos no incluidos. Todos los importes se expresan sin impuestos. El impuesto aplicable '
      + '(IVA, IGIC o IPSI) se determina según el domicilio fiscal del cliente y se repercute en factura. En '
      + 'operaciones intracomunitarias con NIF-IVA válido en VIES se aplica la inversión del sujeto pasivo.',
    'Validez de la oferta: 30 días naturales desde su fecha de emisión.',
    'No incluye las tasas de la entidad de certificación ni los gastos de desplazamiento fuera de la Comunidad de Madrid.',
    ...(r?.modeloMantenimiento
      ? [`Al finalizar la implantación, el sistema pasa al modelo de mantenimiento ${r.modeloMantenimiento}, que se contrata aparte.`]
      : []),
    r?.disclaimer || '',
  ].filter(Boolean);
}

/** Anexo II · marco legal. */
export const REQUISITOS_LEGALES = [
  ['Protección de datos',
   'Reglamento (UE) 2016/679 (RGPD) y Ley Orgánica 3/2018 (LOPDGDD). Las partes actúan como responsables independientes salvo que se firme un encargo de tratamiento.'],
  ['Accesibilidad digital',
   'Real Decreto 1112/2018 para el sector público y Ley 11/2023, con aplicación desde el 28 de junio de 2025 para determinados productos y servicios privados. Norma técnica: EN 301 549, que remite a WCAG en nivel AA.'],
  ['Igualdad y diversidad',
   'Ley Orgánica 3/2007 y Real Decreto 901/2020 sobre planes de igualdad, con registro obligatorio. Real Decreto 1026/2024 sobre medidas planificadas LGTBI para empresas de más de 50 personas trabajadoras.'],
  ['Seguridad de la información',
   'Real Decreto 311/2022, Esquema Nacional de Seguridad, para quien presta servicios al sector público. Directiva (UE) 2022/2555 (NIS2) en los sectores incluidos.'],
  ['Prevención de riesgos laborales',
   'Ley 31/1995 y su normativa de desarrollo. La implantación de ISO 45001 no sustituye las obligaciones preventivas de la organización.'],
  ['Contratación y facturación',
   'Ley 37/1992 del IVA. Ley 15/2010 de lucha contra la morosidad. Facturación electrónica según la Ley 18/2022 en los plazos que fije su desarrollo reglamentario.'],
  ['Propiedad intelectual',
   'Real Decreto Legislativo 1/1996. La documentación del sistema elaborada para la organización es de su propiedad. Las metodologías y herramientas de TuConsultor, incluida Orbita.PMTools, siguen siendo de TuConsultor.'],
];

/** Anexo III · qué se contrata exactamente. */
export function clausulas(r) {
  const esImpl = r?.modelo === 'Implantación';
  return [
    ['1 · El modelo que se contrata',
     `Se contrata el modelo ${r?.modelo || '—'}${esImpl && r?.meses ? `, con un cronograma de ${r.meses} meses` : ''}. ` +
     (esImpl
       // El final del proyecto no es el mismo en un sistema de gestión que en un
       // plan: uno se certifica y el otro se registra. Decirlo mal en el anexo
       // que define qué se contrata es peor que no decirlo.
       ? 'La implantación es un proyecto con principio y fin: termina cuando ' + {
           sistema: 'el sistema queda listo para la auditoría externa de certificación',
           plan:    'el plan queda elaborado, negociado y listo para su registro ante la autoridad laboral',
           mixto:   'lo contratado queda listo para su certificación o su registro, según corresponda a cada elemento',
         }[tipoDeAlcance(r)] + '. No es una cuota indefinida.'
       : 'Es un modelo de acompañamiento recurrente, con una dedicación mensual pactada y permanencia mínima de doce meses.')],
    ['2 · El modelo se basa en horas al mes y en tareas',
     'Lo que se contrata son dos cosas a la vez: una dedicación expresada en horas al mes y un conjunto de tareas concretas, las del Anexo I. Las horas dimensionan el esfuerzo; las tareas definen el resultado. Ninguna de las dos por separado describe el servicio.'],
    ['3 · Cumplidas las tareas y los objetivos, no hay obligación de más horas',
     'Cuando las tareas del periodo están hechas y los objetivos alcanzados, el trabajo del periodo está completo. '
     + 'No existe obligación de consumir horas restantes en trabajo adicional. Lo que sí se mantiene es la asistencia '
     + 'técnica: resolución de dudas, apoyo ante incidencias y acompañamiento del sistema, sin coste añadido.'
     // Sin esta segunda parte, la cláusula anterior se podía leer como que
     // agotadas las tareas del mes decae la cuota de ese mes. No es así: lo
     // que se contrata es un acompañamiento anual, y la cuota retribuye la
     // disponibilidad del equipo, no un consumo de horas.
     + (esImpl ? '' : r?.pagoAdelantado
       // Pagado por adelantado, hablar de «cuota mensual que se mantiene» no
       // encaja: ya está todo abonado. Lo que hay que dejar claro es que el
       // servicio se presta el año entero aunque el pago fuera único.
       ? '\n\nEl importe se ha abonado íntegramente por adelantado y cubre los doce meses de servicio, con '
         + 'independencia de las horas efectivamente empleadas en cada periodo. El pago retribuye la disponibilidad '
         + 'del equipo y el resultado comprometido durante todo el año, no un consumo de horas: los meses de menor '
         + 'carga compensan los de mayor carga.'
       : '\n\nEsto no afecta al compromiso de pago. La cuota mensual se mantiene durante los doce meses de duración '
       + 'del contrato, con independencia de las horas efectivamente empleadas en cada periodo. La cuota retribuye la '
       + 'disponibilidad del equipo y el resultado comprometido, no un consumo de horas: los meses de menor carga '
       + 'compensan los de mayor carga a lo largo del año.')],
    ...(!esImpl && r?.pagoAdelantado && r?.adelantado ? [
      ['4 · Forma de pago: único por adelantado',
       `El importe se abona en un solo pago por adelantado al inicio del contrato: `
       + `${r.adelantado.mesesCobrados} mensualidades por ${r.adelantado.mesesServicio} meses de servicio. `
       + 'No hay cuotas mensuales posteriores ni domiciliación periódica. '
       + 'Si el contrato se interrumpiera antes de tiempo por causa imputable a la CONSULTORA, se devolvería la '
       + 'parte proporcional de los meses no prestados.'],
    ] : []),
    ...(esImpl ? [] : [
      [`${(!esImpl && r?.pagoAdelantado) ? '5' : '4'} · Renovación al término del contrato`,
       'Un mes antes de la fecha de finalización del contrato se emitirá una oferta de renovación para el siguiente '
       + 'periodo anual, con el alcance y la dedicación revisados según la situación del sistema en ese momento. '
       + 'La renovación no es automática: requiere aceptación expresa de la organización.'],
    ]),
    [(esImpl ? '4' : (r?.pagoAdelantado ? '6' : '5')) + ' · Todo trabajo ajeno al alcance se presupuesta y factura aparte',
     'Cualquier encargo que no figure en el Anexo I —nuevos sistemas, sedes adicionales, auditorías no previstas, formación específica o adaptaciones fuera del alcance— se presupuesta por separado antes de ejecutarse y se factura aparte. Nunca se ejecuta trabajo fuera de alcance sin presupuesto aceptado.'],
  ];
}

/** Identificadores que son planes, no sistemas de gestión certificables. */
const ES_PLAN = (id) => /^(igualdad|diversidad)(-seg)?$/.test(String(id));

/**
 * Qué se está contratando: un sistema de gestión, un plan, o ambos.
 *
 * Importa más de lo que parece. Un sistema de gestión termina en una auditoría
 * externa de certificación; un plan de igualdad no se certifica, se negocia y
 * se registra. Decir «listo para la auditoría de certificación» en la oferta de
 * un plan de igualdad es sencillamente falso.
 */
export function tipoDeAlcance(r) {
  const ids = (r?.normas || []).map(String);
  const planes = ids.filter(ES_PLAN);
  if (!ids.length) return 'mixto';
  if (planes.length === ids.length) return 'plan';
  if (planes.length === 0) return 'sistema';
  return 'mixto';
}

/** Cómo se llama el objeto de la oferta, en neutro cuando hay de los dos. */
export function objetoDelAlcance(r, { plural = false } = {}) {
  const t = tipoDeAlcance(r);
  if (t === 'sistema') return plural ? 'los sistemas de gestión' : 'el sistema de gestión';
  if (t === 'plan')    return plural ? 'los planes' : 'el plan';
  return plural ? 'los sistemas y planes contratados' : 'lo contratado';
}

/** Título y subtítulo de la sección «la propuesta», iguales en los dos formatos. */
export function propuesta(r, cli) {
  const esImpl = r?.modelo === 'Implantación';
  const t = tipoDeAlcance(r);
  const quien = cli?.empresa || 'la organización';
  const varios = (r?.normas || []).length > 1;

  if (!esImpl) {
    return {
      titulo: `Acompañamiento en modelo ${r?.modelo || ''}`,
      texto: `El equipo consultor acompaña a ${quien} en el desarrollo y el mantenimiento de ${objetoDelAlcance(r, { plural: varios })}, con una dedicación recurrente pactada y sin sorpresas de facturación.`,
    };
  }

  // Implantación: el cierre del proyecto NO es el mismo según qué se implante.
  const cierre = {
    sistema: `hasta dejar a ${quien} lista para la auditoría externa de certificación`,
    plan:    `hasta dejar ${varios ? 'los planes elaborados, negociados y listos' : 'el plan elaborado, negociado y listo'} para su registro ante la autoridad laboral`,
    mixto:   `hasta dejar ${varios ? 'los sistemas y planes contratados listos' : 'lo contratado listo'} para su certificación o registro, según corresponda a cada uno`,
  }[t];

  const titulo = {
    sistema: varios ? 'Implantación completa de los sistemas de gestión' : 'Implantación completa del sistema de gestión',
    plan:    varios ? 'Elaboración e implantación de los planes' : 'Elaboración e implantación del plan',
    mixto:   'Implantación de los sistemas y planes contratados',
  }[t];

  return {
    titulo,
    texto: `Ejecutamos el programa completo: el equipo consultor lleva el peso del trabajo documental y técnico ${cierre}.`,
  };
}

/**
 * Fases de los planes incluidos en la oferta.
 *
 * Un plan de igualdad no es un bloque indivisible: son fases con entidad propia
 * y horas propias, y quien lo contrata tiene derecho a saber cuáles entran.
 * Devuelve [] si la oferta no lleva ningún plan.
 */
export function fasesDeLosPlanes(r) {
  const ids = (r?.normas || []).map(String).filter(ES_PLAN);
  return ids
    .filter((id) => FASES[id])
    .map((id) => {
      // SOLO las fases contratadas. Antes se listaban todas, y el documento
      // enumeraba fases que el cliente no estaba pagando: el alcance escrito no
      // se correspondía con el precio. Sin selección, van todas.
      const delMotor = (r?.planes || []).find((p) => p.id === id)?.fases;
      const delOpts  = r?.fasesPlan?.[id];
      const elegidas = delMotor || delOpts || null;
      const fases = FASES[id].filter((f) => !elegidas || elegidas.includes(f.id));
      return {
        plan: NORMA_BY_ID?.[id]?.nombre || id,
        horas: fases.reduce((a, f) => a + f.horas, 0),
        parcial: fases.length < FASES[id].length,
        totalFases: FASES[id].length,
        fases: fases.map((f) => ({
          nombre: f.nombre,
          horas: f.horas,
          tareas: f.tareas.map((t) => t.t),
        })),
      };
    })
    .filter((p) => p.fases.length > 0);
}

/**
 * Nombres legibles de los sistemas de la oferta.
 *
 * Existía en tres variantes —`normaNombres`, `normasNombres` y `normas`— según
 * quién rellenara el objeto, y el PDF leía una que nadie escribía: la portada
 * acababa mostrando el identificador interno («igualdad») en vez del nombre
 * («Plan de Igualdad»). Se resuelve aquí y lo usan los dos documentos.
 */
export function nombresDeNormas(r) {
  const lista = r?.normaNombres || r?.normasNombres || r?.normas || [];
  return lista.map((x) => {
    if (x && typeof x === 'object') return x.nombre || String(x);
    // Si llega un identificador («igualdad», «9001»), se traduce a su nombre.
    // Así la portada nunca enseña el nombre interno, venga de donde venga.
    return NORMA_BY_ID?.[x]?.nombre || String(x);
  });
}

/**
 * Cómo se lee un ajuste de precio en el documento.
 *
 * Se enseña el CONCEPTO y el efecto, no el porcentaje a secas: «2x1 en sedes ·
 * −1.675 €» dice mucho más que «−50 %». El motivo interno del ajuste no se
 * imprime; para el cliente vale el concepto.
 */
export function describirAjuste(a) {
  const eur = (v) => fmtEur(Math.abs(v));
  if (a.tipo === 'nxm') {
    return { concepto: a.concepto || `${a.lleva}x${a.paga}`, efecto: `−${eur(a.efecto)}` };
  }
  if (a.tipo === 'precio_fijo') {
    return { concepto: a.concepto || 'Precio cerrado', efecto: `${a.efecto < 0 ? '−' : '+'}${eur(a.efecto)}` };
  }
  const signo = a.tipo === 'recargo' ? '+' : '−';
  const cuanto = a.unidad === 'euros' ? eur(a.valor) : `${a.valor} %`;
  return {
    concepto: a.concepto || (a.tipo === 'recargo' ? `Recargo ${cuanto}` : `Descuento ${cuanto}`),
    efecto: `${signo}${eur(a.efecto)}`,
  };
}

export const fmtEur = (v) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0) + ' €';
export const fmtEur0 = (v) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v || 0) + ' €';
export const fechaLarga = () =>
  new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
