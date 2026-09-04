// ════════════════════════════════════════════════════════════════════════════
// REGLAS COMERCIALES · motor de condiciones
//
// Una regla es una condición + un efecto. Se dan de alta de una en una desde
// Comercial › Reglas comerciales y el generador de ofertas las aplica en vivo,
// de modo que la misma combinación de normas y modelo puede dar precios
// distintos según las reglas vigentes ese día.
//
// Orden de aplicación (importa, y es el orden natural del cálculo):
//   1 · optimizacion → ajusta HORAS       (y con ellas el precio, que deriva de ellas)
//   2 · precio_hora  → ajusta TARIFA €/h
//   3 · margen       → sustituye el margen
//   4 · descuento / recargo → ajustan el PRECIO final de catálogo
//
// Este módulo no importa nada del motor de cálculo: es al revés, para que no
// haya dependencia circular.
// ════════════════════════════════════════════════════════════════════════════

export const TIPOS_REGLA = [
  {
    k: 'optimizacion',
    label: 'Optimización de sistemas',
    ayuda: 'Reduce (o amplía) las horas cuando se integran varios sistemas. El precio se recalcula sobre las horas resultantes.',
    ejemplo: 'A partir de 3 sistemas, −15 % de horas por solape documental.',
    unidades: ['porcentaje', 'factor'],
    pideNivel: true,
  },
  {
    k: 'precio_hora',
    label: 'Precio por hora',
    ayuda: 'Fija el precio/hora de un nivel de consultoría, o de todos a la vez. Sustituye la tarifa de catálogo.',
    ejemplo: 'En el modelo Implantación, la hora J3 se factura a 60 €.',
    unidades: ['euros'],
    pideNivel: true,
  },
  {
    k: 'margen',
    label: 'Margen',
    ayuda: 'Sustituye el margen del 60 % con el que se convierte coste en precio.',
    ejemplo: 'Licitaciones públicas: margen del 45 %.',
    unidades: ['porcentaje'],
    pideNivel: false,
  },
  {
    k: 'descuento',
    label: 'Descuento',
    ayuda: 'Rebaja el precio final, en porcentaje o en euros. Se aplica después del redondeo de catálogo.',
    ejemplo: 'Modelo Relación: −10 % durante todo el mes de septiembre.',
    unidades: ['porcentaje', 'euros'],
    pideNivel: false,
  },
  {
    k: 'recargo',
    label: 'Recargo',
    ayuda: 'Incrementa el precio final, en porcentaje o en euros.',
    ejemplo: 'Más de tres sedes: +12 %.',
    unidades: ['porcentaje', 'euros'],
    pideNivel: false,
  },
];

export const TIPO_REGLA = Object.fromEntries(TIPOS_REGLA.map((t) => [t.k, t]));

export const NIVELES = ['J1', 'J2', 'J3', 'Senior'];

// Características del proyecto sobre las que se puede condicionar una regla.
export const COMPLEJIDADES_REGLA = ['baja', 'media', 'alta'];

export const CANALES = [
  { k: 'todos',   label: 'Web e interno' },
  { k: 'web',     label: 'Solo web (pública)' },
  { k: 'interno', label: 'Solo interno (equipo)' },
];

export const UNIDAD_LABEL = { porcentaje: '%', euros: '€', factor: '×' };

// ── Normalización ───────────────────────────────────────────────────────────

/** Lista de textos: acepta array, string separado por comas, o vacío. */
export const aLista = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean).map((x) => String(x).trim());
  if (typeof v === 'string') return v.split(',').map((x) => x.trim()).filter(Boolean);
  return [];
};

