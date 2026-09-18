// ════════════════════════════════════════════════════════════════════════════
// APRENDER DE LOS PROYECTOS · sugerencias sobre las horas del catálogo
//
// «Que la IA aprenda» aquí no significa entrenar un modelo: significa que el
// sistema mire lo que YA ha pasado en vuestros proyectos y lo compare con lo
// que el catálogo dice que debería pasar. Eso es aritmética sobre datos
// propios, se puede auditar y no se inventa nada. Un modelo de lenguaje sobre
// cuatro filas solo serviría para escribir bonito una conjetura.
//
// Tres familias de sugerencias, y cada una necesita datos distintos:
//
//   · DESVIACIÓN  · lo planificado contra lo realmente imputado, subproceso a
//                   subproceso. Es la buena, y necesita historia: tareas
//                   cerradas con horas reales.
//   · COMUNES     · subprocesos que se repiten en varias normas de la misma
//                   oferta. Se hacen una vez y se planifican varias: ahí hay
//                   horas regaladas o cobradas de más, según se mire.
//   · DISPERSIÓN  · el mismo subproceso, el mismo modelo y horas muy distintas
//                   según la norma. A veces está justificado; muchas veces es
//                   que una se quedó sin actualizar.
//
// Cada sugerencia lleva su CONFIANZA (de cuántos casos sale) y su IMPACTO en
// horas. Sin las dos cosas, una sugerencia es una opinión.
//
// Funciones puras: se prueban desde Node.
// ════════════════════════════════════════════════════════════════════════════

const S = (v) => String(v ?? '').trim();
const clave = (t) => `${S(t.subproceso) || S(t.titulo)}`.toLowerCase();
const num = (v) => (Number(v) || 0);
const r1 = (n) => Math.round(n * 10) / 10;

/** Media y dispersión de una lista de números. */
function estadistica(xs) {
  const l = xs.filter((x) => Number.isFinite(x));
  if (!l.length) return null;
  const media = l.reduce((a, b) => a + b, 0) / l.length;
  const desv = Math.sqrt(l.reduce((a, b) => a + (b - media) ** 2, 0) / l.length);
  return { n: l.length, media, desv, min: Math.min(...l), max: Math.max(...l) };
}

// ── 1 · Desviación: lo planificado contra lo imputado ───────────────────────
/**
 * Compara, por subproceso, las horas del catálogo con las realmente echadas.
 *
 * Solo cuenta tareas CERRADAS: una tarea a medias con pocas horas imputadas no
 * dice que se tarde menos, dice que no ha terminado. Contarla es la forma más
 * fácil de convencerse de que todo se hace más rápido de lo que se hace.
 */
export function desviaciones({ catalogo = [], tareasCliente = [], minimoCasos = 3 }) {
  const cerradas = tareasCliente.filter((t) => t.hecha && num(t.horas_reales) > 0);
  const porClave = new Map();
  for (const t of cerradas) {
    const k = clave(t);
    if (!k) continue;
    if (!porClave.has(k)) porClave.set(k, { clave: k, subproceso: S(t.subproceso), proceso: S(t.proceso), reales: [], normas: new Set(), modelos: new Set() });
    const g = porClave.get(k);
    g.reales.push(num(t.horas_reales));
    if (t.norma_id) g.normas.add(t.norma_id);
    if (t.modelo) g.modelos.add(t.modelo);
  }

  const out = [];
  for (const g of porClave.values()) {
    const est = estadistica(g.reales);
    if (!est || est.n < minimoCasos) continue;
    // El plan: la media de lo que el catálogo dice para ese subproceso en los
    // modelos y normas donde de verdad se ha ejecutado.
    const filas = catalogo.filter((c) => clave(c) === g.clave
      && (!g.modelos.size || g.modelos.has(c.modelo))
      && (!g.normas.size || g.normas.has(c.norma_id)));
    const plan = estadistica(filas.map((c) => num(c.horas_base)));
    if (!plan || !plan.media) continue;
    const dif = est.media - plan.media;
    const pct = dif / plan.media;
    if (Math.abs(pct) < 0.2) continue;   // por debajo del 20 % no es señal, es ruido
    out.push({
      tipo: 'desviacion',
      clave: g.clave,
      subproceso: g.subproceso, proceso: g.proceso,
      plan: r1(plan.media), real: r1(est.media), dif: r1(dif), pct,
      casos: est.n,
      // Poca muestra no invalida el dato, pero cambia lo que se puede hacer
      // con él: con tres casos se mira, con diez se corrige el catálogo.
      confianza: est.n >= 10 ? 'alta' : est.n >= 5 ? 'media' : 'baja',
      impacto: Math.abs(r1(dif * filas.length)),
      ids: filas.map((c) => c.id),
      sugerido: r1(est.media),
    });
  }
  return out.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
}

