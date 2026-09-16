// ════════════════════════════════════════════════════════════════════════════
// EL DOCUMENTO DE LA OFERTA · una sola forma de montarlo (v141)
//
// Lo que ve el cliente tiene que ser lo mismo que ve el equipo. Para eso el
// PDF, el PPTX y la vista previa de Órbita parten del MISMO objeto: el
// resultado del motor (`calcular`) enriquecido con lo que el documento
// necesita (fechas, notas, emisora, forma de pago…). Antes ese enriquecimiento
// vivía dentro de la función de Netlify y el navegador no podía reproducirlo.
//
// Tres piezas:
//   · montarDocumento(body)        → { r, cli, anexo } igual que en el servidor
//   · paraCliente({ r, cli, anexo }) → la copia que se guarda en
//     `presupuestos.documento` y que se enseña al cliente: SIN la lógica
//     (reglas, horas por nivel, márgenes, notas internas, motivos de ajuste).
//   · logicaDe(r)                    → lo que solo ve el equipo, ordenado.
// ════════════════════════════════════════════════════════════════════════════
import { calcular, NORMA_BY_ID, IVA, mismoModelo } from './calcEngine.js';
import { DISCLAIMER_OFERTA } from './legal.js';
import { CATALOGO_ANEXO } from './catalogoAnexo.js';

// Mapa de prefijo de proceso → nombre de bloque legible (para agrupar el Anexo I).
export const BLOQUES = {
  PE1: 'Planificación estratégica', PE2: 'Evaluación del desempeño', PE3: 'Mejora continua',
  PE4: 'Gestión de la cartera de innovación', PE5: 'Gobernanza de IA',
  PA1: 'Gestión de personas', PA2: 'Gestión medioambiental', PA3: 'Gestión del conocimiento e información',
  PA4: 'Gestión de infraestructuras y activos', PA5: 'Gestión de seguridad de la información',
  PA6: 'Gestión de partes subcontratadas', PA7: 'Gestión económica y administrativa',
  PA8: 'Gestión de PI y vigilancia', PA9: 'Gestión de alianzas', PA10: 'Gestión de datos para IA',
  PA11: 'Información a partes interesadas', PA12: 'Uso responsable de IA', PA13: 'Relaciones con terceros',
  PA19: 'Gestión de la privacidad',
  PI1: 'Proceso de innovación', PI2: 'Gestión de iniciativas de innovación', PI3: 'Ciclo de vida del sistema de IA',
  PR1: 'Incorporación de usuarios', PR2: 'Atención al usuario', PR3: 'Baja y servicios generales',
};

/**
 * Anexo I: subprocesos del modelo que aplican a las normas elegidas, por bloque.
 *
 * ── Por qué acepta el catálogo vivo (v145) ──
 * El anexo salía SIEMPRE de `catalogoAnexo.js`, un fichero generado a mano que
 * se quedó atrás: no tenía los planes (igualdad, diversidad) ni la tarea de
 * kickoff. Una oferta de Plan de Diversidad salía con el Anexo I VACÍO, cuando
 * en la base sus tareas existían desde el principio. Ahora, si quien monta el
 * documento puede leer `tareas_catalogo` —el navegador con su sesión, la
 * función de Netlify con la clave de servicio—, el anexo sale de ahí y no
 * puede volver a divergir. El fichero estático queda como red de seguridad.
 *
 * @param catalogoVivo  filas de `tareas_catalogo` [{norma_id, modelo, proceso, subproceso, orden}]
 */
