// ════════════════════════════════════════════════════════════════════════════
// CUADRO DE FACTURACIÓN
//
// Cuándo se factura cada euro de una oferta o de un contrato, mes a mes desde
// la firma. Sirve para dos cosas distintas y por eso está aparte:
//
//   · En la oferta y el contrato: que el cliente vea cuándo va a pagar.
//   · Sumando todos los contratos: la previsión de facturación del año.
//
// Sin esto, «12.000 € de implantación» no dice si entran este mes o repartidos
// en un año, que es justo lo que hace falta saber para planificar caja.
//
// Cada modelo se factura distinto, y no por capricho:
//   · mes      → cuota recurrente, un cargo cada mes
//   · proyecto → pago único al inicio, o 50 % firma + 50 % antes de auditorías
//   · bolsa    → fondo prepagado, se cobra entero al inicio
// ════════════════════════════════════════════════════════════════════════════

const IVA_POR_DEFECTO = 21;

const aFecha = (v) => {
  if (!v) return null;
  const d = new Date(`${String(v).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const sumarMeses = (d, n) => {
  const r = new Date(d);
  const dia = r.getDate();
  r.setMonth(r.getMonth() + n);
  // Si el mes destino es más corto (31 de enero + 1 mes), se queda en su último
  // día en vez de saltar al 3 de marzo.
  if (r.getDate() < dia) r.setDate(0);
  return r;
};

const iso = (d) => d.toISOString().slice(0, 10);
const clave = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const r2 = (n) => Math.round(n * 100) / 100;

/** Nombre del mes, para las tablas. */
export const mesLargo = (k) => {
  const [a, m] = String(k).split('-');
  return new Date(Number(a), Number(m) - 1, 1)
    .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
};

/**
 * Cuadro de facturación de UNA oferta o contrato.
 *
 * @param datos.tipo        'mes' · 'proyecto' · 'bolsa'
 * @param datos.importe     base imponible total (o mensual si tipo === 'mes')
 * @param datos.firma       fecha de firma o inicio
 * @param datos.meses       duración; en recurrentes, cuántos se facturan
 * @param datos.formaPago   'unico' · 'dos' (solo proyecto)
 * @param datos.certificacion  fecha de certificación: la 2ª cuota va antes
 * @param datos.iva         porcentaje, 21 por defecto
 */
export function cuadroFacturacion({
  tipo = 'mes', importe = 0, firma, meses, formaPago, certificacion, iva = IVA_POR_DEFECTO,
  // Pago anual por adelantado: se cobran once mensualidades y se prestan doce.
  adelantado = false,
} = {}) {
  const base = Number(importe) || 0;
  const inicio = aFecha(firma) || new Date();
  const cert = aFecha(certificacion);
  const factor = 1 + (Number(iva) || 0) / 100;
  const filas = [];

  const anotar = (fecha, concepto, baseImp) => filas.push({
    fecha: iso(fecha),
    mes: clave(fecha),
    concepto,
    base: r2(baseImp),
    iva: r2(baseImp * (factor - 1)),
    total: r2(baseImp * factor),
  });

  if (tipo === 'mes' && adelantado) {
    // Un solo cargo al inicio. El calendario no puede seguir enseñando doce
    // cuotas mensuales cuando lo que se firma es un pago único: el cuadro de la
    // oferta es lo que el cliente compara con su extracto bancario.
    const n = Math.max(1, Number(meses) || 12);
    const cobrados = Math.max(1, n - 1);   // once de doce, diez de once…
    anotar(inicio, `Pago anual por adelantado · ${cobrados} mensualidades`, base * cobrados);
  } else if (tipo === 'mes') {
    // Cuota recurrente. Doce meses si no se dice otra cosa: es la permanencia
    // mínima del modelo, así que es lo que se puede prever con fundamento.
    const n = Math.max(1, Number(meses) || 12);
    for (let i = 0; i < n; i++) {
      anotar(sumarMeses(inicio, i), `Cuota mensual ${i + 1} de ${n}`, base);
    }
  } else if (tipo === 'bolsa') {
    anotar(inicio, 'Fondo de horas · pago al inicio', base);
  } else {
    // Proyecto.
    if (formaPago === 'dos') {
      anotar(inicio, '50 % a la firma', base / 2);
      // La segunda va ANTES de las auditorías. Si hay fecha de certificación,
      // un mes antes; si no, a mitad del proyecto.
      const segunda = cert
        ? sumarMeses(cert, -1)
        : sumarMeses(inicio, Math.max(1, Math.round((Number(meses) || 6) / 2)));
      anotar(segunda > inicio ? segunda : sumarMeses(inicio, 1), '50 % antes del inicio de las auditorías', base / 2);
    } else {
      anotar(inicio, 'Pago único al inicio del proyecto', base);
    }
  }

  const totalBase = r2(filas.reduce((a, f) => a + f.base, 0));
  return {
    filas,
    totalBase,
    totalIva: r2(totalBase * (factor - 1)),
    total: r2(totalBase * factor),
    iva: Number(iva) || 0,
  };
}

/**
 * Suma varios cuadros por mes: la previsión de facturación.
 *
 * @param items  [{ tipo, importe, firma, meses, formaPago, certificacion, etiqueta }]
 * @param opts.desde / opts.hasta  'AAAA-MM' para acotar el horizonte
 */
export function previsionFacturacion(items = [], { desde, hasta } = {}) {
  const meses = new Map();

  for (const it of items) {
    const c = cuadroFacturacion(it);
    for (const f of c.filas) {
      if (desde && f.mes < desde) continue;
      if (hasta && f.mes > hasta) continue;
      if (!meses.has(f.mes)) meses.set(f.mes, { mes: f.mes, base: 0, total: 0, detalle: [] });
      const m = meses.get(f.mes);
      m.base = r2(m.base + f.base);
      m.total = r2(m.total + f.total);
      m.detalle.push({ etiqueta: it.etiqueta || '—', concepto: f.concepto, base: f.base });
    }
  }

  const filas = [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));
  // Acumulado: para ver cuándo se alcanza el objetivo del año.
  let acc = 0;
  for (const f of filas) { acc = r2(acc + f.base); f.acumulado = acc; }

  return {
    filas,
    totalBase: acc,
    // Media mensual sobre los meses CON facturación, no sobre el calendario:
    // dividir entre doce cuando solo se factura en cuatro engaña.
    mediaMensual: filas.length ? r2(acc / filas.length) : 0,
  };
}