// ── 2 · Tareas comunes entre normas ─────────────────────────────────────────
/**
 * Subprocesos que aparecen en varias de las normas de un mismo alcance.
 *
 * La gestión del contexto o la auditoría interna se hace UNA vez aunque se
 * certifiquen tres normas. Si el plan las cuenta tres veces, o sobran horas en
 * la oferta o se están regalando en la ejecución. Cuál de las dos, lo decide
 * quien lo mira: aquí solo se señala.
 */
export function comunes({ catalogo = [], normas = [], modelo = null }) {
  if (normas.length < 2) return [];
  const porClave = new Map();
  for (const c of catalogo) {
    if (modelo && c.modelo !== modelo) continue;
    if (!normas.includes(c.norma_id)) continue;
    const k = clave(c);
    if (!k) continue;
    if (!porClave.has(k)) porClave.set(k, { clave: k, subproceso: S(c.subproceso), proceso: S(c.proceso), porNorma: new Map() });
    // Una norma puede traer la misma clave en varias filas: se queda la mayor,
    // que es la que manda al integrar.
    const g = porClave.get(k);
    g.porNorma.set(c.norma_id, Math.max(g.porNorma.get(c.norma_id) || 0, num(c.horas_base)));
  }

  const out = [];
  for (const g of porClave.values()) {
    if (g.porNorma.size < 2) continue;
    const horas = [...g.porNorma.values()];
    const suma = horas.reduce((a, b) => a + b, 0);
    const mayor = Math.max(...horas);
    out.push({
      tipo: 'comun',
      clave: g.clave, subproceso: g.subproceso, proceso: g.proceso,
      normas: [...g.porNorma.keys()],
      suma: r1(suma), mayor: r1(mayor),
      // Lo que se ahorra si se hace una sola vez: todo menos la vez que sí hay
      // que hacer.
      ahorro: r1(suma - mayor),
    });
  }
  return out.filter((x) => x.ahorro > 0).sort((a, b) => b.ahorro - a.ahorro);
}

// ── 3 · Dispersión del catálogo ─────────────────────────────────────────────
/** El mismo subproceso y el mismo modelo con horas muy distintas según norma. */
export function dispersion({ catalogo = [], umbral = 0.6 }) {
  const porClave = new Map();
  for (const c of catalogo) {
    const k = `${clave(c)}|${c.modelo}`;
    if (!clave(c)) continue;
    if (!porClave.has(k)) porClave.set(k, { subproceso: S(c.subproceso), proceso: S(c.proceso), modelo: c.modelo, filas: [] });
    porClave.get(k).filas.push(c);
  }
  const out = [];
  for (const g of porClave.values()) {
    if (g.filas.length < 3) continue;
    const est = estadistica(g.filas.map((c) => num(c.horas_base)));
    if (!est || !est.media) continue;
    // Coeficiente de variación: la desviación en proporción a la media. Con
    // horas pequeñas, una diferencia de una hora es enorme en porcentaje y no
    // significa nada; por eso además se pide un rango mínimo de 2 h.
    const cv = est.desv / est.media;
    if (cv < umbral || (est.max - est.min) < 2) continue;
    out.push({
      tipo: 'dispersion',
      subproceso: g.subproceso, proceso: g.proceso, modelo: g.modelo,
      min: r1(est.min), max: r1(est.max), media: r1(est.media), cv,
      normas: g.filas.length,
      ids: g.filas.map((c) => c.id),
      sugerido: r1(est.media),
    });
  }
  return out.sort((a, b) => b.cv - a.cv);
}

/** Todo junto, con el estado de la muestra por delante. */
export function aprender({ catalogo = [], tareasCliente = [], normas = [], modelo = null }) {
  const cerradas = tareasCliente.filter((t) => t.hecha && num(t.horas_reales) > 0).length;
  return {
    muestra: { tareasCerradas: cerradas, tareasCliente: tareasCliente.length },
    // Sin historia no hay desviaciones que calcular, y decirlo es parte del
    // resultado: una lista vacía sin explicación se lee como «todo bien».
    desviaciones: cerradas ? desviaciones({ catalogo, tareasCliente }) : [],
    comunes: comunes({ catalogo, normas, modelo }),
    dispersion: dispersion({ catalogo }),
  };
}
