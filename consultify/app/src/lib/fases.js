// ════════════════════════════════════════════════════════════════════════════
// PLANES DE IGUALDAD Y DIVERSIDAD · desglose por fases
//
// Horas tomadas del desglose de tareas facilitado: 101 h el Plan de Igualdad y
// 147 h el de Diversidad, de las que 46 h son tareas que no existen en Igualdad.
// La tarifa de estos proyectos es plana: 99 €/h.
//
// REGLA DE INTEGRACIÓN
// Si se contratan los dos, las tareas comunes se aprovechan, pero NO al 100 %:
// son dos documentos con contenido y registro propios. La compartibilidad se
// fija fase a fase y de ahí sale el factor global del Plan de Diversidad
// cuando va acompañado del de Igualdad.
// ════════════════════════════════════════════════════════════════════════════

export const TARIFA_PROYECTO = 99;   // €/hora, tarifa plana de estos planes

export const FASES = {
  igualdad: [
    {
      id: '1', nombre: '1. Compromiso de la organización', horas: 4,
      compartible: 1.0, motivoCompartible: 'Una sola decisión de dirección y una sola comunicación cubren los dos planes.',
      tareas: [
        { t: 'Decisión y comunicación del compromiso · Definición del equipo de trabajo', h: 4, nueva: false },
      ],
    },
    {
      id: '2', nombre: '2. Comité o Comisión Permanente de Igualdad', horas: 2,
      compartible: 1.0, motivoCompartible: 'Un único órgano puede asumir ambos planes si se constituye así desde el principio.',
      tareas: [
        { t: 'Creación del equipo de trabajo', h: 2, nueva: false },
      ],
    },
    {
      id: '3', nombre: '3. Diagnóstico', horas: 15,
      compartible: 0.8, motivoCompartible: 'Los datos se recogen una vez; el análisis hay que leerlo con dos miradas distintas.',
      tareas: [
        { t: 'Planificación', h: 5, nueva: false },
        { t: 'Recogida de información', h: 5, nueva: false },
        { t: 'Análisis y presentación de propuestas', h: 5, nueva: false },
      ],
    },
    {
      id: '4', nombre: '4. Programación', horas: 35,
      compartible: 0.3, motivoCompartible: 'Son DOS documentos con contenido y registro propios. Se comparte el método, no la redacción.',
      tareas: [
        { t: 'Elaboración del Plan de Igualdad', h: 15, nueva: false },
        { t: 'Planificación del Plan', h: 20, nueva: false },
      ],
    },
    {
      id: '5', nombre: '5. Implantación', horas: 15,
      compartible: 0.5, motivoCompartible: 'Las acciones difieren, pero la campaña de comunicación y el despliegue se hacen juntos.',
      tareas: [
        { t: 'Ejecución de las acciones previstas', h: 5, nueva: false },
        { t: 'Comunicación, seguimiento y control', h: 10, nueva: false },
      ],
    },
    {
      id: '6', nombre: '6. Evaluación', horas: 10,
      compartible: 0.6, motivoCompartible: 'Los indicadores son distintos; la recogida y el informe se hacen en una sola pasada.',
      tareas: [
        { t: 'Análisis de los resultados obtenidos', h: 5, nueva: false },
        { t: 'Recomendaciones de mejora', h: 5, nueva: false },
      ],
    },
    {
      id: 'me', nombre: 'Medidas transversales (fases 1-6)', horas: 20,
      compartible: 0.7, motivoCompartible: 'Comunicación, formación y seguimiento se imparten conjuntamente.',
      tareas: [
        { t: 'Comunicación interna', h: 5, nueva: false },
        { t: 'Comunicación e imagen externa', h: 5, nueva: false },
        { t: 'Formación', h: 5, nueva: false },
        { t: 'Seguimiento', h: 5, nueva: false },
      ],
    },
  ],
  diversidad: [
    {
      id: '1', nombre: '1. Compromiso de la organización', horas: 4,
      compartible: 1.0, motivoCompartible: 'Una sola decisión de dirección y una sola comunicación cubren los dos planes.',
      tareas: [
        { t: 'Decisión y comunicación del compromiso · Definición del equipo de trabajo', h: 4, nueva: false },
      ],
    },
    {
      id: '2', nombre: '2. Comité o Comisión Permanente de Diversidad', horas: 2,
      compartible: 1.0, motivoCompartible: 'Un único órgano puede asumir ambos planes si se constituye así desde el principio.',
      tareas: [
        { t: 'Creación del equipo de trabajo', h: 2, nueva: false },
      ],
    },
    {
      id: '3', nombre: '3. Diagnóstico', horas: 30,
      compartible: 0.8, motivoCompartible: 'Los datos se recogen una vez; el análisis hay que leerlo con dos miradas distintas.',
      tareas: [
        { t: 'Planificación', h: 5, nueva: false },
        { t: 'Recogida de información', h: 5, nueva: false },
        { t: 'Análisis y presentación de propuestas', h: 5, nueva: false },
        { t: 'Análisis por ejes de diversidad', h: 6, nueva: true },
        { t: 'Cumplimiento LGD y accesibilidad', h: 4, nueva: true },
        { t: 'Encuesta de clima inclusivo', h: 5, nueva: true },
      ],
    },
    {
      id: '4', nombre: '4. Programación', horas: 48,
      compartible: 0.3, motivoCompartible: 'Son DOS documentos con contenido y registro propios. Se comparte el método, no la redacción.',
      tareas: [
        { t: 'Elaboración del Plan de Diversidad', h: 15, nueva: false },
        { t: 'Planificación del Plan', h: 20, nueva: false },
        { t: 'Medidas planificadas LGTBI y protocolo de acoso', h: 8, nueva: true },
        { t: 'Política DEI y código de conducta', h: 5, nueva: true },
      ],
    },
    {
      id: '5', nombre: '5. Implantación', horas: 20,
      compartible: 0.5, motivoCompartible: 'Las acciones difieren, pero la campaña de comunicación y el despliegue se hacen juntos.',
      tareas: [
        { t: 'Ejecución de las acciones previstas', h: 5, nueva: false },
        { t: 'Comunicación, seguimiento y control', h: 10, nueva: false },
        { t: 'Revisión de procesos libres de sesgo', h: 5, nueva: true },
      ],
    },
    {
      id: '6', nombre: '6. Evaluación', horas: 14,
      compartible: 0.6, motivoCompartible: 'Los indicadores son distintos; la recogida y el informe se hacen en una sola pasada.',
      tareas: [
        { t: 'Análisis de los resultados obtenidos', h: 5, nueva: false },
        { t: 'Recomendaciones de mejora', h: 5, nueva: false },
        { t: 'Cuadro de indicadores DEI y reporting', h: 4, nueva: true },
      ],
    },
    {
      id: 'me', nombre: 'Medidas transversales (fases 1-6)', horas: 29,
      compartible: 0.7, motivoCompartible: 'Comunicación, formación y seguimiento se imparten conjuntamente.',
      tareas: [
        { t: 'Comunicación interna', h: 5, nueva: false },
        { t: 'Comunicación e imagen externa', h: 5, nueva: false },
        { t: 'Formación', h: 5, nueva: false },
        { t: 'Seguimiento', h: 5, nueva: false },
        { t: 'Formación en sesgos inconscientes y liderazgo inclusivo', h: 6, nueva: true },
        { t: 'Guía de lenguaje y comunicación inclusiva', h: 3, nueva: true },
      ],
    },
  ],
};

