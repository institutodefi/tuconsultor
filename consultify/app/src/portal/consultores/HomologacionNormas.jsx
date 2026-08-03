import { useCallback, useEffect, useMemo, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow } from '../../lib/data.js';
import { supabase, DEMO } from '../../lib/supabase.js';

// ════════════════════════════════════════════════════════════════════════════
// HOMOLOGACIÓN DE PROVEEDORES, NORMA A NORMA
//
// Un proveedor no se homologa «en general»: se homologa PARA una norma. Lo que
// la 9001 exige a un proveedor no es lo que exige la 45001, y uno puede cumplir
// para una y no para la otra.
//
// Las condiciones se escriben a mano. Un catálogo cerrado obligaría a usar
// condiciones que no son las de esta organización, y entonces se rellenan por
// cumplir. Se ofrecen sugerencias, pero se pueden ignorar.
// ════════════════════════════════════════════════════════════════════════════

const NORMAS = [
  { id: '9001',  etq: 'ISO 9001',  desc: 'Calidad' },
  { id: '14001', etq: 'ISO 14001', desc: 'Medio ambiente' },
  { id: '27001', etq: 'ISO 27001', desc: 'Seguridad de la información' },
  { id: '45001', etq: 'ISO 45001', desc: 'Seguridad y salud laboral' },
];

// Sugerencias por norma. Son un punto de partida, no una obligación.
const SUGERENCIAS = {
  '9001': ['Certificado ISO 9001 en vigor', 'Evaluación de desempeño del último año', 'Procedimiento de gestión de no conformidades'],
  '14001': ['Certificado ISO 14001 en vigor', 'Autorización de gestor de residuos', 'Declaración de aspectos ambientales'],
  '27001': ['Certificado ISO 27001 en vigor', 'Acuerdo de confidencialidad firmado', 'Encargo de tratamiento del artículo 28 RGPD'],
  '45001': ['Certificado ISO 45001 o plan de prevención', 'Seguro de responsabilidad civil en vigor', 'Formación en PRL del personal que accede', 'Certificado de estar al corriente con la Seguridad Social'],
};

const ESTADOS = {
  pendiente:    { etq: 'Pendiente',    tono: 'bg-white/8 text-[#9FC0CB]' },
  homologado:   { etq: 'Homologado',   tono: 'bg-emerald-500/15 text-emerald-300' },
  condicionado: { etq: 'Condicionado', tono: 'bg-brand-orange/15 text-brand-orange' },
  rechazado:    { etq: 'Rechazado',    tono: 'bg-red-500/15 text-red-300' },
  caducado:     { etq: 'Caducado',     tono: 'bg-red-500/15 text-red-300' },
};

const fmt = (iso) => iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES') : '—';
const caducado = (iso) => iso && new Date(`${String(iso).slice(0, 10)}T00:00:00`) < new Date(new Date().toDateString());