export function tareasPorBloque(normaIds, modeloId, catalogoVivo = null) {
  const ids = normaIds || [];
  // El modelo «Auditoría» no implanta nada: solo son jornadas. Un anexo de
  // tareas de implantación ahí sería sencillamente falso.
  if (modeloId === 'Auditoría') return [];

  // El respaldo es POR NORMA, no por oferta. Con «o todo vivo o todo estático»,
  // una oferta mixta (un sistema que sí está en la base y otro que no) perdía
  // las tareas del segundo sin avisar. Cada norma se resuelve por su cuenta.
  const vivas = Array.isArray(catalogoVivo)
    ? catalogoVivo.filter((f) => mismoModelo(f.modelo, modeloId) && ids.includes(f.norma_id))
    : [];
  const conVivas = new Set(vivas.map((f) => f.norma_id));
  const huerfanas = ids.filter((id) => !conVivas.has(id));
  const filas = [
    ...vivas
      .slice()
      .sort((a, b) => (Number(a.orden) || 0) - (Number(b.orden) || 0))
      .map((f) => ({ proc: f.proceso || '', sub: f.subproceso || f.titulo || '', normas: [f.norma_id] })),
    ...(huerfanas.length
      ? (CATALOGO_ANEXO[modeloId] || CATALOGO_ANEXO['Implantación'] || [])
          .filter((f) => f.normas.some((id) => huerfanas.includes(id)))
      : []),
  ];

  const grupos = new Map();
  for (const f of filas) {
    if (!f.sub || !f.normas.some((id) => ids.includes(id))) continue;
    const pref = (f.proc.split(' ')[0] || '').toUpperCase();
    const bloque = BLOQUES[pref] || f.proc || 'Tareas';
    if (!grupos.has(bloque)) grupos.set(bloque, new Set());
    // Con el catálogo vivo hay una fila por norma: el mismo subproceso llega
    // repetido tantas veces como sistemas lo compartan. Se enseña una vez.
    grupos.get(bloque).add(f.sub.replace(/^S\d+\s+/, '').replace(/\s*\(.*?\)\s*$/, '').trim());
  }
  return [...grupos.entries()].map(([bloque, subs]) => ({ bloque, subs: [...subs] }));
}

