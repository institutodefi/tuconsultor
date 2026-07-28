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

export const EMISOR = {
  marca: 'TuConsultor',
  razonSocial: 'TRESCORE PROYECTOS ITE, S.L.',
  cif: 'B84867670',
  email: 'hola@tuconsultor.com',
  rgpd: 'rgpd@tuconsultor.com',
  firmante: 'Alejandro San Nicolás',
  cargo: 'CEO de TuConsultor',
  legalPie: 'TuConsultor · CIF B84867670 · hola@tuconsultor.com',
};

/** Condiciones generales. `r` es el resultado del cálculo. */
export function condiciones(r) {
  return [
    'Precios sin IVA salvo indicación expresa. IVA del 21 % aplicable.',
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
       ? 'La implantación es un proyecto con principio y fin: termina cuando el sistema queda listo para la auditoría externa de certificación. No es una cuota indefinida.'
       : 'Es un modelo de acompañamiento recurrente, con una dedicación mensual pactada y permanencia mínima de doce meses.')],
    ['2 · El modelo se basa en horas al mes y en tareas',
     'Lo que se contrata son dos cosas a la vez: una dedicación expresada en horas al mes y un conjunto de tareas concretas, las del Anexo I. Las horas dimensionan el esfuerzo; las tareas definen el resultado. Ninguna de las dos por separado describe el servicio.'],
    ['3 · Cumplidas las tareas y los objetivos, no hay obligación de más horas',
     'Cuando las tareas del periodo están hechas y los objetivos alcanzados, el trabajo del periodo está completo. No existe obligación de consumir horas restantes en trabajo adicional. Lo que sí se mantiene es la asistencia técnica: resolución de dudas, apoyo ante incidencias y acompañamiento del sistema, sin coste añadido.'],
    ['4 · Todo trabajo ajeno al alcance se presupuesta y factura aparte',
     'Cualquier encargo que no figure en el Anexo I —nuevos sistemas, sedes adicionales, auditorías no previstas, formación específica o adaptaciones fuera del alcance— se presupuesta por separado antes de ejecutarse y se factura aparte. Nunca se ejecuta trabajo fuera de alcance sin presupuesto aceptado.'],
  ];
}

/** Título y subtítulo de la sección «la propuesta», iguales en los dos formatos. */
export function propuesta(r, cli) {
  const esImpl = r?.modelo === 'Implantación';
  return {
    titulo: esImpl
      ? 'Implantación completa del sistema de gestión'
      : `Acompañamiento en modelo ${r?.modelo || ''}`,
    texto: esImpl
      ? `Ejecutamos el programa completo: el equipo consultor lleva el peso del trabajo documental y técnico hasta dejar a ${cli?.empresa || 'la organización'} lista para la auditoría externa de certificación.`
      : `El equipo consultor acompaña a ${cli?.empresa || 'la organización'} en el desarrollo y el mantenimiento del sistema, con una dedicación recurrente pactada y sin sorpresas de facturación.`,
  };
}

export const fmtEur = (v) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0) + ' €';
export const fmtEur0 = (v) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(v || 0) + ' €';
export const fechaLarga = () =>
  new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