const aFecha = (v) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(String(v).length <= 10 ? `${v}T00:00:00` : v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Solo la fecha (sin hora) para comparar rangos de vigencia sin sesgo de zona. */
const soloDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// ── Vigencia y condiciones ──────────────────────────────────────────────────

/** ¿La regla está activa y dentro de su ventana de vigencia? */
export function reglaVigente(r, fecha = new Date()) {
  if (!r || r.activa === false) return false;
  const hoy = soloDia(fecha instanceof Date ? fecha : new Date(fecha));
  const desde = aFecha(r.vigente_desde);
  const hasta = aFecha(r.vigente_hasta);
  if (desde && hoy < soloDia(desde)) return false;
  if (hasta && hoy > soloDia(hasta)) return false;
  return true;
}

/**
 * ¿La regla encaja con esta oferta concreta?
 * ctx = { modelo, normas[], nSistemas, tiene9001, canal }
 */
export function reglaAplica(r, ctx = {}) {
  if (!r) return false;

  // Canal: 'todos' encaja siempre; si no, debe coincidir.
  const canalRegla = r.canal || 'todos';
  if (canalRegla !== 'todos' && ctx.canal && canalRegla !== ctx.canal) return false;

  // Modelos: vacío = todos.
  const modelos = aLista(r.modelos);
  if (modelos.length && ctx.modelo && !modelos.includes(ctx.modelo)) return false;

  // Normas: si se indican, la oferta debe incluir TODAS las indicadas.
  const normas = aLista(r.normas);
  if (normas.length) {
    const enOferta = new Set(aLista(ctx.normas));
    if (!normas.every((n) => enOferta.has(n))) return false;
  }

  // Nº de sistemas.
  const n = Number(ctx.nSistemas || 0);
  if (r.min_sistemas != null && r.min_sistemas !== '' && n < Number(r.min_sistemas)) return false;
  if (r.max_sistemas != null && r.max_sistemas !== '' && n > Number(r.max_sistemas)) return false;

  // ¿Exige que el cliente ya tenga (o no tenga) la 9001?
  if (r.solo_si_tiene_9001 === true && !ctx.tiene9001) return false;
  if (r.solo_si_tiene_9001 === false && ctx.tiene9001) return false;

  // ── Características del proyecto ──
  // Complejidad: vacío = cualquiera.
  const compl = aLista(r.complejidad);
  if (compl.length && ctx.complejidad && !compl.includes(ctx.complejidad)) return false;

  // Sedes o alcances.
  const sedes = Number(ctx.sedes || 1);
  if (r.min_sedes != null && r.min_sedes !== '' && sedes < Number(r.min_sedes)) return false;
  if (r.max_sedes != null && r.max_sedes !== '' && sedes > Number(r.max_sedes)) return false;

  // Equipo: si la regla exige perfiles, TODOS deben estar en el equipo estimado.
  const perfiles = aLista(r.perfiles);
  if (perfiles.length) {
    const enEquipo = new Set(aLista(ctx.perfiles));
    if (!perfiles.every((x) => enEquipo.has(x))) return false;
  }
  // Tamaño del equipo.
  const nEquipo = Number(ctx.personasEquipo || 0);
  if (r.min_personas != null && r.min_personas !== '' && nEquipo < Number(r.min_personas)) return false;
  if (r.max_personas != null && r.max_personas !== '' && nEquipo > Number(r.max_personas)) return false;

  return true;
}

/** Reglas vigentes y aplicables a esta oferta, ordenadas por prioridad. */
export function reglasAplicables(reglas, ctx = {}, fecha = new Date()) {
  return (reglas || [])
    .filter((r) => reglaVigente(r, ctx.fecha || fecha) && reglaAplica(r, ctx))
    .slice()
    .sort((a, b) => (Number(a.prioridad ?? 100) - Number(b.prioridad ?? 100)) || String(a.nombre || '').localeCompare(String(b.nombre || '')));
}

// ── Efectos ─────────────────────────────────────────────────────────────────

/**
 * Factor multiplicador de una regla de optimización.
 *  · unidad 'factor'     → el valor es el factor directo (0,85 = −15 %)
 *  · unidad 'porcentaje' → valor positivo REDUCE (15 → 0,85), negativo amplía (−10 → 1,10)
 */
export function factorOptimizacion(r) {
  const v = Number(r?.valor);
  if (!Number.isFinite(v)) return 1;
  if (r.unidad === 'factor') return v > 0 ? v : 1;
  return Math.max(0, 1 - v / 100);
}

/** Descripción legible del efecto de una regla, para la traza y el listado. */
export function describirEfecto(r) {
  const v = Number(r?.valor);
  const u = UNIDAD_LABEL[r?.unidad] || '';
  const nivel = r?.nivel ? ` · ${r.nivel}` : '';
  switch (r?.tipo) {
    case 'optimizacion': {
      const f = factorOptimizacion(r);
      const pct = Math.round((1 - f) * 1000) / 10;
      return `${pct >= 0 ? '−' : '+'}${Math.abs(pct)} % de horas${nivel || ' (todos los niveles)'}`;
    }
    case 'precio_hora':
      return `${v} €/h${nivel || ' (todos los niveles)'}`;
    case 'margen':
      return `margen ${v} %`;
    case 'descuento':
      return `−${v} ${u} sobre el precio`;
    case 'recargo':
      return `+${v} ${u} sobre el precio`;
    default:
      return `${v} ${u}`;
  }
}

/** Descripción legible de las condiciones, para el listado del panel. */
export function describirCondiciones(r) {
  const partes = [];
  const modelos = aLista(r.modelos);
  const normas = aLista(r.normas);
  if (modelos.length) partes.push(`modelo ${modelos.join(' / ')}`);
  if (normas.length) partes.push(`con ${normas.join(' + ')}`);
  const compl = aLista(r.complejidad);
  if (compl.length) partes.push(`complejidad ${compl.join(' / ')}`);
  if (r.min_sedes) partes.push(`≥ ${r.min_sedes} sedes`);
  if (r.max_sedes) partes.push(`≤ ${r.max_sedes} sedes`);
  const perf = aLista(r.perfiles);
  if (perf.length) partes.push(`equipo con ${perf.join(' + ')}`);
  if (r.min_personas) partes.push(`equipo ≥ ${r.min_personas} personas`);
  if (r.max_personas) partes.push(`equipo ≤ ${r.max_personas} personas`);
  if (r.min_sistemas) partes.push(`≥ ${r.min_sistemas} sistemas`);
  if (r.max_sistemas) partes.push(`≤ ${r.max_sistemas} sistemas`);
  if (r.solo_si_tiene_9001 === true) partes.push('ya certificada en 9001');
  if (r.solo_si_tiene_9001 === false) partes.push('sin 9001 previa');
  if (r.vigente_desde || r.vigente_hasta) {
    const f = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' }) : '');
    partes.push(`vigencia ${f(r.vigente_desde) || '…'} → ${f(r.vigente_hasta) || '…'}`);
  }
  const canal = (r.canal || 'todos');
  if (canal !== 'todos') partes.push(CANALES.find((c) => c.k === canal)?.label.toLowerCase());
  return partes.length ? partes.join(' · ') : 'sin condiciones: se aplica siempre';
}

/** Validación de alta/edición. Devuelve array de errores (vacío = correcta). */
export function validarRegla(r) {
  const e = [];
  if (!String(r?.nombre || '').trim()) e.push('Ponle un nombre a la regla.');
  if (!TIPO_REGLA[r?.tipo]) e.push('Elige el tipo de regla.');
  const v = Number(r?.valor);
  if (!Number.isFinite(v)) e.push('El valor tiene que ser un número.');
  else {
    if (r.tipo === 'precio_hora' && v <= 0) e.push('El precio por hora tiene que ser mayor que cero.');
    if (r.tipo === 'margen' && (v < 0 || v > 500)) e.push('El margen tiene que estar entre 0 y 500 %.');
    if ((r.tipo === 'descuento' || r.tipo === 'recargo') && r.unidad === 'porcentaje' && (v <= 0 || v > 100)) {
      e.push('El porcentaje tiene que estar entre 0 y 100.');
    }
    if (r.tipo === 'optimizacion' && r.unidad === 'factor' && v <= 0) e.push('El factor tiene que ser mayor que cero.');
  }
  const tipo = TIPO_REGLA[r?.tipo];
  if (tipo && !tipo.unidades.includes(r?.unidad)) e.push(`Para ${tipo.label.toLowerCase()} la unidad debe ser ${tipo.unidades.join(' o ')}.`);
  const d = aFecha(r?.vigente_desde), h = aFecha(r?.vigente_hasta);
  if (d && h && h < d) e.push('La fecha de fin es anterior a la de inicio.');
  const min = r?.min_sistemas, max = r?.max_sistemas;
  if (min && max && Number(max) < Number(min)) e.push('El máximo de sistemas es menor que el mínimo.');
  if (r?.min_sedes && r?.max_sedes && Number(r.max_sedes) < Number(r.min_sedes)) e.push('El máximo de sedes es menor que el mínimo.');
  if (r?.min_personas && r?.max_personas && Number(r.max_personas) < Number(r.min_personas)) e.push('El máximo de personas del equipo es menor que el mínimo.');
  if (r?.max_personas && Number(r.max_personas) > 3) e.push('El equipo estimado no puede pasar de 3 personas.');
  return e;
}

/** Fila vacía para el formulario de alta. */
export const REGLA_NUEVA = () => ({
  nombre: '', tipo: 'descuento', activa: true, prioridad: 100,
  modelos: [], normas: [], min_sistemas: '', max_sistemas: '',
  complejidad: [], min_sedes: '', max_sedes: '', perfiles: [], min_personas: '', max_personas: '',
  solo_si_tiene_9001: null, vigente_desde: '', vigente_hasta: '', canal: 'todos',
  valor: '', unidad: 'porcentaje', nivel: '', notas: '',
});