export default function HomologacionNormas({ empresa, puedeEditar }) {
  const [homs, setHoms] = useState([]);
  const [conds, setConds] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [abierta, setAbierta] = useState(null);
  const [nueva, setNueva] = useState('');
  const [nuevaObl, setNuevaObl] = useState(true);
  const [msg, setMsg] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const cargar = useCallback(() => {
    if (!empresa?.id) { setCargando(false); return Promise.resolve(); }
    return Promise.all([
      listTable('homologaciones_norma').catch(() => []),
      listTable('homologacion_condiciones').catch(() => []),
      listTable('homologacion_archivos').catch(() => []),
    ]).then(([h, c, a]) => {
      setHoms((h || []).filter((x) => String(x.empresa_id) === String(empresa.id)));
      setConds(c || []); setArchivos(a || []);
    }).finally(() => setCargando(false));
  }, [empresa?.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const condsDe = (hid) => conds.filter((c) => String(c.homologacion_id) === String(hid))
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const archivosDe = (hid) => archivos.filter((a) => String(a.homologacion_id) === String(hid));

  /** El estado NO se teclea: sale de las condiciones. Marcar «homologado» con
   *  obligatorias sin cumplir haría que el papel dijera una cosa y los hechos otra. */
  const estadoDe = useCallback((h) => {
    const cs = condsDe(h.id);
    const obl = cs.filter((c) => c.obligatoria);
    const oblOk = obl.filter((c) => c.cumplida);
    const hayCaducado = archivosDe(h.id).some((a) => caducado(a.caduca));
    if (h.hasta && caducado(h.hasta)) return 'caducado';
    if (h.estado === 'rechazado') return 'rechazado';
    if (hayCaducado) return 'condicionado';
    if (!obl.length) return 'pendiente';
    if (oblOk.length < obl.length) return 'pendiente';
    return cs.every((c) => c.cumplida) ? 'homologado' : 'condicionado';
  }, [conds, archivos]);

  async function crearHomologacion(norma) {
    try {
      const h = await insertRow('homologaciones_norma', { empresa_id: empresa.id, norma, estado: 'pendiente' });
      // Las sugerencias entran como condiciones, editables y borrables.
      for (const [i, t] of (SUGERENCIAS[norma] || []).entries()) {
        await insertRow('homologacion_condiciones', {
          homologacion_id: h.id, texto: t, obligatoria: i === 0, orden: (i + 1) * 10,
        });
      }
      await cargar(); setAbierta(h.id);
    } catch (e) { setMsg({ err: true, t: `No se pudo abrir: ${e?.message || e}` }); }
  }

  async function anadirCondicion(hid) {
    const t = nueva.trim();
    if (t.length < 3) { setMsg({ err: true, t: 'La condición tiene que decir algo.' }); return; }
    try {
      await insertRow('homologacion_condiciones', {
        homologacion_id: hid, texto: t, obligatoria: nuevaObl,
        orden: (condsDe(hid).length + 1) * 10,
      });
      setNueva(''); setMsg(null); await cargar();
    } catch (e) { setMsg({ err: true, t: `No se pudo añadir: ${e?.message || e}` }); }
  }

  const marcar = async (c) => {
    try {
      await updateRow('homologacion_condiciones', c.id, {
        cumplida: !c.cumplida, cumplida_en: !c.cumplida ? new Date().toISOString() : null,
      });
      await cargar();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  };

  /** Obligatoria ⇄ opcional. Cambia el estado de la homologación al vuelo. */
  const alternarObligatoria = async (c) => {
    try { await updateRow('homologacion_condiciones', c.id, { obligatoria: !c.obligatoria }); await cargar(); }
    catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
  };

  const quitar = async (c) => { try { await deleteRow('homologacion_condiciones', c.id); await cargar(); } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); } };

  async function subir(hid, condId, file, caduca) {
    if (!file) return;
    setSubiendo(true); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: 'En modo demostración no se sube.' }); return; }
      const ruta = `homologacion/${empresa.id}/${hid}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, '_')}`;
      const { error } = await supabase.storage.from('documentos').upload(ruta, file, { upsert: true });
      if (error) throw error;
      await insertRow('homologacion_archivos', {
        homologacion_id: hid, condicion_id: condId || null,
        nombre: file.name, ruta, tamano: file.size,
        tipo: /certificad/i.test(file.name) ? 'certificado' : 'otro',
        caduca: caduca || null,
      });
      await cargar();
      setMsg({ err: false, t: `«${file.name}» subido.` });
    } catch (e) {
      setMsg({ err: true, t: `No se pudo subir: ${e?.message || e}` });
    } finally { setSubiendo(false); }
  }

  const urlDe = (ruta) => {
    try { return supabase.storage.from('documentos').getPublicUrl(ruta).data.publicUrl; }
    catch { return null; }
  };

  if (!empresa?.id) return (
    <p className="text-[12.5px] text-[#7FA7B4]">Guarda la empresa antes de homologarla.</p>
  );
  if (cargando) return <p className="text-[12.5px] text-[#9FC0CB]">Cargando homologaciones…</p>;

  const sinAbrir = NORMAS.filter((n) => !homs.some((h) => h.norma === n.id));

  return (
    <div className="space-y-3">
      <p className="text-[11.5px] leading-relaxed text-[#7FA7B4]">
        Cada norma se homologa por separado: lo que la 9001 exige a un proveedor no es lo que exige
        la 45001. El estado sale de las condiciones, no se teclea.
      </p>

      {msg && (
        <p role={msg.err ? 'alert' : 'status'}
          className={`rounded-lg px-3 py-2 text-[12px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
          {msg.t}
        </p>
      )}

      {/* Normas ya abiertas */}
      {homs.map((h) => {
        const est = estadoDe(h);
        const info = ESTADOS[est] || ESTADOS.pendiente;
        const cs = condsDe(h.id);
        const as = archivosDe(h.id);
        const norma = NORMAS.find((n) => n.id === h.norma);
        const abierto = abierta === h.id;
        return (
          <section key={h.id} className="rounded-xl border border-[#1E5468] bg-[#0D3242]">
            <button onClick={() => setAbierta(abierto ? null : h.id)}
              className="flex w-full flex-wrap items-center gap-2 px-3 py-2.5 text-left">
              <span className="text-[13.5px] font-extrabold text-[#EAF4F7]">{norma?.etq || h.norma}</span>
              <span className="text-[11px] text-[#7FA7B4]">{norma?.desc}</span>
              <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${info.tono}`}>{info.etq}</span>
              <span className="ml-auto text-[11.5px] text-[#9FC0CB]">
                {cs.filter((c) => c.cumplida).length}/{cs.length} condiciones
                {as.length ? ` · ${as.length} archivo${as.length === 1 ? '' : 's'}` : ''}
              </span>
              <span className="text-[#7FA7B4]">{abierto ? '▲' : '▼'}</span>
            </button>

            {abierto && (
              <div className="space-y-3 border-t border-[#1E5468] px-3 py-3">
                <ul className="space-y-1.5">
                  {cs.map((c) => {
                    const suyos = archivos.filter((a) => String(a.condicion_id) === String(c.id));
                    return (
                      <li key={c.id} className="rounded-lg bg-[#10394A] px-2.5 py-2">
                        <div className="flex flex-wrap items-start gap-2">
                          <button onClick={() => puedeEditar && marcar(c)} disabled={!puedeEditar}
                            className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-[1.5px] text-[10px] font-bold ${
                              c.cumplida ? 'border-brand-verde bg-brand-verde text-[#061F2B]' : 'border-[#3F7D93]'}`}
                            aria-label={c.cumplida ? 'Cumplida' : 'Sin cumplir'}>
                            {c.cumplida ? '✓' : ''}
                          </button>
                          <span className="min-w-0 flex-1">
                            {/* Sin tachar: una condición cumplida sigue siendo
                                parte del expediente y hay que poder leerla. */}
                            <span className="block text-[12.5px] text-[#EAF4F7]">{c.texto}</span>
                            <span className="flex flex-wrap items-center gap-2">
                              {/* Obligatoria u opcional se cambia aquí: es una
                                  decisión de cada organización, no del catálogo. */}
                              <button type="button" disabled={!puedeEditar}
                                onClick={() => alternarObligatoria(c)}
                                title="Cambiar entre obligatoria y opcional"
                                className={`text-[10px] font-bold transition ${
                                  c.obligatoria ? 'text-brand-orange hover:text-brand-orange/70' : 'text-[#7FA7B4] hover:text-[#9FC0CB]'}`}>
                                {c.obligatoria ? 'obligatoria' : 'opcional'}
                              </button>
                              {c.cumplida && (
                                <span className="text-[10px] font-bold text-brand-verdeTexto">
                                  ✓ cumplida{c.cumplida_en ? ` · ${fmt(c.cumplida_en)}` : ''}
                                </span>
                              )}
                            </span>
                            {suyos.map((a) => (
                              <a key={a.id} href={urlDe(a.ruta)} target="_blank" rel="noopener"
                                className={`ml-2 text-[10.5px] font-bold hover:underline ${
                                  caducado(a.caduca) ? 'text-red-300' : 'text-brand-orange'}`}>
                                📎 {a.nombre}{a.caduca ? ` (${caducado(a.caduca) ? 'CADUCADO ' : 'vence '}${fmt(a.caduca)})` : ''}
                              </a>
                            ))}
                          </span>
                          {puedeEditar && (
                            <>
                              <label className="cursor-pointer text-[11px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">
                                + Archivo
                                <input type="file" className="hidden"
                                  onChange={(e) => subir(h.id, c.id, e.target.files?.[0])} />
                              </label>
                              <button onClick={() => quitar(c)} className="text-[11px] font-bold text-red-300 hover:text-red-200">Quitar</button>
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {!cs.length && <li className="py-2 text-center text-[12px] text-[#7FA7B4]">Sin condiciones todavía.</li>}
                </ul>

                {puedeEditar && (
                  <div className="flex flex-wrap gap-2">
                    <input className="input !py-1.5 !text-[13px] flex-1" placeholder="Escribe una condición…"
                      value={abierta === h.id ? nueva : ''} onChange={(e) => setNueva(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && anadirCondicion(h.id)} />
                    <button type="button" onClick={() => setNuevaObl((v) => !v)}
                      title="Obligatoria: sin ella no se homologa. Opcional: suma, pero no bloquea."
                      className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] font-bold transition ${
                        nuevaObl ? 'border-brand-orange text-brand-orange' : 'border-[#1E5468] text-[#7FA7B4]'}`}>
                      {nuevaObl ? 'obligatoria' : 'opcional'}
                    </button>
                    <button onClick={() => anadirCondicion(h.id)} className="btn-ghost !px-3 !py-1.5 text-xs">Añadir</button>
                    <label className="btn-ghost cursor-pointer !px-3 !py-1.5 text-xs">
                      {subiendo ? 'Subiendo…' : '+ Archivo general'}
                      <input type="file" className="hidden" disabled={subiendo}
                        onChange={(e) => subir(h.id, null, e.target.files?.[0])} />
                    </label>
                  </div>
                )}

                {as.filter((a) => !a.condicion_id).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {as.filter((a) => !a.condicion_id).map((a) => (
                      <a key={a.id} href={urlDe(a.ruta)} target="_blank" rel="noopener"
                        className={`chip !px-2 !py-0.5 text-[10.5px] font-bold ${
                          caducado(a.caduca) ? 'bg-red-500/15 text-red-300' : 'bg-white/8 text-[#9FC0CB]'}`}>
                        📎 {a.nombre}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })}

      {/* Normas por abrir */}
      {puedeEditar && sinAbrir.length > 0 && (
        <div>
          <p className="label !mb-1.5">Abrir homologación para</p>
          <div className="flex flex-wrap gap-1.5">
            {sinAbrir.map((n) => (
              <button key={n.id} onClick={() => crearHomologacion(n.id)}
                className="rounded-lg border border-[#1E5468] px-3 py-1.5 text-[12px] font-bold text-[#9FC0CB] transition hover:border-brand-orange hover:text-brand-orange">
                + {n.etq}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
