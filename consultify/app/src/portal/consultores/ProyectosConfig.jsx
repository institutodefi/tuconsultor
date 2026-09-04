import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import AltaProyecto from './AltaProyecto.jsx';
import { tareasDeCliente, repartirFechas, anidarTareas, codigoTareaIntegrada, horasCoordinacion, bloquesEjecucion, trocearEnBloques, codigoTarea } from '../../lib/planCliente.js';
import { esLaborable, toISO, FESTIVOS_2026 } from '../../lib/agenda.js';
import { sincronizarTareaAgenda, sincronizarVariasAgenda, borrarReflejoAgenda } from '../../lib/sincroAgenda.js';
import { NORMAS, NORMA_BY_ID, MESES_MODELO, mesesPorModelo , modeloCanonico , mismoModelo } from '../../lib/calcEngine.js';
import { resolverProyectos, resolverProyecto } from '../../lib/proyectoResuelto.js';
import SesionesTarea from './SesionesTarea.jsx';
import { balanceTarea, horasDe } from '../../lib/sesionesTarea.js';
import DashboardProyectos from './DashboardProyectos.jsx';
import EquipoProyecto from './EquipoProyecto.jsx';
import { fechasDeProyecto, hayDesfase, DIAS_ANTES_CERTIFICACION } from '../../lib/fechasProyecto.js';
import CuadroTareas from '../../components/CuadroTareas.jsx';
// La sigla del cliente: la misma que usan los códigos de proyecto, para que
// «CECE» signifique lo mismo en el proyecto y en cada una de sus tareas.
import { siglaCliente } from '../../lib/codigos.js';

const MODELOS = ['Apoyo', 'Relación', 'Implicación', 'Compromiso', 'Implantación'];
const fmtH = (h) => `${(Math.round((h || 0) * 100) / 100).toLocaleString('es-ES')} h`;
const tipoTarea = (t) => {
  const b = (t.bloque || '').toUpperCase();
  if (b.startsWith('PM') || /COORDINAC/i.test(t.proceso || '')) return 'coordinacion';
  return 'produccion';
};
const TIPO_LABEL = { produccion: 'Producción', gestion: 'Gestión', coordinacion: 'Coordinación' };

// Editor de bloques de ejecución con ESTADO LOCAL: permite escribir la fecha y las
// horas con libertad y solo persiste al salir del campo (onBlur) o al añadir/quitar.
// Sin esto, cada pulsación disparaba un guardado asíncrono que revertía la edición
// de la fecha (no dejaba escribirla entera).
function EditorBloques({ tarea, bloquesIniciales, onPersistir, onAdd, onQuitar }) {
  const [locales, setLocales] = useState(bloquesIniciales);

  // Si cambian los bloques por fuera (añadir/quitar/recargar), reflejarlo.
  useEffect(() => { setLocales(bloquesIniciales); }, [JSON.stringify(bloquesIniciales)]);

  const setCampo = (i, campo, val) =>
    setLocales(bs => bs.map((b, j) => j === i ? { ...b, [campo]: val } : b));

  const persistir = (bloques) => onPersistir(tarea, bloques);

  return (
    <div className="space-y-1.5">
      {locales.map((b, bi) => (
        <div key={bi} className="flex items-center gap-2">
          <span className="w-14 text-xs font-bold text-[#9FC0CB]">Bloque {bi + 1}</span>
          <input
            type="date"
            className="input !py-1 !text-xs !w-auto"
            value={b.fecha || ''}
            onChange={e => setCampo(bi, 'fecha', e.target.value)}
            onBlur={() => persistir(locales)}
          />
          <input
            type="number" min="0.5" step="0.5"
            className="input !py-1 !text-xs !w-20 text-right"
            value={b.horas}
            onChange={e => setCampo(bi, 'horas', Number(e.target.value) || 0)}
            onBlur={() => persistir(locales)}
          />
          <span className="text-xs text-[#9FC0CB]">h</span>
          <button onClick={() => onQuitar(tarea, bi)} className="text-xs font-bold text-red-400 hover:underline">×</button>
        </div>
      ))}
      <button onClick={() => onAdd(tarea)} className="chip border border-brand-orange bg-brand-orange/10 text-[11px] font-bold text-[#F9A83A]">+ bloque</button>
    </div>
  );
}

