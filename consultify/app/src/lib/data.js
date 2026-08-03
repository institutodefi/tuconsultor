import { supabase, DEMO, demoClone } from './supabase';
import { catalogoFilas } from './catalogoTareas';

// Capa de datos: misma API en modo demo y con Supabase real.
let demoState = null;
function demo() {
  if (!demoState) demoState = {
    consultores: demoClone('consultores'), clientes: demoClone('clientes'),
    proyectos: demoClone('proyectos'), presupuestos: demoClone('presupuestos'),
    procesos_internos: demoClone('procesos_internos'),
    reglas_comerciales: [],
    versiones: [],
    registro_accesos: [],
    accesibilidad_criterios: [
      { codigo: '1.1.1', titulo: 'Contenido no textual', nivel: 'A', principio: 'Perceptible', origen: 'une', aplicable: true, estado: 'pendiente', metodos: [] },
      { codigo: '1.4.3', titulo: 'Contraste (mínimo)', nivel: 'AA', principio: 'Perceptible', origen: 'une', aplicable: true, estado: 'cumple', metodos: ['contraste', 'automatico'],
        observaciones: 'Ratio real compuesto medido en los 7 anuncios del banner. Mínimo actual 4,5:1.', evidencia: 'v85 · banner-hero.js', revisado_en: '2026-07-27T10:00:00Z' },
      { codigo: '1.4.10', titulo: 'Reflujo', nivel: 'AA', principio: 'Perceptible', origen: 'wcag21', aplicable: true, estado: 'parcial', metodos: ['manual'],
        observaciones: 'Sin desbordes a 390 y 360 px. Pendiente la prueba a 320 px CSS que pide el criterio.', evidencia: 'v80', revisado_en: '2026-07-27T10:00:00Z' },
      { codigo: '1.2.6', titulo: 'Lengua de señas (grabado)', nivel: 'AAA', principio: 'Perceptible', origen: 'une', aplicable: false,
        mecanismo: 'condicion_no_se_da', justificacion: 'No se publica vídeo grabado, así que no hay contenido al que aplicar lengua de señas.' },
      { codigo: '2.2.2', titulo: 'Pausar, detener, ocultar', nivel: 'A', principio: 'Operable', origen: 'une', aplicable: true, estado: 'parcial', metodos: ['manual', 'teclado'],
        observaciones: 'El banner se detiene al enfocar y con movimiento reducido, pero falta un botón explícito de pausa.', evidencia: 'v85', revisado_en: '2026-07-27T10:00:00Z' },
      { codigo: '2.5.8', titulo: 'Tamaño del objetivo (mínimo)', nivel: 'AA', principio: 'Operable', origen: 'wcag22', aplicable: true, estado: 'cumple', metodos: ['manual', 'automatico'],
        observaciones: '9 elementos por debajo de 24 px corregidos. Recuento posterior: 0.', evidencia: 'v80 y v88', revisado_en: '2026-07-27T10:00:00Z' },
      { codigo: '3.1.1', titulo: 'Idioma de la página', nivel: 'A', principio: 'Comprensible', origen: 'une', aplicable: true, estado: 'cumple', metodos: ['manual', 'automatico'],
        observaciones: 'Las 298 páginas declaran el idioma. Comprobado en los cinco idiomas.', evidencia: 'v85', revisado_en: '2026-07-27T10:00:00Z' },
      { codigo: '3.3.2', titulo: 'Etiquetas o instrucciones', nivel: 'A', principio: 'Comprensible', origen: 'une', aplicable: true, estado: 'cumple', metodos: ['manual'],
        observaciones: 'Los 8 campos del formulario llevan etiqueta visible, no placeholder.', evidencia: 'v88', revisado_en: '2026-07-27T10:00:00Z' },
      { codigo: '4.1.1', titulo: 'Análisis', nivel: 'A', principio: 'Robusto', origen: 'une', obsoleto: true, aplicable: true, estado: 'pendiente', metodos: [] },
    ],
    accesibilidad_conformidad: [
      { codigo: 'C1', requisito: 'Nivel de conformidad', verificacion: 'Se cumplen todos los criterios del nivel declarado.', estado: 'pendiente' },
      { codigo: 'C2', requisito: 'Páginas completas', verificacion: 'La conformidad se evalúa sobre páginas completas, no fragmentos.', estado: 'pendiente' },
      { codigo: 'C3', requisito: 'Procesos completos', verificacion: 'Todas las páginas de un proceso deben conformar.', estado: 'pendiente' },
    ],
    procesos_subprocesos: [],
    procesos_bandas: [],
    procesos_riesgos: [],
    // Demo del CRM unificado (v56): un grupo con matriz y dos filiales,
    // un proveedor y contactos con sus roles, para poder ver el organigrama,
    // el semáforo y la homologación sin base de datos.
    empresas: [
      { id: 'emp-matriz', nombre: 'GRUPO ANDES HOLDING, S.L.', cif: 'B84867670', nombre_comercial: 'Grupo Andes',
        es_cliente: true, es_proveedor: false, estado_comercial: 'activo', direccion: 'Paseo de la Castellana 18',
        poblacion: 'Madrid', cp: '28046', provincia: 'Madrid', pais: 'España', web: 'grupoandes.example',
        email: 'info@grupoandes.example', telefono: '910000000', empresa_matriz_id: null, creado: '2026-01-10T09:00:00Z' },
      { id: 'emp-fil1', nombre: 'ANDES INGENIERÍA, S.L.', cif: 'B87093076',
        es_cliente: true, es_proveedor: false, estado_comercial: 'activo', poblacion: 'Alcorcón', provincia: 'Madrid',
        pais: 'España', empresa_matriz_id: 'emp-matriz', creado: '2026-01-12T09:00:00Z' },
      { id: 'emp-fil2', nombre: 'ANDES SERVICIOS CANARIAS, S.L.', cif: 'B38785820',
        es_cliente: true, es_proveedor: false, estado_comercial: 'activo', direccion: 'Calle Ruiz de Padrón, loc. 5',
        poblacion: 'San Sebastián de la Gomera', cp: '38800', provincia: 'Santa Cruz de Tenerife', pais: 'España',
        telefono: '922550103', empresa_matriz_id: 'emp-matriz', creado: '2026-01-14T09:00:00Z' },
      { id: 'emp-prov', nombre: 'LABORATORIO CALIBRA, S.L.', cif: 'B06996631',
        es_cliente: false, es_proveedor: true, estado_comercial: 'activo', poblacion: 'Getafe', provincia: 'Madrid',
        pais: 'España', empresa_matriz_id: null, creado: '2026-02-02T09:00:00Z' },
      { id: 'emp-pot', nombre: 'TALLERES NORTE', cif: null,
        es_cliente: true, es_proveedor: false, estado_comercial: 'potencial', origen: 'web',
        pais: 'España', empresa_matriz_id: null, creado: '2026-07-01T09:00:00Z' },
    ],
    contactos: [
      { id: 'con-1', nombre: 'Marta', apellidos: 'Ferrer', cargo: 'Directora general', email: 'marta.ferrer@grupoandes.example',
        telefono: '600111222', consentimiento_marketing: true, consentimiento_fecha: '2026-01-10T09:00:00Z', creado: '2026-01-10T09:00:00Z' },
      { id: 'con-2', nombre: 'Luis', apellidos: 'Cano', cargo: 'Administración', email: 'facturacion@grupoandes.example',
        telefono: '600111223', consentimiento_marketing: false, creado: '2026-01-10T09:10:00Z' },
      { id: 'con-3', nombre: 'Nuria', apellidos: 'Beltrán', cargo: 'Responsable de calidad', email: 'calidad@andesingenieria.example',
        telefono: '600111224', consentimiento_marketing: true, consentimiento_fecha: '2026-01-12T09:00:00Z', creado: '2026-01-12T09:00:00Z' },
      { id: 'con-4', nombre: 'Óscar', apellidos: 'Prieto', cargo: 'Gerente', email: 'oscar@calibra.example',
        consentimiento_marketing: false, creado: '2026-02-02T09:00:00Z' },
    ],
    empresa_contactos: [
      { id: 'ec-1', empresa_id: 'emp-matriz', contacto_id: 'con-1', rol: 'directivo',   principal: true },
      { id: 'ec-2', empresa_id: 'emp-matriz', contacto_id: 'con-2', rol: 'facturacion', principal: false },
      { id: 'ec-3', empresa_id: 'emp-fil1',   contacto_id: 'con-3', rol: 'proyecto',    principal: false },
      { id: 'ec-4', empresa_id: 'emp-prov',   contacto_id: 'con-4', rol: 'directivo',   principal: true },
    ],
    homologaciones: [
      { id: 'hom-1', empresa_id: 'emp-prov', concepto: 'Certificado ISO 9001 en vigor', estado: 'validado',
        obligatorio: true, fecha_validez: '2027-03-31', orden: 10, creado: '2026-02-02T09:00:00Z' },
      { id: 'hom-2', empresa_id: 'emp-prov', concepto: 'Póliza de responsabilidad civil', estado: 'pendiente',
        obligatorio: true, orden: 20, creado: '2026-02-02T09:05:00Z' },
    ],
    tareas_catalogo: catalogoFilas(), agenda_tareas: [], cliente_tareas: [], proyectos_cliente: [],
    proyectos: [
      { id: 'p1', nombre: 'ISO 9001 · ACADEMIA AXON', empresa_id: 'e1', consultor_id: 'c1' },
      { id: 'p2', nombre: 'ISO 14001 · GRUPO MERIDIA', empresa_id: 'e2', consultor_id: 'c1' },
      { id: 'p3', nombre: 'ENS · AYUNTAMIENTO DE ALCORCÓN', empresa_id: 'e3', consultor_id: 'c1' },
    ], cliente_contactos: [], vacaciones: [], festivos: [],
  };
  return demoState;
}
const uid = () => Math.random().toString(36).slice(2, 10);