/** Suma meses a una fecha ISO respetando el fin de mes (31 ene + 1 = 28 feb). */
export function sumarMesesISO(fechaISO, meses, masUnDia = false) {
  if (!fechaISO) return null;
  const d = new Date(`${String(fechaISO).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const dia = d.getDate();
  d.setMonth(d.getMonth() + meses);
  if (d.getDate() < dia) d.setDate(0);
  if (masUnDia) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const r2 = (x) => Math.round(x * 100) / 100;

/**
 * El precio que se vio en pantalla (o el que se emitió) manda sobre el que
 * calcularía hoy el motor. Se rehacen impuestos, formas de pago y fraccionado
 * sobre ese precio para que el documento no mezcle dos cálculos.
 */
export function aplicarOverride(r, ov) {
  if (!r || !ov || !Number.isFinite(Number(ov.precioCatalogo))) return r;
  r.precioBase = Number(ov.precioBase ?? r.precioCatalogo);
  r.precioCatalogo = Number(ov.precioCatalogo);
  if (ov.horas) r.horas = ov.horas;
  if (Number.isFinite(Number(ov.hTotal))) r.hTotal = Number(ov.hTotal);
  r.reglasAplicadas = Array.isArray(ov.reglas) ? ov.reglas : [];
  r.iva = r2(r.precioCatalogo * IVA);
  r.totalConIva = r2(r.precioCatalogo + r.iva);
  if (r.formasPago && !r.formasPago.dos) {
    const base = r.precioCatalogo;
    r.formasPago = { ...r.formasPago, unico: { ...r.formasPago.unico, sinIva: base, iva: r2(base * IVA), total: r2(base * (1 + IVA)), ahorro: 0 } };
  }
  if (r.formasPago && r.formasPago.dos) {
    const base = r.precioCatalogo;
    const dto = r.formasPago.descuentoUnico ?? 0.05;
    const unicoSinIva = r2(base * (1 - dto));
    const cuota = r2(base / 2);
    r.formasPago = {
      ...r.formasPago,
      unico: { ...r.formasPago.unico, sinIva: unicoSinIva, iva: r2(unicoSinIva * IVA), total: r2(unicoSinIva * (1 + IVA)), ahorro: r2(base - unicoSinIva) },
      dos: { ...r.formasPago.dos, sinIva: base, iva: r2(base * IVA), total: r2(base * (1 + IVA)),
             cuota1: r2(cuota * (1 + IVA)), cuota2: r2(base * (1 + IVA) - r2(cuota * (1 + IVA))),
             cuota1SinIva: cuota, cuota2SinIva: r2(base - cuota) },
    };
  }
  if (r.fraccionado) {
    const totalConIvaFrac = r2(r.precioCatalogo * (1 + IVA));
    const c1 = r2(totalConIvaFrac / 2);
    const c1Sin = r2(r.precioCatalogo / 2);
    r.fraccionado = { ...r.fraccionado, totalSinIva: r.precioCatalogo, totalConIva: totalConIvaFrac, cuota1: c1, cuota2: r2(totalConIvaFrac - c1), cuota3: 0, cuota1SinIva: c1Sin, cuota2SinIva: r2(r.precioCatalogo - c1Sin) };
  }
  return r;
}

/** Lo que el documento necesita además del cálculo. `body` es lo que se manda a generar-oferta. */
export function enriquecer(r, body = {}) {
  const normas = body.normas || r.normas || [];
  const modelo = body.modelo || r.modelo;
  r.canal = body.canal || r.canal || 'interno';
  r.disclaimer = body.disclaimer || DISCLAIMER_OFERTA;
  r.formaPagoElegida = body.forma_pago || body.formaPago || null;
  r.notas = body.notas_oferta || body.notas || null;
  r.fasesPlan = body.fasesPlan || body.fases_plan || null;
  r.emisora_id = body.emisora_id || body.emisoraId || 'trescore';
  r.modeloMantenimiento = body.modelo_mantenimiento || body.modeloMantenimiento || null;
  r.normaNombres = normas.map((id) => (NORMA_BY_ID[id]?.nombre || id));
  r.normasNombres = r.normaNombres;
  const esRecurrente = r.tipo === 'mes' && modelo !== 'Implantación';
  r.meses = Math.max(parseInt(body.meses, 10) || (r.fraccionado?.meses) || (esRecurrente ? 12 : 3), 1);
  r.fecha_inicio = body.fecha_inicio || null;
  r.fecha_certificacion = body.fecha_certificacion || null;
  r.fecha_emision = body.fecha_emision || null;
  r.fecha_primer_pago = body.fecha_primer_pago || body.fecha_inicio || null;
  r.fecha_fin = body.fecha_fin || (body.fecha_inicio ? sumarMesesISO(body.fecha_inicio, 12, esRecurrente) : null);
  r.numero = body.ref || body.numero_oferta || r.numero || '';
  r.complejidad = body.complejidad || r.complejidad || null;
  r.sedes = body.sedes || r.sedes || 1;
  r.situacion = body.situacion || r.situacion || null;
  return r;
}

/**
 * Monta el documento como lo hace el servidor. Si `body.r` viene ya calculado
 * (el generador lo tiene, con las reglas comerciales aplicadas) se usa tal cual;
 * si no, se calcula con los mismos parámetros que se guardan en el CRM.
 */
export function montarDocumento(body = {}) {
  const normas = body.normas || [];
  const modelo = body.modelo || '';
  let r = body.r ? { ...body.r } : calcular(normas, modelo, {
    meses: body.meses, tiene9001: !!body.tiene9001,
    fasesPlan: body.fasesPlan || body.fases_plan || undefined,
    ajustes: body.ajustes || [],
    preciosSistema: body.preciosSistema || body.precios_sistema || null,
    repartoNiveles: body.repartoNiveles || body.reparto_niveles || null,
    aplicarReglas: body.aplicar_reglas !== false,
    pagoAdelantado: body.pago_adelantado === true,
    complejidad: body.complejidad, sedes: body.sedes,
    jornadasAuditoria: body.jornadas_auditoria ?? body.jornadasAuditoria ?? 0,
  });
  if (!r) return null;
  r = aplicarOverride(r, body.override);
  r = enriquecer(r, { ...body, normas, modelo });
  const cli = {
    empresa: body.empresa || '', cif: body.cif || '', contacto: body.contacto || '', cargo: body.cargo || '',
    ref: r.numero, comercial: body.comercial || 'Alejandro', direccion: body.direccion || '', email: body.email || '',
    telefono: body.telefono || null,
  };
  return { r, cli, anexo: tareasPorBloque(normas, modelo, body.catalogo || null) };
}

// ── Lo que el cliente ve ────────────────────────────────────────────────────
// Campos del resultado que aparecen en el documento. Todo lo demás (reglas,
// horas por nivel, coste, margen, motivos de los ajustes, notas internas,
// aprobación) se queda fuera: es la lógica de la oferta, no la oferta.
const CAMPOS_CLIENTE = [
  'modelo', 'tipo', 'meses', 'normas', 'normaNombres', 'normasNombres', 'nSistemas',
  'precioCatalogo', 'precioAntesDeAjustes', 'ajusteOferta', 'iva', 'totalConIva',
  'adelantado', 'pagoAdelantado', 'formasPago', 'formaPagoElegida', 'fraccionado', 'auditoria',
  'hTotal', 'dedicacion', 'tiene9001', 'complejidad', 'sedes', 'planes', 'fasesPlan',
  'fecha_emision', 'fecha_inicio', 'fecha_fin', 'fecha_certificacion', 'fecha_primer_pago',
  'notas', 'canal', 'disclaimer', 'emisora_id', 'modeloMantenimiento', 'numero', 'situacion',
  'maxMeses', 'minMeses',
];

export function paraCliente({ r, cli, anexo }) {
  if (!r) return null;
  const copia = {};
  for (const k of CAMPOS_CLIENTE) if (r[k] !== undefined) copia[k] = r[k];
  // Los ajustes salen con concepto y efecto; el motivo interno no.
  copia.ajustes = (r.ajustes || []).filter((a) => a.efecto).map((a) => ({
    tipo: a.tipo, unidad: a.unidad ?? null, valor: a.valor ?? null, lleva: a.lleva ?? null, paga: a.paga ?? null,
    concepto: a.concepto || null, efecto: a.efecto,
  }));
  // Los planes: fases y horas, que sí se imprimen. Sin coste ni nivel.
  if (Array.isArray(r.planes)) copia.planes = r.planes.map((p) => ({ id: p.id, fases: p.fases }));
  const c = cli ? { empresa: cli.empresa || '', cif: cli.cif || '', contacto: cli.contacto || '', cargo: cli.cargo || '', email: cli.email || '', direccion: cli.direccion || '', comercial: cli.comercial || '' } : {};
  return JSON.parse(JSON.stringify({ v: 1, r: copia, cli: c, anexo: anexo || [] }));
}

/** Lo que solo ve el equipo, listo para pintar. */
export function logicaDe(r) {
  if (!r) return null;
  return {
    precioBase: r.precioBase, precioCatalogo: r.precioCatalogo, precioAntesDeAjustes: r.precioAntesDeAjustes,
    ajusteReglas: r.ajusteReglas, reglas: r.reglas || r.reglasAplicadas || [], reglasActivas: r.reglasActivas,
    desgloseSistemas: r.desgloseSistemas || null, volumen: r.volumen || null,
    horas: r.horas || null, hTotal: r.hTotal, hInternas: r.hInternas, coste: r.coste, margen: r.margen,
    rentabilidad: r.rentabilidad || null, ajustes: r.ajustes || [],
    aprobada_por: r.aprobada_por || null, aprobada_nota: r.aprobada_nota || null,
  };
}

// ── Situación de partida (v141) ─────────────────────────────────────────────
// Tres puertas de entrada al creador de ofertas. Cada una acota los modelos
// que tienen sentido; el modelo concreto se elige después.
export const SITUACIONES = [
  { id: 'desde_cero', titulo: 'Desde cero', sub: 'Implantación', modelos: ['Implantación'],
    ayuda: 'No hay sistema (o no está certificado). Se implanta de principio a fin como proyecto, y al terminar pasa a un modelo de mantenimiento.' },
  { id: 'certificado', titulo: 'Ya tengo certificado', sub: 'Relación · Implicación · Compromiso', modelos: ['Relación', 'Implicación', 'Compromiso'],
    ayuda: 'El sistema existe y hay que mantenerlo vivo: acompañamiento recurrente con dedicación mensual y permanencia de doce meses.' },
  { id: 'urgente', titulo: 'Ya tengo, pero es urgente', sub: 'Apoyo · nunca a más de 3 meses', modelos: ['Apoyo'],
    ayuda: 'Auditoría a la vista y hay que llegar: bolsa de horas para la recta final. Solo con tres meses o menos hasta la certificación.' },
  { id: 'auditoria', titulo: 'Solo la auditoría', sub: 'Acompañamiento por jornadas', modelos: ['Auditoría'],
    ayuda: 'No se contrata implantación ni mantenimiento: solo que estemos el día de la auditoría externa. Se cobra por jornadas, en un pago único.' },
];
export const SITUACION_BY_ID = Object.fromEntries(SITUACIONES.map((s) => [s.id, s]));
export const situacionDeModelo = (m) => SITUACIONES.find((s) => s.modelos.includes(m))?.id || null;