export default function Proyectos() {
  const [clientes, setClientes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [sesiones, setSesiones] = useState([]);        // todas, para sumar horas
  const [abierta, setAbierta] = useState(null);        // tarea en el diálogo
  const [presupuestos, setPresupuestos] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [alta, setAlta] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [catalogo, setCatalogo] = useState(null);
  const [festivos, setFestivos] = useState([]);
  const [equipo, setEquipo] = useState([]);
  // Consultores activos (derivado de equipo). Debe ir ANTES de los useMemo que lo usan.
  const consultores = equipo.filter(c => (c.tipo_equipo || 'consultor') === 'consultor' && c.activo !== false);
  const [tareas, setTareas] = useState([]);
  const [sel, setSel] = useState('');         // proyecto seleccionado
  const [arrastra, setArrastra] = useState(null);
  const [selT, setSelT] = useState(new Set());
  const [distribuyendo, setDistribuyendo] = useState(false);
  const [expandida, setExpandida] = useState(null);
  const [buscaP, setBuscaP] = useState('');
  const [porPagP, setPorPagP] = useState('25');
  const [pagP, setPagP] = useState(0);

  // Estos dos se declaraban 25 líneas MÁS ABAJO y el `useMemo` de aquí los usa
  // durante el render. Como son `const`, en cuanto se escribía algo en el
  // buscador saltaba «Cannot access 'nombreCli' before initialization» y la
  // pantalla se caía entera. Mismo fallo que tenía la ficha de empresa.
  const nombreCli = (id) => clientes.find(c => String(c.id) === String(id))?.empresa || '—';
  const codigoCli = (id) => clientes.find(c => String(c.id) === String(id))?.codigo || 'CLI';

  // Cada proyecto, con sus datos EFECTIVOS: nombre comercial de la empresa y
  // normas y modelo tomados de su oferta. Sin esto la tabla enseñaba la razón
  // social de la ficha operativa y «—» en alcance y modelo.
  const resueltos = useMemo(
    () => resolverProyectos(proyectos, { clientes, empresas, presupuestos, contratos }),
    [proyectos, clientes, empresas, presupuestos, contratos],
  );

  const proyectosFiltrados = useMemo(() => {
    const q = buscaP.trim().toLowerCase();
    if (!q) return resueltos;
    // Se busca también por razón social y número de oferta: quien busca «B848…»
    // o «OFE-2026-…» espera encontrar su proyecto.
    return resueltos.filter(p => `${p.nombre} ${p.nombreCliente} ${p.razonSocial || ''} ${p.cif || ''} `
      + `${p.numeroOferta || ''} ${(p.normas || []).join(' ')} ${p.modelo || ''}`
      .toLowerCase().includes(q));
  }, [resueltos, buscaP]);
  const totalPagsP = porPagP === 'todos' ? 1 : Math.max(1, Math.ceil(proyectosFiltrados.length / Number(porPagP)));
  const proyectosPagina = useMemo(() => {
    if (porPagP === 'todos') return proyectosFiltrados;
    const n = Number(porPagP);
    return proyectosFiltrados.slice(pagP * n, pagP * n + n);
  }, [proyectosFiltrados, porPagP, pagP]);
  const puedeFusionar = (claveA, claveB) => claveA === claveB; // misma clave = mismo proceso+subproceso
  const [msg, setMsg] = useState(null);

  const cargar = () => {
    listTable('clientes').then(setClientes).catch(e => { setClientes([]); setMsg('No se pudieron cargar los clientes: ' + (e?.message || e)); });
    // Las empresas del CRM son la lista buena para elegir cliente al abrir un
    // proyecto: `clientes` es la tabla operativa y va por detrás.
    listTable('empresas').then(setEmpresas).catch(() => setEmpresas([]));
    // Las sesiones dan las horas planificadas y ejecutadas de cada tarea.
    listTable('tarea_sesiones').then(setSesiones).catch(() => setSesiones([]));
    // Ofertas y contratos: de ahí salen las normas y el modelo de verdad.
    listTable('presupuestos').then(setPresupuestos).catch(() => setPresupuestos([]));
    listTable('contratos').then(setContratos).catch(() => setContratos([]));
    listTable('proyectos_cliente').then(setProyectos).catch(() => setProyectos([]));
    listTable('tareas_catalogo').then(setCatalogo).catch(() => setCatalogo([]));
    listTable('festivos').then(setFestivos).catch(() => setFestivos([]));
    listTable('consultores').then(setEquipo).catch(() => {});
    listTable('cliente_tareas').then(all => setTareas(all)).catch(() => setTareas([]));
  };
  // `useEffect(cargar, [])` NO: lo que devuelva `cargar` lo toma React como
  // función de limpieza. Aquí devolvía la promesa de `listTable`, y al
  // desmontar la pantalla React intentaba llamarla: «r is not a function», con
  // el error apareciendo en la pantalla a la que se navegaba, no en esta.
  // Envuelto en una arrow, el efecto no devuelve nada.
  useEffect(() => { cargar(); }, []);
  // Enriquece una tarea con el código de su cliente (para el código CLI-Txxx-By).
  const conCod = (t) => ({ ...t, codigo_cliente: codigoCli(t.cliente_id) });

  // ── Abrir un proyecto ──
  // El detalle está DEBAJO de una tabla que puede tener cien filas. Sin llevar
  // la vista hasta él, pulsar «Abrir» no parecía hacer nada y la gente volvía
  // a pulsar.
  const detalleRef = useRef(null);
  const abrirProyecto = (id) => {
    setSel(String(id));
    requestAnimationFrame(() =>
      detalleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Llegada desde otra pantalla:
  //   ?proyecto=ID  abre ese proyecto
  //   ?cliente=ID   abre el primer proyecto de ese cliente, para no aterrizar
  //                 en un listado que hay que volver a filtrar a mano
  const [urlAplicada, setUrlAplicada] = useState(false);
  useEffect(() => {
    if (urlAplicada || !proyectos?.length) return;
    const q = new URLSearchParams(window.location.search);
    const id = q.get('proyecto');
    const cli = q.get('cliente');
    if (id) setSel(id);
    else if (cli) {
      const suyos = proyectos.filter((p) => String(p.cliente_id) === String(cli));
      // El activo primero: es el que se quiere ver al venir de una ficha.
      const elegido = suyos.find((p) => p.estado === 'activo') || suyos[0];
      if (elegido) setSel(elegido.id);
    }
    setUrlAplicada(true);
  }, [proyectos, urlAplicada]);

  const proyecto = useMemo(() => proyectos.find(p => String(p.id) === String(sel)) || null, [proyectos, sel]);
  const cliente = useMemo(() => clientes.find(c => String(c.id) === String(proyecto?.cliente_id)) || null, [clientes, proyecto]);
  const activos = useMemo(() => proyectos.filter(p => p.estado === 'activo'), [proyectos]);
  const [ordenCol, setOrdenCol] = useState('codigo'); // codigo | titulo | consultor | fecha | horas
  const [ordenDir, setOrdenDir] = useState('asc');
  const [filtroT, setFiltroT] = useState('');
  const [filtroConsultor, setFiltroConsultor] = useState('');

  const tareasProyecto = useMemo(() => {
    let arr = tareas.filter(t => String(t.proyecto_id) === String(sel));
    // Filtros
    if (filtroT.trim()) { const q = filtroT.toLowerCase(); arr = arr.filter(t => (t.titulo || '').toLowerCase().includes(q)); }
    if (filtroConsultor) arr = arr.filter(t => String(t.consultor_id || '') === String(filtroConsultor));
    // Orden
    const fechaLim = (t) => { const b = Array.isArray(t.bloques_ejecucion) ? t.bloques_ejecucion : []; return (b.length ? b.map(x => x.fecha).filter(Boolean).sort().slice(-1)[0] : t.fecha_estimada) || ''; };
    const nombreCons = (t) => { const c = consultores.find(c => String(c.id) === String(t.consultor_id)); return c ? `${c.nombre} ${c.apellidos || ''}` : ''; };
    const val = (t) => ({ codigo: t.num_tarea || 0, titulo: (t.titulo || '').toLowerCase(), consultor: nombreCons(t).toLowerCase(), fecha: fechaLim(t), horas: Number(t.horas) || 0 }[ordenCol]);
    arr = [...arr].sort((a, b) => { const va = val(a), vb = val(b); if (va < vb) return ordenDir === 'asc' ? -1 : 1; if (va > vb) return ordenDir === 'asc' ? 1 : -1; return 0; });
    return arr;
  }, [tareas, sel, filtroT, filtroConsultor, ordenCol, ordenDir, consultores]);

  const ordenarPor = (col) => { if (ordenCol === col) setOrdenDir(d => d === 'asc' ? 'desc' : 'asc'); else { setOrdenCol(col); setOrdenDir('asc'); } };
  const flechaOrden = (col) => ordenCol === col ? (ordenDir === 'asc' ? ' ▲' : ' ▼') : '';

  const [normasSel, setNormasSel] = useState([]);
  const [nombreProy, setNombreProy] = useState('');
  const [estadoProy, setEstadoProy] = useState('activo');
  const [msgCab, setMsgCab] = useState(null);
  const [modelo, setModelo] = useState('Implicación');
  const [meses, setMeses] = useState(MESES_MODELO['Implicación']);
  useEffect(() => {
    if (proyecto) {
      // ── De dónde salen las normas y el modelo ──
      // MANDA LA OFERTA. El proyecto guarda una copia, pero en los creados
      // antes de que el alta partiera de una oferta esa copia está vacía, y
      // caer a los valores por defecto —9001 y «Implicación»— presentaba un
      // proyecto de Relación con tres sistemas como si fuera otra cosa.
      //
      // `resolverProyecto` ya resuelve esta prioridad para toda la aplicación:
      // se usa aquí en vez de repetir la regla.
      const r = resolverProyecto(proyecto, { clientes, empresas, presupuestos, contratos });
      const ns = (r?.normas?.length ? r.normas : proyecto.normas || []).map(String);
      setNormasSel(ns.includes('9001') ? ns : ['9001', ...ns]);
      const m = modeloCanonico(r?.modelo || proyecto.modelo) || 'Implicación';
      setModelo(m);
      setMeses(proyecto.meses_estimados || MESES_MODELO[m] || 3);
      setNombreProy(proyecto.nombre || '');
      setEstadoProy(proyecto.estado || 'activo');
      setMsgCab(null);
    }
    // `presupuestos` y `contratos` en las dependencias: llegan por separado y
    // sin ellos la primera pasada resolvería sin oferta.
  }, [proyecto, presupuestos.length, contratos.length, clientes.length, empresas.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  async function guardarCabecera() {
    if (!proyecto) return;
    await updateRow('proyectos_cliente', proyecto.id, { nombre: nombreProy.trim() || proyecto.nombre, estado: estadoProy });
    cargar(); setMsgCab('Guardado.');
  }

  // Al cambiar el modelo (acuerdo), proponer su duración por defecto.
  function cambiarModelo(m) { setModelo(m); setMeses(mesesPorModelo(m, normasSel.length)); }

  // Tareas candidatas del modelo elegido para las normas elegidas → con anidado.
  const candidatas = useMemo(() => {
    if (!catalogo || !normasSel.length) return [];
    const base = tareasDeCliente(catalogo, normasSel, modelo);
    // SIN anidar. Una tarea de la 9001 y otra de la 14001 pueden parecerse,
    // pero son tareas distintas de sistemas distintos: fusionarlas escondía
    // cuál pertenecía a qué norma y hacía imposible programarlas por separado.
    // Cada una en su fila, con la etiqueta de su sistema.
    return base;
  }, [catalogo, normasSel, modelo]);

  // NOTA: este efecto va DESPUÉS de `candidatas` a propósito.
  //
  // El array de dependencias —`[…, candidatas.length, …]`— se evalúa DURANTE el
  // render, en el punto donde está escrito el `useEffect`, no cuando el efecto
  // corre. Con `candidatas` declarada más abajo, leerla ahí lanzaba
  // «Cannot access before initialization» y la pantalla entera se caía.
  //
  // ── Las tareas entran solas ──
  // Elegir normas y modelo ES definir el trabajo. Que además hubiera que
  // guardar y pulsar un botón hacía que se quedaran proyectos sin tareas sin
  // que nadie lo notara. Ahora, en cuanto la configuración está completa y el
  // catálogo tiene algo que aportar, se vuelca.
  //
  // El `volcandoRef` evita que dos renders seguidos disparen dos volcados a la
  // vez y se dupliquen las tareas.
  // ── Las fechas salen de la oferta y del contrato ──
  // Inicio, certificación y duración no se teclean aquí: se derivan de lo
  // firmado. Tecleadas a mano acaban sin coincidir con el contrato, y entonces
  // el calendario del equipo va contra unas fechas y el cliente espera otras.
  const fechas = useMemo(() => {
    if (!proyecto) return null;
    const r = resolverProyecto(proyecto, { clientes, empresas, presupuestos, contratos });
    const ct = contratos.find((c) => String(c.id) === String(proyecto.contrato_id)) || null;
    return fechasDeProyecto(proyecto, r?.oferta, ct, MESES_MODELO[modelo] || 12);
  }, [proyecto, clientes, empresas, presupuestos, contratos, modelo]);

  // Si lo guardado no coincide con lo que dicen oferta y contrato, se alinea.
  // Es la bidireccionalidad: cambiar la fecha en la oferta se refleja aquí sin
  // que nadie tenga que acordarse de venir a tocarlo.
  useEffect(() => {
    if (!proyecto || !fechas) return;
    const dif = hayDesfase(proyecto, fechas);
    if (!dif.length) return;
    updateRow('proyectos_cliente', proyecto.id, fechas.patch)
      .then(() => cargar())
      .catch(() => {});
  }, [proyecto?.id, fechas?.inicio, fechas?.certificacion, fechas?.limite, fechas?.meses]);   // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Las horas teóricas de una tarea, LEÍDAS DEL CATÁLOGO.
   *
   * `cliente_tareas.horas` es una copia del día en que se volcó. Si alguien
   * ajusta el catálogo después —o lo ajusta mal— la copia se queda con el valor
   * viejo y se planifica contra un tope que ya no es el vigente.
   *
   * El catálogo manda: es la única fuente que dice cuánto vale una tarea de esa
   * norma en ese modelo, y es la que se usó para calcular el precio de la
   * oferta. Planificar contra otra cosa es pasarse de horas sin enterarse.
   *
   * Si la tarea no se encuentra en el catálogo —se borró, o cambió de nombre—
   * se cae a la copia: es peor no tener referencia que tener una antigua.
   */
  const horasTeoricas = useCallback((t) => {
    // Primero por enlace directo: `catalogo_id` sobrevive a que alguien
    // renombre el código o el título de la tarea, que es justo lo que se hace
    // al planificar un proyecto de 65 tareas.
    const c = (t.catalogo_id && (catalogo || []).find((x) => String(x.id) === String(t.catalogo_id)))
      || (catalogo || []).find((x) =>
      String(x.norma_id) === String(t.norma_id)
      && mismoModelo(x.modelo, t.modelo || modelo)
      && String(x.subproceso || '') === String(t.subproceso || '')
      && String(x.proceso || '') === String(t.proceso || ''));
    const delCatalogo = Number(c?.horas_base) || 0;
    return delCatalogo > 0 ? delCatalogo : (Number(t.horas) || 0);
  }, [catalogo, modelo]);

  /**
   * El título de una tarea al volcarla.
   *
   * Antes se usaba `codigoTareaIntegrada`, que fusionaba varias normas en un
   * título tipo «… - Integrada 9001 14001 27001». Eso daba por hecho que las
   * tareas parecidas de sistemas distintos son la misma, y no lo son: integrar
   * o no lo decide el consultor mirando la organización, tarea a tarea.
   *
   * Solo el subproceso. La norma y el cliente ya van en el codigo
   * -CECE-9001-01- y la norma tiene ademas su propia columna.
   */
  const tituloTarea = useCallback((c) => c.subproceso || c.proceso || '', []);

  /**
   * El CODIGO de una tarea: CECE-9001-01.
   *
   * Sigla del cliente (la misma que usan los codigos de proyecto), norma y
   * correlativo dentro de esa norma. Corto, dice de quien y de que sistema es,
   * y sirve para hablar de una tarea por telefono. Quien planifica puede
   * cambiarlo despues: es la referencia de cada casa.
   */
  const codigoDeTarea = useCallback(
    (norma, n) => `${siglaCliente(cliente?.empresa) || 'CLI'}-${norma || 'GEN'}-${String(n).padStart(2, '0')}`,
    [cliente?.empresa]);

  /**
   * La IDENTIDAD de una tarea, para no duplicarla.
   *
   * Comparar por titulo fue un error: al cambiar el formato del nombre el
   * volcado dejo de reconocer las que ya estaban y las inserto otra vez.
   *
   * Comparar SOLO por `catalogo_id` fue el segundo error, y el que llevo a
   * CECE de 65 tareas a 127: las tareas nacian sin enlace -el catalogo no
   * arrastraba su `id`-, asi que una copia enlazada y otra sin enlazar se
   * veian como tareas distintas y ninguna reconocia a la otra.
   *
   * Por eso una tarea tiene DOS claves y basta con que coincida una: el enlace
   * al catalogo, si lo hay, y la composicion norma + proceso + subproceso, que
   * es lo que define una tarea en el catalogo. El titulo nunca entra: es lo
   * unico que cambia.
   */
  const clavesDe = useCallback((x) => {
    const n = (s) => String(s || '').trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ks = [`K:${n(x.norma_id)}|${n(x.proceso)}|${n(x.subproceso)}`];
    const cid = x.catalogo_id || x.id;   // en una candidata, `id` es el del catalogo
    if (cid) ks.push(`C:${cid}`);
    return ks;
  }, []);

  // Una tarea ya esta si CUALQUIERA de sus claves esta registrada.
  const yaRegistrada = useCallback((conjunto, x) => clavesDe(x).some((k) => conjunto.has(k)), [clavesDe]);
  const registrar = useCallback((conjunto, x) => { clavesDe(x).forEach((k) => conjunto.add(k)); }, [clavesDe]);

  const volcandoRef = useRef(false);

  useEffect(() => {
    if (!proyecto || !cliente || volcandoRef.current) return;
    if (!normasSel.length || !modelo || !candidatas.length) return;
    // Solo lo que falte: si ya están todas, no hay nada que hacer.
    const yaEstan = new Set();
    tareasProyecto.forEach((t) => registrar(yaEstan, t));
    const faltan = candidatas.filter((c) => !yaRegistrada(yaEstan, c));
    if (!faltan.length) return;

    volcandoRef.current = true;
    (async () => {
      const n = await volcarTareasQueFalten();
      volcandoRef.current = false;
      if (n > 0) { cargar(); setMsg(`${n} tarea(s) del modelo ${modelo} volcadas al proyecto.`); }
    })();
  }, [proyecto?.id, modelo, normasSel.join('|'), candidatas.length, tareasProyecto.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  function toggleNorma(id) {
    if (id === '9001') return; // base obligatoria
    setNormasSel(s => {
      const next = s.includes(id) ? s.filter(x => x !== id) : [...s, id];
      // Apoyo: la duración mínima depende del nº de sistemas.
      if (modelo === 'Apoyo') setMeses(mesesPorModelo('Apoyo', next.length));
      return next;
    });
  }
  // Edita una tarea ya distribuida: marca editada_manual para que la sincronización
  // del catálogo no la pise, y refleja el cambio en la agenda.
  async function addBloque(t) {
    const base = Array.isArray(t.bloques_ejecucion) && t.bloques_ejecucion.length
      ? [...t.bloques_ejecucion]
      : trocearEnBloques(t.horas).map(h => ({ horas: h, fecha: t.fecha_estimada }));
    base.push({ horas: 4, fecha: t.fecha_estimada });
    await guardarBloques(t, base);
  }
  async function quitarBloque(t, idx) {
    const base = Array.isArray(t.bloques_ejecucion) && t.bloques_ejecucion.length
      ? t.bloques_ejecucion
      : trocearEnBloques(t.horas).map(h => ({ horas: h, fecha: t.fecha_estimada }));
    await guardarBloques(t, base.filter((_, i) => i !== idx));
  }
  async function guardarBloques(t, bloques) {
    const upd = { bloques_ejecucion: bloques, editada_manual: true };
    await updateRow('cliente_tareas', t.id, upd);
    setTareas(ts => ts.map(x => x.id === t.id ? { ...x, ...upd } : x));
    try { await sincronizarTareaAgenda(conCod({ ...t, ...upd }), proyecto?.consultor_1_id || null, equipo); } catch { /* noop */ }
  }

  async function patchTarea(t, campos) {
    const conFlag = { ...campos, editada_manual: true };
    await updateRow('cliente_tareas', t.id, conFlag);
    setTareas(ts => ts.map(x => x.id === t.id ? { ...x, ...conFlag } : x));
    try { await sincronizarTareaAgenda(conCod({ ...t, ...conFlag }), proyecto?.consultor_1_id || null, equipo); } catch { /* noop */ }
  }

  // Horas reales = suma de los seguimientos marcados como hechos.
  function horasRealesDe(t) {
    const segs = Array.isArray(t.seguimientos) ? t.seguimientos : [];
    return Math.round(segs.filter(s => s.hecho).reduce((a, s) => a + (Number(s.horas) || 0), 0) * 100) / 100;
  }

  const toggleSelT = (id) => setSelT(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // Asigna consultor a las tareas seleccionadas (lote).
  async function asignarLote(consultorId) {
    const ids = [...selT];
    if (!ids.length) { setMsg('Selecciona tareas con el aspa primero.'); return; }
    if (!confirm(`¿Asignar ${ids.length} tarea(s) a ${consultorId ? nombreConsultor(consultorId) : 'sin asignar'}?`)) return;
    try {
      for (const id of ids) {
        const t = tareas.find(x => x.id === id); if (!t) continue;
        await updateRow('cliente_tareas', id, { consultor_id: consultorId, editada_manual: true });
        try { await sincronizarTareaAgenda(conCod({ ...t, consultor_id: consultorId }), proyecto?.consultor_1_id || null, equipo); } catch { /* noop */ }
      }
      setSelT(new Set()); cargar();
      setMsg(`${ids.length} tarea(s) reasignada(s).`);
    } catch (e) { setMsg(e.message); }
  }

  // Vuelca a la agenda todas las tareas del proyecto (sin regenerar fechas).
  async function distribuirAgenda() {
    if (!tareasProyecto.length) { setMsg('No hay tareas que distribuir.'); return; }
    const conConsultor = tareasProyecto.filter(t => t.consultor_id || proyecto?.consultor_1_id);
    if (!conConsultor.length) { setMsg('Asigna un consultor a las tareas (o un consultor 1 al proyecto) antes de distribuir.'); return; }
    setDistribuyendo(true); setMsg('Distribuyendo…');
    try {
      const n = await sincronizarVariasAgenda(tareasProyecto.map(conCod), proyecto?.consultor_1_id || null, equipo);
      const sinFecha = tareasProyecto.filter(t => !t.fecha_estimada).length;
      setMsg(`Agenda distribuida: ${n} tarea(s) volcadas${sinFecha ? ` · ${sinFecha} sin fecha no se volcaron` : ''}.`);
    } catch (e) { setMsg('Error al distribuir: ' + e.message); }
    finally { setDistribuyendo(false); }
  }

  const nombreConsultor = (id) => { const c = equipo.find(x => String(x.id) === String(id)); return c ? `${c.nombre} ${c.apellidos || ''}`.trim() : '—'; };

  // El alta vivía aquí con dos `prompt()` encadenados —uno pedía el número de
  // una lista numerada de clientes— y creaba el proyecto con `normas: []` y el
  // modelo fijo en 'Implicación'. De ahí salían los proyectos que aparecen en
  // la tabla con «—» en Normas y Modelo. Ahora lo hace `AltaProyecto`, que pide
  // ambas cosas y lista las empresas del CRM marcadas como cliente.

  /**
   * Guarda normas y modelo, Y VUELCA LAS TAREAS que falten.
   *
   * Antes había que guardar y luego pulsar otro botón para traer las tareas.
   * Nadie lo hacía: se guardaba la configuración, se veía «Tareas resultantes»
   * con la lista, y se daba por hecho que ya estaba. El proyecto se quedaba sin
   * tareas y sin que nadie lo notara hasta mucho después.
   *
   * Ahora es un solo gesto: elegir normas y modelo ES definir el trabajo.
   */
  async function guardarConfig() {
    if (!proyecto) return;
    setMsg('Guardando…');
    // Se guarda el nombre CANÓNICO del modelo («Implantación», no
    // «implantacion»): así el dato queda limpio y no depende de que la
    // comparación lo normalice cada vez.
    await updateRow('proyectos_cliente', proyecto.id,
      { normas: normasSel, modelo: modeloCanonico(modelo) || modelo, meses_estimados: meses });
    // Las que ya existen no se tocan: volver a guardar completa, no duplica ni
    // borra lo que alguien haya ajustado a mano.
    const n = await volcarTareasQueFalten();
    cargar();
    setMsg(n > 0
      ? `Configuración guardada y ${n} tarea(s) volcadas del modelo ${modelo}.`
      : 'Configuración guardada.');
  }

  /** Inserta las tareas del modelo que aún no estén en el proyecto. Devuelve cuántas. */
  async function volcarTareasQueFalten() {
    if (!proyecto || !cliente || !candidatas.length) return 0;
    const yaEstan = new Set();
    tareasProyecto.forEach((t) => registrar(yaEstan, t));
    let n = 0;
    // Correlativo POR NORMA, y arrancando donde lo dejaron las que ya están:
    // reanudar en 01 chocaba con el código de una tarea existente y el insert
    // se caía en silencio (el índice único `cliente_tareas_codigo_unico`).
    const ultimoDe = {};
    for (const t of tareasProyecto) {
      const m = String(t.codigo || '').match(/-(\d+)$/);
      const k = t.norma_id || 'GEN';
      if (m) ultimoDe[k] = Math.max(ultimoDe[k] || 0, parseInt(m[1], 10));
    }
    for (const [i, c] of candidatas.entries()) {
      // Por identidad, no por título: el título cambia y la tarea es la misma.
      if (yaRegistrada(yaEstan, c)) continue;
      registrar(yaEstan, c);   // no repetir dentro del mismo volcado
      const k = c.norma_id || 'GEN';
      ultimoDe[k] = (ultimoDe[k] || 0) + 1;
      // «CECE-9001-01»: cliente, sistema y orden dentro del sistema.
      const codigo = codigoDeTarea(c.norma_id, ultimoDe[k]);
      // El título es solo el subproceso: el resto ya está en el código.
      const titulo = tituloTarea(c);
      try {
        await insertRow('cliente_tareas', {
          cliente_id: cliente.id, proyecto_id: proyecto.id,
          norma_id: c.norma_id, modelo,
          proceso: c.proceso, subproceso: c.subproceso,
          titulo,
          horas: c.horas,
          bloque: c.bloque, tipo: tipoTarea(c),
          // Sin integrar: una tarea, una norma.
          integrada: false, normas_integradas: [c.norma_id],
          // El enlace al catálogo y el título original: de ahí salen las horas
          // teóricas, y sobreviven a que se renombre la tarea.
          catalogo_id: c.id || null,
          codigo,
          titulo_origen: c.subproceso || c.proceso || null,
          orden: i, num_tarea: i + 1,
          fecha_estimada: null, consultor_id: null,
          bloques_ejecucion: [], seguimientos: [],
          fecha_real: null, hecha: false,
        });
        n += 1;
      } catch { /* una que falle no debe cortar el resto */ }
    }
    return n;
  }

  // Guarda las tareas configuradas y deja que el programa las distribuya por meses.
  /**
   * Vuelca las tareas del modelo al proyecto CON SUS HORAS, y sin fechas.
   *
   * Sustituye a «distribuir por meses», que repartía el calendario solo. Las
   * horas sí se traen: son las que el modelo asigna y las que se compararán
   * después con lo que se programe. Lo que no se decide aquí es CUÁNDO: eso lo
   * pone quien va a hacer el trabajo, sesión a sesión.
   */
  // `generarTareas()` retirada: era una copia antigua que fusionaba tareas
  // de varias normas en una sola. Integrar o no lo decide el consultor, tarea
  // a tarea, no un volcado automático.

  async function generarYDistribuir() {
    if (!proyecto || !cliente) return;
    setMsg(null);
    try {
      // Limpiar tareas previas de este proyecto
      for (const t of tareasProyecto) { await deleteRow('cliente_tareas', t.id); await borrarReflejoAgenda(t.id); }

      // Construir filas a partir de las candidatas (con o sin anidado)
      const filas = candidatas.map((c, i) => ({
        cliente_id: cliente.id, proyecto_id: proyecto.id,
        norma_id: c.norma_id, modelo,
        proceso: c.proceso, subproceso: c.subproceso,
        titulo: tituloTarea(c),
        codigo: codigoDeTarea(c.norma_id, i + 1),
        catalogo_id: c.id || null,
        titulo_origen: c.subproceso || c.proceso || null,
        horas: c.horas, bloque: c.bloque, tipo: tipoTarea(c),
        integrada: false, normas_integradas: [c.norma_id],
        consultor_id: proyecto.consultor_1_id || null, orden: i, num_tarea: i + 1,
      }));

      // Distribuir fechas respetando el tope de fecha_inicio + meses.
      const conFechas = repartirFechas(filas, proyecto.fecha_inicio, meses, { festivos, meses, topeMeses: true });
      const fueraPlazo = conFechas.filter(f => f.fuera_de_plazo).length;
      if (fueraPlazo > 0) {
        setMsg(`⚠️ Aviso: ${fueraPlazo} tarea(s) no caben en ${meses} meses desde el inicio. Se han colocado igualmente, pero revisa el plazo o la carga.`);
      }

      const creadas = [];
      for (const f of conFechas) {
        const { tramos, _clave, _id, ...campos } = f;
        // Bloques de ejecución de 4h con fechas autopropuestas desde la fecha estimada.
        const bloques = bloquesEjecucion(campos.horas, campos.fecha_estimada, { festivos, meses });
        const fila = await insertRow('cliente_tareas', {
          ...campos,
          bloques_ejecucion: bloques,
          seguimientos: [],
          fecha_real: null, hecha: false,
        });
        if (fila?.id) creadas.push(fila);
      }

      // ── Tarea de coordinación del proyecto: 30 min × nº de sistemas, el 2º lunes
      //    laborable de CADA mes que abarque el proyecto. ──
      const fSet = new Set((festivos.length ? festivos : FESTIVOS_2026).map(x => x.fecha || x));
      const segundoLunesLaborable = (anio, mes) => {
        let lunes = 0; const d = new Date(anio, mes, 1);
        for (let i = 0; i < 31 && d.getMonth() === mes; i++) {
          if (d.getDay() === 1 && esLaborable(d, fSet)) { lunes++; if (lunes === 2) return new Date(d); }
          d.setDate(d.getDate() + 1);
        }
        return null;
      };
      const nSis = normasSel.length;
      const horasCoord = Math.round(0.5 * nSis * 100) / 100; // 30 min por sistema
      const inicio = proyecto.fecha_inicio ? new Date(proyecto.fecha_inicio) : new Date();
      const mesesProy = Math.max(3, meses);
      for (let k = 0; k < mesesProy; k++) {
        const ref = new Date(inicio.getFullYear(), inicio.getMonth() + k, 1);
        const fecha = segundoLunesLaborable(ref.getFullYear(), ref.getMonth());
        if (!fecha) continue;
        const fila = await insertRow('cliente_tareas', {
          cliente_id: cliente.id, proyecto_id: proyecto.id,
          norma_id: '9001', modelo,
          proceso: 'PM COORDINACIÓN', subproceso: 'Reunión de coordinación del proyecto',
          titulo: 'Reunión de coordinación del proyecto',
          horas: horasCoord, bloque: 'PM', tipo: 'coordinacion',
          integrada: false, normas_integradas: normasSel,
          consultor_id: proyecto.consultor_1_id || null,
          fecha_estimada: toISO(fecha), fecha_real: null, hecha: false,
          seguimientos: [], orden: 9000 + k,
        });
        if (fila?.id) creadas.push(fila);
      }

      await sincronizarVariasAgenda(creadas.map(conCod), proyecto.consultor_1_id || null, equipo);
      cargar();
      setMsg(`${creadas.length} tareas generadas (incluida coordinación mensual de ${horasCoord} h).`);
    } catch (e) { setMsg(e.message); }
  }

  const totalHoras = candidatas.reduce((s, c) => s + (Number(c.horas) || 0), 0);

  const [vista, setVista] = useState('cartera');   // cartera | panel

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <p className="eyebrow">Proyectos</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">Proyectos</h1>
      </div>

      {/* Cartera y panel eran dos pantallas sobre los mismos proyectos: una con
          la tabla, otra con las cifras. Se entra a mirar «cómo va esto» y había
          que acordarse de en cuál estaba cada cosa. Ahora es una, con dos
          vistas y sin perder el proyecto seleccionado al cambiar. */}
      <div className="flex gap-1.5 border-b border-[#1E5468]">
        {[['cartera', 'Cartera y configuración'], ['panel', 'Cómo van']].map(([k, etq]) => (
          <button key={k} onClick={() => setVista(k)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-bold transition ${
              vista === k
                ? 'border-brand-orange text-[#EAF4F7]'
                : 'border-transparent text-[#7FA7B4] hover:text-[#EAF4F7]'}`}>
            {etq}
          </button>
        ))}
      </div>

      {vista === 'panel' && <DashboardProyectos />}

      <div className={vista === 'cartera' ? 'space-y-6' : 'hidden'}>

      {/* Alta de proyecto.
          El desplegable «Selecciona un proyecto activo» se ha quitado: duplicaba
          lo que ya hace el «Abrir →» de la tabla de abajo, y solo listaba los
          activos, así que un proyecto pausado o cerrado no aparecía por ninguna
          de las dos vías. */}
      </div>

      {abierta && (
        <SesionesTarea
          tarea={{
            id: abierta.id, titulo: abierta.titulo,
            codigo: `${abierta.norma_id}-${String(abierta.num_tarea || 0).padStart(2, '0')}`,
            // Del catálogo, no de la copia: es el tope real contra el que se
            // planifica.
            horas_teoricas: horasTeoricas(abierta),
            subproceso: abierta.subproceso,
          }}
          contexto={{ norma: abierta.norma_id }}
          fechaCertificacion={fechas?.certificacion || proyecto?.fecha_limite || null}
          proyectoId={proyecto?.id}
          campoTarea="cliente_tarea_id" editable
          onCerrar={() => setAbierta(null)}
          onGuardado={() => listTable('tarea_sesiones').then(setSesiones).catch(() => {})}
        />
      )}

      {alta ? (
        <AltaProyecto empresas={empresas} clientes={clientes}
          onCerrar={() => setAlta(false)}
          onCreado={(nuevo) => { setAlta(false); cargar(); if (nuevo?.id) setSel(nuevo.id); }} />
      ) : (
        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-[#9FC0CB]">
              Los proyectos nacen de una oferta aceptada. Ábrelo desde ahí, o entra en uno existente desde la tabla.
            </p>
            <button onClick={() => setAlta(true)} className="btn-orange !px-4 !py-2">+ Nuevo proyecto</button>
          </div>
        </div>
      )}

      {/* Lista de proyectos */}
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input className="input !w-auto !py-1.5 !text-sm" placeholder="Buscar proyecto…" value={buscaP} onChange={e => { setBuscaP(e.target.value); setPagP(0); }} />
            <span className="text-xs font-medium text-[#9FC0CB]">{proyectosFiltrados.length} proyectos</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-[#9FC0CB]">Mostrar</label>
            <select className="input !w-auto !py-1.5 !text-sm" value={porPagP} onChange={e => { setPorPagP(e.target.value); setPagP(0); }}>
              {['10', '25', '50', '100', 'todos'].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto">
          {/* ── Anchos ──
              Normas, modelo, estado y el botón ocupan lo que dice su texto
              (`w-px` + `whitespace-nowrap`: la columna se encoge a su
              contenido). Lo que sobra se lo reparten cliente y proyecto, que
              son las dos frases largas. Con `min-w` en la tabla, si la
              ventana es estrecha se desplaza en horizontal en vez de
              apretar los nombres hasta partirlos letra a letra. */}
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">
                <th className="w-[26%] min-w-[170px] py-2 pr-4">Cliente</th>
                <th className="py-2 pr-4">Proyecto</th>
                <th className="w-px whitespace-nowrap py-2 pr-4">Normas</th>
                <th className="w-px whitespace-nowrap py-2 pr-4">Modelo</th>
                <th className="w-px whitespace-nowrap py-2 pr-4">Estado</th>
                <th className="w-px py-2"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {proyectosPagina.map(p => (
                <tr key={p.id}
                  className={`cursor-pointer align-top hover:bg-navy-50/50 ${String(p.id) === String(sel) ? 'bg-brand-orange/5' : ''}`}
                  onClick={() => abrirProyecto(p.id)}>
                  <td className="py-2 pr-4 font-medium leading-snug break-words hyphens-none">
                    {p.nombreCliente}
                    {/* La razón social solo si difiere: repetirla en cada fila
                        es ruido, pero cuando no coincide hace falta verla. */}
                    {p.razonSocial && p.razonSocial !== p.nombreCliente && (
                      <span className="block text-[11px] font-normal leading-snug text-[#7FA7B4]">{p.razonSocial}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 leading-snug break-words">
                    {p.nombre}
                    {p.numeroOferta && (
                      <span className="block text-[11px] text-[#7FA7B4]">{p.numeroOferta}</span>
                    )}
                  </td>
                  <td className="w-px whitespace-nowrap py-2 pr-4 text-xs text-[#9FC0CB]">
                    {p.normas.length ? p.normas.join(', ') : <span className="text-[#5E8494]">—</span>}
                    {p.desfases.some((d) => d.campo === 'normas') && (
                      <span className="ml-1 text-[10px] font-bold text-amber-200"
                        title="El proyecto tiene un alcance distinto del ofertado">≠ oferta</span>
                    )}
                  </td>
                  <td className="w-px whitespace-nowrap py-2 pr-4 text-xs">
                    {p.modelo || <span className="text-[#5E8494]">—</span>}
                    {p.desfases.some((d) => d.campo === 'modelo') && (
                      <span className="ml-1 text-[10px] font-bold text-amber-200" title="Distinto del modelo ofertado">≠</span>
                    )}
                  </td>
                  <td className="w-px whitespace-nowrap py-2 pr-4"><span className={`chip text-[11px] font-bold ${p.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-[#123F52] text-[#9FC0CB]'}`}>{p.estado}</span></td>
                  {/* Un BOTÓN, no un texto naranja. La fila entera seguía
                      siendo pulsable, pero nada lo decía: había que
                      adivinarlo. `stopPropagation` para no abrir dos veces. */}
                  <td className="w-px py-2 text-right">
                    <button type="button"
                      onClick={(e) => { e.stopPropagation(); abrirProyecto(p.id); }}
                      className="btn-orange whitespace-nowrap !px-3 !py-1.5 !text-xs">
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {porPagP !== 'todos' && totalPagsP > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <button onClick={() => setPagP(p => Math.max(0, p - 1))} disabled={pagP === 0} className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-30">‹ Anterior</button>
            <span className="text-xs font-medium text-[#9FC0CB]">Página {pagP + 1} de {totalPagsP}</span>
            <button onClick={() => setPagP(p => Math.min(totalPagsP - 1, p + 1))} disabled={pagP >= totalPagsP - 1} className="btn-ghost !px-3 !py-1.5 text-xs disabled:opacity-30">Siguiente ›</button>
          </div>
        )}
      </div>

      {/* Ancla del detalle: hasta aquí desplaza «Abrir». */}
      <div ref={detalleRef} className="scroll-mt-4" />

      {!proyecto ? (
        <p className="card text-sm font-medium text-[#9FC0CB]">Abre un proyecto de la tabla para configurar sus normas, su modelo y sus tareas.</p>
      ) : (
        <>
          {/* Cabecera */}
          <div className="card">
            <p className="text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">Cliente matriz</p>
            <p className="text-lg font-extrabold">{cliente?.empresa || '—'}</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="label">Nombre del proyecto</label>
                <input className="input" value={nombreProy} onChange={e => setNombreProy(e.target.value)} />
              </div>
              <div>
                <label className="label">Estado</label>
                <select className="input !w-auto" value={estadoProy} onChange={e => setEstadoProy(e.target.value)}>
                  <option value="activo">Activo</option>
                  <option value="pausado">Pausado</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>
              <button onClick={guardarCabecera} className="btn-ghost !px-4 !py-2">Guardar</button>
              {msgCab && <span className="text-sm font-bold text-[#B9D2DA]">{msgCab}</span>}
            </div>
          </div>

          {/* Normas + modelo */}
          <div className="card">
            {/* El equipo va ANTES de las normas: al planificar un proyecto, lo
                primero que se decide es quién lo lleva. Y sin equipo asignado
                el proyecto no aparece en el panel de ningún consultor. */}
            <EquipoProyecto
              proyectoId={proyecto.id}
              horasComprometidas={tareasProyecto.reduce((a, t) => a + (Number(t.horas) || 0), 0)}
            />
          </div>

          {/* Cómo va este proyecto, desglosado por norma. */}
          <CuadroTareas proyectoId={proyecto.id} titulo="Cómo van las horas" />

          <div className="card">
            <h4 className="font-extrabold">Normas y modelo del proyecto</h4>
            <p className="mt-1 text-sm font-medium text-[#9FC0CB]">ISO 9001 va siempre. Solo se mostrarán las tareas de las normas y el modelo elegidos.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NORMAS.map(n => {
                const on = normasSel.includes(n.id);
                return (
                  <button key={n.id} onClick={() => toggleNorma(n.id)}
                    className={`chip border transition ${on ? 'border-brand-orange bg-brand-orange/15 text-[#EAF4F7]' : 'border-[#1E5468] bg-[#10394A] text-[#9FC0CB] hover:border-navy-400'}`}>
                    {n.nombre}{n.id === '9001' ? ' (base)' : ''}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="label">Modelo de relación (acuerdo)</label>
                <select className="input !w-auto" value={modelo} onChange={e => cambiarModelo(e.target.value)}>
                  {MODELOS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {/* ── Fechas: vienen de la oferta y del contrato ──
                  No se teclean. Si se pudieran cambiar aquí, el calendario del
                  equipo iría contra unas fechas y el cliente esperaría otras.
                  Para moverlas se edita la oferta y bajan solas. */}
              <div>
                <label className="label">Fecha de inicio</label>
                <div className="input !w-44 flex items-center bg-[#0A2634] text-[#B9D2DA]">
                  {fechas?.inicio
                    ? new Date(`${fechas.inicio}T12:00:00`).toLocaleDateString('es-ES')
                    : <span className="text-[#5E8494]">sin fecha</span>}
                </div>
                <p className="mt-1 text-[11px] font-medium text-[#7FA7B4]">
                  {fechas?.origen.inicio === 'contrato' ? 'Del contrato firmado.'
                    : fechas?.origen.inicio === 'oferta' ? 'De la oferta aceptada.'
                    : 'La oferta no tiene fecha de inicio.'}
                </p>
              </div>

              <div>
                <label className="label">Certificación prevista</label>
                <div className="input !w-44 flex items-center bg-[#0A2634] text-[#B9D2DA]">
                  {fechas?.certificacion
                    ? new Date(`${fechas.certificacion}T12:00:00`).toLocaleDateString('es-ES')
                    : <span className="text-[#5E8494]">por determinar</span>}
                </div>
                <p className="mt-1 text-[11px] font-medium text-[#7FA7B4]">De la oferta. La auditoría externa.</p>
              </div>

              <div>
                <label className="label">Fecha límite de trabajo</label>
                <div className="input !w-44 flex items-center bg-[#0A2634] font-bold text-brand-orange">
                  {fechas?.limite
                    ? new Date(`${fechas.limite}T12:00:00`).toLocaleDateString('es-ES')
                    : <span className="font-normal text-[#5E8494]">—</span>}
                </div>
                <p className="mt-1 text-[11px] font-medium text-[#7FA7B4]">
                  {fechas?.certificacion
                    ? `${DIAS_ANTES_CERTIFICACION} días antes de la auditoría, para cerrar hallazgos.`
                    : 'Se calcula al fijar la certificación.'}
                </p>
              </div>

              <div>
                <label className="label">Duración (meses)</label>
                <div className="input !w-28 flex items-center bg-[#0A2634] text-[#B9D2DA]">{fechas?.meses ?? meses}</div>
                <p className="mt-1 text-[11px] font-medium text-[#7FA7B4]">
                  {fechas?.origen.meses === 'calculada'
                    ? 'Del inicio a la certificación.'
                    : `Mínimo del modelo ${modelo}.`}
                </p>
              </div>

              <button onClick={guardarConfig} className="btn-orange !px-4 !py-2">Guardar configuración</button>
            </div>
          </div>

          {/* Anidado de tareas comunes */}
          {/* El panel de «anidar tareas comunes» se ha retirado: cada norma
              lleva sus tareas por separado y no se fusionan. */}


          {/* El cuadro de «Tareas resultantes» que había aquí era una
              PREVISUALIZACIÓN de lo que el catálogo iba a dar, y convivía con
              el de «Tareas distribuidas», que eran las tareas de verdad. Dos
              listas de lo mismo: una que no se podía tocar y otra que sí.

              Ahora hay una sola, la de abajo, con las tareas reales del
              proyecto. Se vuelcan solas al elegir normas y modelo, así que la
              previsualización no aportaba nada que no se viera un segundo
              después. */}

          {/* Sin tareas y con normas elegidas: el catálogo no da nada para esa
              combinación. Se dice aquí, que es donde se buscaría. */}
          {tareasProyecto.length === 0 && normasSel.length > 0 && (
            <p className="rounded-xl border border-amber-300/40 bg-amber-400/[0.07] px-3 py-2.5 text-[12.5px] font-bold text-amber-200">
              El catálogo no tiene tareas con horas para {modelo} en estas normas.
              <span className="ml-1 font-medium text-[#DFF1F5]">
                Rellénalas en «Sistemas de gestión» y entrarán solas.
              </span>
            </p>
          )}

          {/* Las tareas del proyecto: código, nombre y programación */}
          {tareasProyecto.length > 0 && (
            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-extrabold">Tareas resultantes ({tareasProyecto.length})</h4>
                <div className="flex items-center gap-3">
                  {msg && <span className="text-sm font-bold text-[#B9D2DA]">{msg}</span>}
                  {/* «Distribuir agenda» retirado: volcaba las tareas al
                      calendario de golpe, sin que nadie decidiera cuándo ni con
                      qué horas. Ahora la agenda se llena sola en cuanto se
                      programa una sesión, que es cuando existe una decisión
                      real detrás. */}
                  <span className="text-[12px] text-[#7FA7B4]">
                    La agenda se actualiza sola al programar cada tarea.
                  </span>
                </div>
              </div>
              <p className="mt-1 text-xs font-medium text-[#9FC0CB]">
                Pulsa las horas de una tarea para programarla en una o varias sesiones.
                Las horas comprometidas vienen del modelo y no se editan.
              </p>

              {/* Acciones masivas */}
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#1E5468] bg-navy-50/40 px-3 py-2">
                <span className="text-xs font-bold text-[#9FC0CB]">{selT.size ? `${selT.size} seleccionada(s)` : `${tareasProyecto.length} tareas`}</span>
                <button onClick={() => setSelT(new Set(tareasProyecto.map(t => t.id)))} className="text-xs font-bold text-[#9FC0CB] hover:underline">Todas</button>
                <button onClick={() => setSelT(new Set())} className="text-xs font-bold text-[#9FC0CB] hover:underline">Ninguna</button>
                <span className="mx-1 h-4 w-px bg-navy-200" />
                <label className="text-xs font-bold text-[#9FC0CB]">Asignar consultor en lote</label>
                <select className="input !w-auto !py-1.5 !text-sm" value="__" onChange={e => { if (e.target.value !== '__') { asignarLote(e.target.value === '__none' ? null : e.target.value); e.target.value = '__'; } }}>
                  <option value="__" disabled>Elegir…</option>
                  <option value="__none">Sin asignar</option>
                  {consultores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos || ''}</option>)}
                </select>
              </div>

              {/* Filtros de tareas distribuidas */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input className="input !w-56 !py-1.5 !text-sm" placeholder="Filtrar por tarea…" value={filtroT} onChange={e => setFiltroT(e.target.value)} />
                <select className="input !w-auto !py-1.5 !text-sm" value={filtroConsultor} onChange={e => setFiltroConsultor(e.target.value)}>
                  <option value="">Todos los consultores</option>
                  {consultores.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.apellidos || ''}</option>)}
                </select>
                {(filtroT || filtroConsultor) && <button onClick={() => { setFiltroT(''); setFiltroConsultor(''); }} className="text-xs font-bold text-[#F9A83A] hover:underline">Limpiar filtros</button>}
                <span className="text-xs font-medium text-[#9FC0CB]">Clic en una cabecera para ordenar.</span>
              </div>

              <div className="mt-3 max-h-[32rem] overflow-y-auto overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="sticky top-0 bg-[#10394A] z-10">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">
                      <th className="py-2 w-8"><input type="checkbox" checked={selT.size === tareasProyecto.length && tareasProyecto.length > 0} onChange={e => e.target.checked ? setSelT(new Set(tareasProyecto.map(t => t.id))) : setSelT(new Set())} /></th>
                      {/* Solo lo que hace falta para planificar: qué tarea es,
                          cuánto vale y cómo va. El consultor y la fecha se ven
                          y se cambian en su calendario, que es donde de verdad
                          se decide, y puede haber varias personas y varias
                          fechas por tarea. */}
                      {/* El código pasó de «9001-01» a «CECE-9001-01»: en 80 px
                          se cortaba. Las columnas de cifras se quedan con lo
                          que mide su cabecera y el resto es para la tarea, que
                          es la frase larga. */}
                      <th className="w-36 cursor-pointer select-none py-2 pr-3 hover:text-[#9FC0CB]" onClick={() => ordenarPor('codigo')}>Código{flechaOrden('codigo')}</th>
                      <th className="cursor-pointer select-none py-2 pr-4 hover:text-[#9FC0CB]" onClick={() => ordenarPor('titulo')}>Tarea{flechaOrden('titulo')}</th>
                      <th className="w-px whitespace-nowrap py-2 pl-3 text-right">Teóricas</th>
                      <th className="w-px whitespace-nowrap py-2 pl-3 text-right">Programadas</th>
                      <th className="w-px whitespace-nowrap py-2 pl-3 text-right">Ejecutadas</th>
                      <th className="w-px py-2 pl-3"><span className="sr-only">Sesiones</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-50">
                    {tareasProyecto.map((t, idx) => {
                      const bloques = Array.isArray(t.bloques_ejecucion) ? t.bloques_ejecucion : [];
                      const fechaLimite = bloques.length ? bloques.map(b => b.fecha).filter(Boolean).sort().slice(-1)[0] : t.fecha_estimada;
                      const abierto = expandida === t.id;
                      // Si la tarea aún no tiene código propio se compone al
                      // vuelo con el mismo formato con que se graban: no puede
                      // enseñarse un formato en la tabla y grabarse otro.
                      const codigo = codigoDeTarea(t.norma_id, t.num_tarea || (idx + 1));
                      return (
                      <>
                      <tr key={t.id} className={`${t.hecha ? 'opacity-60' : ''} ${selT.has(t.id) ? 'bg-brand-orange/5' : ''}`}>
                        <td className="py-1.5 align-top"><input type="checkbox" className="mt-0.5" checked={selT.has(t.id)} onChange={() => toggleSelT(t.id)} /></td>
                        {/* ── Código y nombre, editables ──
                            En un proyecto de 65 tareas hace falta un código
                            corto para hablar de ellas en la agenda —«S1 PE1»— y
                            un nombre que se entienda. Lo pone quien planifica,
                            según cómo se organice ese cliente.

                            Renombrar NO rompe nada: las horas teóricas salen de
                            `catalogo_id`, que no se toca. Debajo se ve de qué
                            tarea del catálogo procede. */}
                        <td className="py-1.5 pr-3 align-top">
                          <input
                            className="w-full max-w-[132px] rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-brand-verdeTexto hover:border-[#1E5468] focus:border-brand-orange focus:bg-[#0B2E3D] focus:outline-none"
                            value={t.codigo || codigo}
                            placeholder="CECE-9001-01"
                            onChange={(e) => patchTarea(t, { codigo: e.target.value })} />
                        </td>
                        {/* El NOMBRE no se edita: lo genera el sistema desde el
                            catálogo. Editable, cada uno escribía el suyo y dos
                            tareas idénticas de proyectos distintos dejaban de
                            poder compararse. El código sí se cambia: es la
                            referencia corta para la agenda y es de cada casa. */}
                        <td className="py-1.5 pr-4 align-top">
                          {/* Sin `max-w`: el título es la frase que hay que leer
                              y la columna ya se lleva todo el espacio libre.
                              Recortarla a 420 px partía nombres como «S3 PA1
                              GESTIÓN REL LABORAL, SEGURIDAD Y SALUD» en tres
                              líneas sin necesidad. */}
                          <div className="min-w-[240px] whitespace-normal break-words px-1 font-medium leading-snug text-[#EAF4F7]">
                            {t.titulo}
                          </div>
                          {/* La referencia al catálogo, siempre visible: es lo
                              que garantiza que las horas se comparan contra la
                              tarea correcta aunque el nombre haya cambiado. */}
                          <span className="block px-1 text-[10.5px] text-[#5E8494]">
                            {t.norma_id}
                            {t.titulo_origen && t.titulo_origen !== t.titulo ? ` · ${t.titulo_origen}` : ''}
                            {!t.catalogo_id && (
                              <span className="ml-1 font-bold text-amber-200/80" title="Sin enlace al catálogo: las horas teóricas se buscan por nombre">
                                sin enlazar
                              </span>
                            )}
                          </span>
                        </td>

                        {/* ── Las tres cifras ──
                            Teóricas del catálogo del modelo: es el tope, y no
                            se edita. Programadas y ejecutadas salen de las
                            sesiones. Juntas dicen si la tarea está cubierta,
                            corta o pasada de horas. */}
                        {(() => {
                          const ss = sesiones.filter((s) => String(s.cliente_tarea_id) === String(t.id));
                          const b = balanceTarea({ horas_teoricas: horasTeoricas(t) }, ss);
                          const tono = b.estado === 'sin_planificar' ? 'text-[#7FA7B4]'
                            : b.estado === 'corto' ? 'text-amber-200'
                            : b.estado === 'pasado' ? 'text-red-300' : 'text-emerald-300';
                          return (
                            <>
                              <td className="w-px whitespace-nowrap py-1.5 pl-3 text-right align-top font-bold text-[#EAF4F7]">{fmtH(b.teoricas)}</td>
                              <td className={`w-px whitespace-nowrap py-1.5 pl-3 text-right align-top font-bold ${tono}`}>
                                {b.planificadas ? fmtH(b.planificadas) : '—'}
                                {b.nSesiones > 0 && (
                                  <span className="block text-[10px] font-normal text-[#7FA7B4]">
                                    {b.nSesiones} sesión{b.nSesiones === 1 ? '' : 'es'}
                                  </span>
                                )}
                              </td>
                              <td className="w-px whitespace-nowrap py-1.5 pl-3 text-right align-top font-bold text-emerald-300">
                                {b.ejecutadas ? fmtH(b.ejecutadas) : '—'}
                              </td>
                            </>
                          );
                        })()}

                        {/* Botón, como el de «Abrir» de la lista: si algo se
                            pulsa, tiene que parecer que se pulsa. */}
                        <td className="w-px py-1.5 pl-3 text-right align-top">
                          <button type="button" onClick={() => setAbierta(t)}
                            className="btn-ghost whitespace-nowrap !px-3 !py-1 !text-xs"
                            title="Ver y programar las sesiones de esta tarea">
                            Calendario
                          </button>
                        </td>
                      </tr>
                      </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