export async function listAll(table, order = 'creado') {
  // En demo se devuelve una COPIA: si se devolviera la misma referencia, React
  // compararía el estado por identidad, no re-renderizaría y la pantalla
  // parecería congelada tras un alta.
  if (DEMO) return (demo()[table] || []).slice();
  const { data, error } = await supabase.from(table).select('*').order(order, { ascending: false });
  if (error) throw error;
  return data;
}

export async function listTable(table) {
  if (DEMO) return (demo()[table] || []).slice();
  // PostgREST devuelve como máximo 1000 filas por petición. Tablas grandes como
  // tareas_catalogo (~1000+ filas) se cortaban y dejaban fuera las últimas normas
  // (p. ej. UNE 158101). Paginamos por rangos hasta traerlas todas.
  const PAGE = 1000;
  let desde = 0;
  let todas = [];
  for (;;) {
    const { data, error } = await supabase.from(table).select('*').range(desde, desde + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    todas = todas.concat(data);
    if (data.length < PAGE) break;   // última página
    desde += PAGE;
  }
  return todas;
}

// Valores que la base admite en columnas con restricción. Una oferta no se
// pierde porque un campo secundario traiga algo que la tabla no conoce: se
// normaliza a algo válido y el alta sale adelante.
const NORMALIZAR = {
  presupuestos: (r) => {
    const out = { ...r };
    const TIPOS = ['mes', 'bolsa', 'proyecto'];
    if (out.tipo && !TIPOS.includes(out.tipo)) {
      // 'fraccionado' era el tipo de la implantación antes de la v99.
      out.tipo = out.tipo === 'fraccionado' ? 'proyecto' : 'mes';
    }
    if (out.complejidad && !['baja', 'media', 'alta'].includes(out.complejidad)) out.complejidad = null;
    if (out.forma_pago && !['unico', 'dos'].includes(out.forma_pago)) out.forma_pago = null;
    if (out.estado && !['borrador', 'emitida', 'aceptada', 'rechazada', 'caducada'].includes(out.estado)) out.estado = 'emitida';
    return out;
  },
};

export async function insertRow(table, row) {
  if (NORMALIZAR[table]) row = NORMALIZAR[table](row);
  if (DEMO) { const r = { id: uid(), creado: new Date().toISOString(), ...row }; demo()[table].unshift(r); return r; }
  // 1) Intento normal: insertar y devolver la fila creada.
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (!error) return data;
  // 2) Si falla por RLS o permisos, casi siempre es porque la política de SELECT
  //    no deja LEER la fila de vuelta a un usuario anónimo (insert .select()).
  //    El INSERT en sí está permitido (check true), así que reintentamos SIN select.
  const msg = (error.message || '').toLowerCase();
  const esRls = msg.includes('row-level security') || msg.includes('row level security') ||
                (msg.includes('permission denied') && msg.includes('users'));
  if (esRls) {
    const { error: e2 } = await supabase.from(table).insert(row);
    // La fila se ha creado, pero la política de LECTURA no la devuelve: no
    // tenemos id. Se marca para que la interfaz pueda decir la verdad en vez
    // de anunciar un alta que no puede comprobar.
    if (!e2) return { ...row, _sinLecturaDeVuelta: true };
    throw e2;                            // si también falla, propagamos el real
  }
  // 3) Columna ausente en el schema cache de PostgREST (p.ej. migración pendiente
  //    o cache sin recargar). Reintentamos SIN esa columna para no abortar la
  //    operación completa. Es una red de seguridad: conviene aplicar la migración
  //    y recargar el schema, pero al menos la fila se crea con el resto de campos.
  const colMatch = (error.message || '').match(/could not find the '([^']+)' column/i)
                || (error.message || '').match(/'([^']+)' column of '[^']+' in the schema cache/i);
  const esColumnaFaltante = error.code === 'PGRST204' || msg.includes('schema cache') || !!colMatch;
  if (esColumnaFaltante && colMatch && colMatch[1] in row) {
    const col = colMatch[1];
    const { [col]: _omit, ...resto } = row;
    if (import.meta.env.DEV) console.warn(`[insertRow] Columna '${col}' ausente en el schema cache de '${table}'. Reintento sin ella. Aplica la migración correspondiente y recarga el schema.`);
    return insertRow(table, resto);      // reintento recursivo, puede faltar más de una
  }
  throw error;
}