// Las variantes «con seguimiento» comparten las fases del plan base y añaden
// una séptima: el acompañamiento del primer año.
export const FASE_SEGUIMIENTO = {
  id: 'seg', nombre: '7. Seguimiento del primer año', horas: 24,
  compartible: 0.75, motivoCompartible: 'Una sola comisión y un solo informe pueden cubrir los dos planes.',
  tareas: [
    { t: 'Dos comisiones de seguimiento', h: 4, nueva: false },
    { t: 'Revisión de indicadores', h: 6, nueva: false },
    { t: 'Informe anual de seguimiento', h: 8, nueva: false },
    { t: 'Actualización del registro', h: 6, nueva: false },
  ],
};

FASES['igualdad-seg'] = [...FASES.igualdad, FASE_SEGUIMIENTO];
FASES['diversidad-seg'] = [...FASES.diversidad, FASE_SEGUIMIENTO];

/** Plan base del que cuelga cada variante, para la regla de integración. */
export const PLAN_BASE = { 'igualdad-seg': 'igualdad', 'diversidad-seg': 'diversidad' };

/** Horas de una fase que ya existen en el Plan de Igualdad (no marcadas como nuevas). */
const horasComunes = (fase) => fase.tareas.filter((t) => !t.nueva).reduce((a, t) => a + t.h, 0);

