import { useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { sincronizarTareaAgenda } from '../../lib/sincroAgenda.js';
import { NORMAS, mismoModelo } from '../../lib/calcEngine.js';
import { useAuth } from '../../lib/auth.jsx';
import { can } from '../../lib/permisos.js';

// Modelos que se editan lado a lado. Implantación ERA un precio cerrado derivado
// de Implicación, pero desde que es un proyecto con horas propias tiene que
// poder editarse aquí como los demás: si no, sus tareas existen y no se ven.
const MODELOS_COL = ['Apoyo', 'Implantación', 'Relación', 'Implicación', 'Compromiso'];
const fmtH = (h) => `${(Math.round((h || 0) * 100) / 100).toLocaleString('es-ES')}`;

export default function Sistemas() {
  // ── Quién puede tocar el catálogo ──
  // Lo consultan dirección de proyecto, consultoría y gestión: saber qué tareas
  // define cada modelo es parte del trabajo. Editarlo queda en Administración,
  // porque estas horas alimentan el precio de TODAS las ofertas: cambiarlas
  // aquí mueve lo que se está ofertando en ese momento.
  const { role } = useAuth();
  const puedeEditar = can.editarCatalogoTareas(role);

  const [catalogo, setCatalogo] = useState([]);
  const [normaSel, setNormaSel] = useState('9001');
  const [msg, setMsg] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState('');

  // ── Los cambios se acumulan y se guardan con un botón ──
  // Antes cada tecla escribía en la base: sin botón de guardar nadie sabía si
  // el cambio había entrado, y «sincronizar» era otro paso aparte que se
  // olvidaba. Ahora las celdas editadas se marcan, y «Guardar y replanificar»
  // las escribe en el catálogo Y en las tareas de los proyectos abiertos.
  //
  //   edits    clave «subproceso|modelo» → horas nuevas
  //   manual   celdas de Implantación tocadas a mano en esta tanda: no se
  //            recalculan aunque cambie su Implicación
  const [edits, setEdits] = useState({});
  const [manual, setManual] = useState(new Set());
  const hayCambios = Object.keys(edits).length > 0;

  const cargar = () => listTable('tareas_catalogo').then(setCatalogo).catch(() => setCatalogo([]));
  // `useEffect(cargar, [])` NO: lo que devuelva `cargar` lo toma React como
  // función de limpieza. Aquí devolvía la promesa de `listTable`, y al
  // desmontar la pantalla React intentaba llamarla: «r is not a function», con
  // el error apareciendo en la pantalla a la que se navegaba, no en esta.
  // Envuelto en una arrow, el efecto no devuelve nada.
  useEffect(() => { cargar(); }, []);
  // Al cambiar de norma se descartan los cambios sin guardar de la anterior.
  useEffect(() => { setEdits({}); setManual(new Set()); }, [normaSel]);

  // Agrupa las tareas de la norma por subproceso, cruzando los modelos en columnas.
  // Cada grupo tiene: subproceso, proceso, orden, y por modelo la fila {id, horas_base}.
  const grupos = useMemo(() => {
    const dela = catalogo.filter(t => t.norma_id === normaSel);
    const mapa = new Map(); // clave = subproceso
    for (const t of dela) {
      const clave = t.subproceso || t.titulo || '';
      if (!mapa.has(clave)) mapa.set(clave, { clave, subproceso: t.subproceso || '', proceso: t.proceso || '', orden: t.orden ?? 999, porModelo: {} });
      const g = mapa.get(clave);
      if ((t.orden ?? 999) < g.orden) g.orden = t.orden ?? 999;
      if (t.proceso && !g.proceso) g.proceso = t.proceso;
      g.porModelo[t.modelo] = { id: t.id, horas: Number(t.horas_base) || 0 };
    }
    let arr = [...mapa.values()].sort((a, b) => a.orden - b.orden || a.subproceso.localeCompare(b.subproceso));
    if (filtro.trim()) {
      const q = filtro.toLowerCase();
      arr = arr.filter(g => `${g.proceso} ${g.subproceso}`.toLowerCase().includes(q));
    }
    return arr;
  }, [catalogo, normaSel, filtro]);

  const kDe = (g, m) => `${g.clave}|${m}`;
  /** Horas que se ven: lo editado si lo hay, si no lo guardado. */
  const horasDe = (g, m) => (kDe(g, m) in edits ? edits[kDe(g, m)] : (g.porModelo[m]?.horas ?? null));

  // Totales por modelo (columna), con los cambios sin guardar incluidos.
  const totales = useMemo(() => {
    const t = {}; for (const m of MODELOS_COL) t[m] = 0;
    for (const g of grupos) for (const m of MODELOS_COL) t[m] += Number(horasDe(g, m)) || 0;
    return t;
  }, [grupos, edits]);

  // ── Implantación = 60 % de Implicación, al decimal por arriba ──
  // La implantación se calcula, no se inventa: es el 60 % de lo que cuesta
  // llevar el sistema en Implicación, redondeado al alza al primer decimal
  // (0,6 × 4,25 = 2,55 → 2,6). Después se puede retocar a mano: lo que se
  // teclee en la columna manda sobre el cálculo.
  const implantacionDe = (implicacion) => Math.ceil((Number(implicacion) || 0) * 0.6 * 10 - 1e-9) / 10;

  /** Anota un cambio de horas en una celda. Si es Implicación, arrastra Implantación. */
  function editarCelda(grupo, modelo, valor) {
    const horas = valor === '' ? 0 : Number(valor);
    if (!Number.isFinite(horas) || horas < 0) return;
    const k = kDe(grupo, modelo);
    setEdits((e) => {
      const n = { ...e, [k]: horas };
      if (modelo === 'Implicación' && !manual.has(kDe(grupo, 'Implantación'))) {
        n[kDe(grupo, 'Implantación')] = implantacionDe(horas);
      }
      return n;
    });
    if (modelo === 'Implantación') setManual((s) => new Set(s).add(k));
  }

  /** Recalcula Implantación desde Implicación en TODAS las tareas de la norma. */
  function recalcularImplantacion() {
    setEdits((e) => {
      const n = { ...e };
      for (const g of grupos) {
        const impl = horasDe(g, 'Implicación');
        if (impl == null) continue;
        const v = implantacionDe(impl);
        if (v !== (g.porModelo['Implantación']?.horas ?? null)) n[kDe(g, 'Implantación')] = v;
        else delete n[kDe(g, 'Implantación')];
      }
      return n;
    });
    setManual(new Set());
    setMsg('Implantación recalculada al 60 % de Implicación (al decimal por arriba). Revisa y guarda.');
  }

  function descartar() { setEdits({}); setManual(new Set()); setMsg(null); }

  // Edita el texto del subproceso/proceso en TODAS las filas de modelo de ese grupo.
  // Esto sí va directo a la base: es un nombre, no una hora que mueva precios.
  async function editarTextoGrupo(grupo, campo, valor) {
    const ids = MODELOS_COL.map(m => grupo.porModelo[m]?.id).filter(Boolean);
    for (const id of ids) {
      const patch = { [campo]: valor };
      await updateRow('tareas_catalogo', id, patch);
    }
    setCatalogo(cs => cs.map(x => (ids.includes(x.id) ? { ...x, [campo]: valor } : x)));
  }

  async function addTarea() {
    const proceso = prompt('Proceso (p. ej. PE1 PLANIFICACIÓN ESTRATÉGICA):', '');
    if (!proceso) return;
    const subproceso = prompt('Subproceso (p. ej. S1 PE1 GESTIÓN DEL CONTEXTO):', '');
    if (!subproceso) return;
    const orden = grupos.length + 1;
    // Crea la tarea en todos los modelos con 0 h, para poder rellenarlos.
    for (const m of MODELOS_COL) {
      await insertRow('tareas_catalogo', {
        norma_id: normaSel, modelo: m, proceso, subproceso,
        titulo: `${normaSel} - ${proceso} - ${subproceso}`, tipo: 'produccion',
        horas_base: 0, orden,
      });
    }
    cargar(); setMsg('Tarea añadida en todos los modelos.');
  }

  async function quitarGrupo(grupo) {
    if (!confirm(`¿Eliminar "${grupo.subproceso}" del catálogo de ${normaSel} (en todos los modelos)?`)) return;
    const ids = MODELOS_COL.map(m => grupo.porModelo[m]?.id).filter(Boolean);
    for (const id of ids) await deleteRow('tareas_catalogo', id);
    cargar(); setMsg('Tarea eliminada.');
  }

  // ── Guardar y replanificar ──
  // 1. Escribe cada celda cambiada en el catálogo (creando la fila del modelo
  //    si no existía).
  // 2. Lleva las horas nuevas a las tareas de los PROYECTOS ABIERTOS que
  //    salgan de esa fila del catálogo: mismas norma, modelo y subproceso (o
  //    enlace `catalogo_id`), no hechas, no ajustadas a mano ni integradas. Los
  //    proyectos cerrados no se tocan: lo que se hizo, se hizo con sus horas.
  // 3. Actualiza la agenda de quien tenga esa tarea asignada.
  async function guardarYReplanificar() {
    if (!hayCambios) return;
    setGuardando(true); setMsg(null);
    try {
      const cambiadas = [];   // filas del catálogo con horas nuevas
      for (const [k, horas] of Object.entries(edits)) {
        const [clave, modelo] = k.split('|');
        const g = grupos.find((x) => x.clave === clave) || catalogo.filter((t) => t.norma_id === normaSel && (t.subproceso || t.titulo || '') === clave)
          .reduce((acc, t) => acc || { clave, subproceso: t.subproceso || '', proceso: t.proceso || '', orden: t.orden ?? 999, porModelo: {} }, null);
        if (!g) continue;
        const cel = catalogo.find((t) => t.norma_id === normaSel && t.modelo === modelo && (t.subproceso || t.titulo || '') === clave);
        if (cel) {
          if (Number(cel.horas_base) === horas) continue;
          await updateRow('tareas_catalogo', cel.id, { horas_base: horas });
          cambiadas.push({ ...cel, horas_base: horas });
        } else {
          const nueva = await insertRow('tareas_catalogo', {
            norma_id: normaSel, modelo, proceso: g.proceso, subproceso: g.subproceso,
            titulo: `${normaSel} - ${g.proceso} - ${g.subproceso}`, tipo: 'produccion',
            horas_base: horas, orden: g.orden,
          });
          if (nueva) cambiadas.push(nueva);
        }
      }

      // Replanificar los proyectos abiertos.
      let nTareas = 0; const proyectosTocados = new Set();
      if (cambiadas.length) {
        const [todas, proyectos, consultores] = await Promise.all([
          listTable('cliente_tareas'), listTable('proyectos_cliente').catch(() => []), listTable('consultores').catch(() => []),
        ]);
        const abiertos = new Set(proyectos
          .filter((p) => !['cerrado', 'cancelado', 'finalizado'].includes(String(p.estado || '').toLowerCase()))
          .map((p) => String(p.id)));
        for (const cat of cambiadas) {
          const horas = Number(cat.horas_base) || 0;
          const afectadas = todas.filter((ct) =>
            ct.proyecto_id && abiertos.has(String(ct.proyecto_id))
            && !ct.hecha && !ct.editada_manual && !ct.integrada
            && (String(ct.catalogo_id || '') === String(cat.id)
              || (ct.norma_id === cat.norma_id && mismoModelo(ct.modelo, cat.modelo) && (ct.subproceso || '') === (cat.subproceso || '')))
            && Number(ct.horas) !== horas);
          for (const ct of afectadas) {
            await updateRow('cliente_tareas', ct.id, { horas });
            try { await sincronizarTareaAgenda({ ...ct, horas }, ct.consultor_id, consultores); } catch { /* noop */ }
            nTareas++; proyectosTocados.add(String(ct.proyecto_id));
          }
        }
      }

      await cargar();
      setEdits({}); setManual(new Set());
      setMsg(cambiadas.length
        ? `${cambiadas.length} celda(s) guardadas · ${nTareas} tarea(s) replanificadas en ${proyectosTocados.size} proyecto(s) abierto(s).`
        : 'No había cambios reales que guardar.');
    } catch (e) { setMsg(`No se pudo guardar: ${e?.message || e}`); }
    finally { setGuardando(false); }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Configuración</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">Sistemas de gestión</h1>
        <p className="mt-2 text-sm font-medium text-[#9FC0CB]">
          {puedeEditar
            ? 'Edita las horas del catálogo maestro; cada tarea muestra los modelos en columnas. Nada se guarda hasta pulsar «Guardar y replanificar»: entonces se escribe el catálogo y se actualizan las tareas de los proyectos abiertos que no se hayan ajustado a mano. Implantación se calcula como el 60 % de Implicación (al decimal por arriba) y se puede retocar.'
            : 'Catálogo maestro de tareas por norma y modelo: lo que se hace en cada proyecto y las horas que lleva. Solo lectura.'}
        </p>
        {!puedeEditar && (
          <p className="mt-2 inline-block rounded-lg bg-[#123F52] px-3 py-1.5 text-[12px] font-bold text-[#9FC0CB]">
            Estas horas fijan el precio de las ofertas, así que solo las modifica Administración.
          </p>
        )}
      </div>

      {/* Subpestañas por sistema */}
      <div className="card">
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4">
          {NORMAS.map(n => (
            <button key={n.id} onClick={() => setNormaSel(n.id)}
              className={`chip shrink-0 whitespace-nowrap border text-xs font-bold ${normaSel === n.id ? 'border-brand-orange bg-brand-orange/15 text-[#EAF4F7]' : 'border-[#1E5468] bg-[#10394A] text-[#9FC0CB]'}`}>
              {n.nombre}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <label className="label">Filtrar tareas</label>
            <input className="input !w-64" placeholder="Buscar proceso o subproceso…" value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {msg && <span className="mr-1 text-xs font-bold text-[#B9D2DA]">{msg}</span>}
            {puedeEditar && <button onClick={recalcularImplantacion} title="Implantación = 60 % de Implicación, al decimal por arriba"
              className="rounded-xl border border-[#1E5468] px-3 py-2 text-[12.5px] font-bold text-[#B9D2DA] hover:bg-[#0D3242]">Implantación = 60 % Implicación</button>}
            {puedeEditar && <button onClick={addTarea} className="rounded-xl border border-[#1E5468] px-3 py-2 text-[12.5px] font-bold text-[#B9D2DA] hover:bg-[#0D3242]">+ Añadir tarea</button>}
            {puedeEditar && hayCambios && <button onClick={descartar} disabled={guardando} className="btn-ghost !px-3 !py-2 text-[12.5px]">Descartar</button>}
            {puedeEditar && <button onClick={guardarYReplanificar} disabled={!hayCambios || guardando}
              className="btn-orange !px-4 !py-2 disabled:opacity-40">
              {guardando ? 'Guardando…' : hayCambios ? `Guardar y replanificar (${Object.keys(edits).length})` : 'Guardar y replanificar'}
            </button>}
          </div>
        </div>
      </div>

      {/* Tabla editable con 4 columnas de modelo */}
      <div className="card overflow-x-auto">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">{grupos.length} tareas · {NORMAS.find(n => n.id === normaSel)?.nombre}</p>
        </div>
        {grupos.length === 0 ? (
          <p className="text-sm font-medium text-[#7FA7B4]">Sin tareas para esta norma. Añade la primera.</p>
        ) : (
          <div className="-mx-1 overflow-x-auto px-1"><table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-[#7FA7B4]">
                <th className="py-2">Proceso</th>
                <th className="py-2">Subproceso</th>
                {MODELOS_COL.map(m => <th key={m} className="py-2 text-right px-1">{m}</th>)}
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {grupos.map((g, i) => (
                <tr key={g.subproceso + i}>
                  {/* `readOnly` en vez de `disabled`: un campo deshabilitado no
                      se puede seleccionar ni copiar, y esta pantalla se
                      consulta para saber qué toca hacer. */}
                  <td className="py-1.5 pr-2"><input className={`input !py-1 !text-xs ${!puedeEditar ? 'bg-[#0A2634] text-[#B9D2DA]' : ''}`} readOnly={!puedeEditar} value={g.proceso || ''} onChange={e => puedeEditar && editarTextoGrupo(g, 'proceso', e.target.value)} /></td>
                  <td className="py-1.5 pr-2"><input className={`input !py-1 !text-xs ${!puedeEditar ? 'bg-[#0A2634] text-[#B9D2DA]' : ''}`} readOnly={!puedeEditar} value={g.subproceso || ''} onChange={e => puedeEditar && editarTextoGrupo(g, 'subproceso', e.target.value)} /></td>
                  {MODELOS_COL.map(m => {
                    const editada = kDe(g, m) in edits;
                    const v = horasDe(g, m);
                    return (
                      <td key={m} className="py-1.5 px-1 text-right">
                        <input type="number" min="0" step="0.1"
                          className={`input !py-1 !text-xs !w-20 text-right ${!puedeEditar ? 'bg-[#0A2634] text-[#B9D2DA]' : ''} ${editada ? '!border-brand-orange bg-brand-orange/10' : ''}`}
                          readOnly={!puedeEditar}
                          value={v ?? ''}
                          placeholder="0"
                          title={editada ? `Sin guardar (antes ${g.porModelo[m]?.horas ?? '—'})` : m === 'Implantación' ? '60 % de Implicación, editable' : ''}
                          onChange={e => puedeEditar && editarCelda(g, m, e.target.value)} />
                      </td>
                    );
                  })}
                  <td className="py-1.5 text-right">
                    {puedeEditar && (
                      <button onClick={() => quitarGrupo(g)} className="text-xs font-bold text-red-500 hover:underline">×</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#1E5468] font-bold text-[#EAF4F7]">
                <td className="py-2" colSpan={2}>Total</td>
                {MODELOS_COL.map(m => <td key={m} className="py-2 px-1 text-right">{fmtH(totales[m])} h</td>)}
                <td></td>
              </tr>
            </tfoot>
          </table></div>
        )}
      </div>
    </div>
  );
}