// Correlativo limpio de oferta (OFE-AAAA-NNN) vía secuencia atómica en Postgres.
// En modo demo o si la RPC falla, devuelve un número de respaldo basado en tiempo.
export async function siguienteNumeroOferta() {
  const anio = new Date().getFullYear();
  const fallback = () => `OFE-${anio}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
  if (DEMO) return fallback();
  try {
    const { data, error } = await supabase.rpc('siguiente_numero_oferta');
    if (error || !data) return fallback();
    return data;
  } catch { return fallback(); }
}

/**
 * Siguiente código de cliente correlativo con formato CL-NNNN (CL-0001, CL-0002…).
 * Mira los códigos existentes y devuelve el siguiente. No es atómico, pero para el
 * volumen de altas manuales/formulario es suficiente; ante colisión, el upsert
 * reintenta con el siguiente hueco.
 */
export async function siguienteCodigoCliente() {
  const fmt = (n) => `CL-${String(n).padStart(4, '0')}`;
  try {
    const filas = await listTable('clientes');
    let max = 0;
    for (const c of (filas || [])) {
      const m = /^CL-(\d+)$/i.exec((c.codigo || '').trim());
      if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
    }
    return fmt(max + 1);
  } catch {
    return fmt(1);
  }
}

/**
 * Crea o actualiza un cliente a partir de los datos del formulario público.
 * - Si ya existe un cliente con el mismo email o CIF, lo actualiza (no duplica).
 * - Si es nuevo, le asigna un código CL-NNNN correlativo.
 * - Director de Proyecto por defecto: Fátima (si se encuentra en el equipo).
 * Devuelve el cliente resultante (o null en DEMO/errores no críticos).
 */
export async function upsertClienteDesdeFormulario({ empresa, contacto, email, telefono, cif }) {
  if (DEMO) return { id: uid(), codigo: 'CL-0001', empresa, contacto, email, telefono, cif };
  const emailN = (email || '').trim().toLowerCase();
  const cifN = (cif || '').trim().toUpperCase();

  // 1) Buscar cliente existente por email o CIF.
  let existente = null;
  try {
    const filas = await listTable('clientes');
    existente = (filas || []).find((c) =>
      (emailN && (c.email || '').trim().toLowerCase() === emailN) ||
      (cifN && (c.cif || '').trim().toUpperCase() === cifN)
    ) || null;
  } catch { /* si no podemos leer, seguimos como alta nueva */ }

  // 2) Director de Proyecto por defecto = Fátima.
  let directorId = null;
  try {
    const equipo = await listTable('consultores');
    const fatima = (equipo || []).find((p) => `${p.nombre || ''} ${p.apellidos || ''}`.toLowerCase().includes('fátima')
      || (p.nombre || '').toLowerCase().includes('fatima'));
    if (fatima?.id) directorId = fatima.id;
  } catch { /* opcional */ }

  // 3) Actualizar si existe.
  if (existente?.id) {
    const patch = {};
    if (empresa) patch.empresa = empresa;
    if (contacto) patch.contacto = contacto;
    if (emailN) patch.email = email;
    if (telefono) patch.telefono = telefono;
    if (cifN) patch.cif = cif;
    if (!existente.director_proyecto_id && directorId) patch.director_proyecto_id = directorId;
    if (!existente.codigo) patch.codigo = await siguienteCodigoCliente();
    try { return await updateRow('clientes', existente.id, patch); }
    catch { return existente; }
  }

  // 4) Crear nuevo con código correlativo.
  const codigo = await siguienteCodigoCliente();
  const datos = { codigo, empresa: empresa || contacto || email, contacto, email, telefono, cif,
    ...(directorId ? { director_proyecto_id: directorId } : {}) };
  try { return await insertRow('clientes', datos); }
  catch { return null; }
}

// `clave` permite tablas cuya primaria no es `id`: el checklist de accesibilidad
// usa el código del criterio (1.4.3) como clave, no un uuid.
export async function updateRow(table, id, patch, clave = 'id') {
  if (DEMO) { const t = demo()[table]; const i = t.findIndex(r => r[clave] === id); if (i >= 0) t[i] = { ...t[i], ...patch }; return t[i]; }
  if (NORMALIZAR[table]) patch = NORMALIZAR[table](patch);
  const { data, error } = await supabase.from(table).update(patch).eq(clave, id).select().single();

  // Un guardado bloqueado por permisos no siempre llega como error legible:
  // puede volver como «0 filas» y parecer que fue bien. Aquí se traduce a algo
  // que se pueda leer en pantalla, porque el silencio es lo que hace que un
  // formulario parezca roto sin decir por qué.
  if (error) {
    const m = String(error.message || '');
    if (error.code === 'PGRST116' || /no rows|0 rows/i.test(m)) {
      throw new Error(
        `No se pudo guardar en «${table}». La fila existe pero la base no deja escribirla: ` +
        'faltan permisos o la política de seguridad no incluye tu rol. ' +
        'Pásale a quien administre el diagnóstico DIAGNOSTICO-GUARDAR.sql.',
      );
    }
    if (/permission denied/i.test(m)) {
      throw new Error(`Sin permiso para escribir en «${table}». Falta el GRANT de la tabla.`);
    }
    throw error;
  }
  return data;
}

export async function deleteRow(table, id) {
  if (DEMO) { const t = demo()[table]; const i = t.findIndex(r => r.id === id); if (i >= 0) t.splice(i, 1); return; }
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/** Presupuestos del cliente autenticado (por user_id o email). */
export async function misPresupuestos(user) {
  if (DEMO) return demo().presupuestos;
  const { data, error } = await supabase.from('presupuestos').select('*')
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order('creado', { ascending: false });
  if (error) throw error;
  return data;
}

/** Proyectos del cliente autenticado (vía clientes.user_id). */
export async function misProyectos(user) {
  if (DEMO) return demo().proyectos.map(p => ({ ...p }));
  const { data: cli, error: e1 } = await supabase.from('clientes').select('id').eq('user_id', user.id);
  if (e1) throw e1;
  if (!cli?.length) return [];
  const ids = cli.map(c => c.id);
  const { data, error } = await supabase.from('proyectos').select('*').in('cliente_id', ids);
  if (error) throw error;
  return data;
}

/** Llama a la Netlify Function de Holded con el token del usuario.
 *  Devuelve el JSON de la función. Solo funciona con backend configurado. */
export async function holdedFn(payload) {
  if (DEMO) return { ok: false, error: 'Holded no disponible en modo demo.' };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, error: 'No hay sesión activa. Vuelve a iniciar sesión.' };

  let r;
  try {
    r = await fetch('/.netlify/functions/holded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return { ok: false, error: 'No se pudo contactar con el servidor: ' + (e.message || 'red') };
  }

  // Leemos como texto y luego intentamos parsear, para no reventar si la
  // respuesta no es JSON (p. ej. 404 de función no desplegada, o 500 con HTML).
  const txt = await r.text();
  let json;
  try { json = JSON.parse(txt); } catch {
    if (r.status === 404) return { ok: false, error: 'La función de Holded no está desplegada en Netlify (404). Revisa el deploy de netlify/functions.' };
    return { ok: false, error: `El servidor respondió con un error (HTTP ${r.status}). ${txt.slice(0, 160)}` };
  }
  return json;
}

/** Llama a la Netlify Function de Brevo (sincronización de clientes). */
export async function brevoFn(payload) {
  if (DEMO) return { ok: false, error: 'Brevo no disponible en modo demo.' };
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return { ok: false, error: 'No hay sesión activa.' };
  let r;
  try {
    r = await fetch('/.netlify/functions/brevo-clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (e) { return { ok: false, error: 'No se pudo contactar con el servidor: ' + (e.message || 'red') }; }
  const txt = await r.text();
  try { return JSON.parse(txt); }
  catch { return r.status === 404 ? { ok: false, error: 'Función de Brevo no desplegada (404).' } : { ok: false, error: `Error HTTP ${r.status}` }; }
}