/**
 * Ahorro al contratar los dos planes, fase a fase.
 * Devuelve las horas que NO hay que repetir y el detalle de cómo salen.
 */
export function ahorroIntegracion(fasesIds = null, plan = 'diversidad') {
  const detalle = (FASES[plan] || FASES.diversidad)
    .filter((f) => !fasesIds || fasesIds.includes(f.id))
    .map((f) => {
      const comunes = horasComunes(f);
      return {
        fase: f.nombre,
        comunes,
        compartible: f.compartible,
        ahorro: Math.round(comunes * f.compartible * 10) / 10,
        motivo: f.motivoCompartible,
      };
    });
  const ahorro = detalle.reduce((a, x) => a + x.ahorro, 0);
  return { detalle, ahorro, importe: Math.round(ahorro * TARIFA_PROYECTO) };
}

/**
 * Cálculo por fases. `planes` es un array con 'igualdad', 'diversidad' o ambos.
 * `seleccion` es { igualdad: ['1','3'], diversidad: [...] }; si falta, van todas.
 */
export function calcularFases(planes, seleccion = {}, opts = {}) {
  const tarifa = opts.tarifa || TARIFA_PROYECTO;
  const lineas = [];
  let horas = 0;

  for (const plan of planes) {
    const fases = FASES[plan];
    if (!fases) continue;
    const ids = seleccion[plan] || fases.map((f) => f.id);
    for (const f of fases) {
      if (!ids.includes(f.id)) continue;
      horas += f.horas;
      lineas.push({ plan, fase: f.nombre, id: f.id, horas: f.horas, importe: f.horas * tarifa });
    }
  }

  // La integración solo aplica si van los dos planes, y solo sobre las fases
  // de Diversidad efectivamente seleccionadas.
  // Hay integración si van un plan de igualdad y uno de diversidad, en
  // cualquiera de sus dos variantes.
  const tieneIg = planes.some((p) => p.startsWith('igualdad'));
  const tieneDiv = planes.find((p) => p.startsWith('diversidad'));
  const integracion = (tieneIg && tieneDiv)
    ? ahorroIntegracion(seleccion[tieneDiv] || FASES[tieneDiv].map((f) => f.id), tieneDiv)
    : { detalle: [], ahorro: 0, importe: 0 };

  const horasFinales = Math.round((horas - integracion.ahorro) * 10) / 10;
  return {
    lineas,
    horasBrutas: horas,
    ahorroHoras: integracion.ahorro,
    integracion,
    horas: horasFinales,
    tarifa,
    importe: Math.round(horasFinales * tarifa),
    importeSinIntegrar: Math.round(horas * tarifa),
    iva: Math.round(horasFinales * tarifa * 0.21 * 100) / 100,
    total: Math.round(horasFinales * tarifa * 1.21 * 100) / 100,
  };
}

/** Factor global del Plan de Diversidad cuando va con el de Igualdad. */
export function factorIntegracionGlobal(plan = 'diversidad') {
  const fases = FASES[plan] || FASES.diversidad;
  const total = fases.reduce((a, f) => a + f.horas, 0);
  const { ahorro } = ahorroIntegracion(null, plan);
  return Math.round(((total - ahorro) / total) * 100) / 100;
}
