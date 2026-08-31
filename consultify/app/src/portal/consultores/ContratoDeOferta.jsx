import { useState } from 'react';
import { supabase, DEMO } from '../../lib/supabase.js';
import { codigoProyecto } from '../../lib/codigos.js';
import { updateRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';

// ════════════════════════════════════════════════════════════════════════════
// DEL CONTRATO AL PROYECTO
//
// El proyecto SIEMPRE nace de un contrato, nunca suelto. Así se puede rastrear
// cualquier acceso hasta lo que se firmó: proyecto → contrato → oferta.
//
// Aquí se hacen las dos cosas seguidas: generar el contrato de una oferta
// aceptada, y dar de alta el proyecto con los productos que le correspondan.
// ════════════════════════════════════════════════════════════════════════════

const PRODUCTOS = [
  { id: 'mstool', etq: 'Orbita.MSTool', desc: 'Sistema de gestión: procesos, documentación, auditorías' },
  { id: 'tptool', etq: 'Orbita.TPTool', desc: 'Proyectos de transformación: fases, hitos, entregables' },
];

export default function ContratoDeOferta({ oferta, contrato, onCambio }) {
  // `user` para dejar constancia de quién da la oferta por aceptada.
  const { user } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [previa, setPrevia] = useState(false);
  const [productos, setProductos] = useState(['mstool']);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  // ── El flujo del alta, en el orden que se decide ──
  // 1º el MODELO y la FECHA LÍMITE: gobiernan todo lo demás.
  // 2º las NORMAS, todas desmarcables — la 9001 incluida. Venía obligada y un
  //    proyecto de solo 27001, por ejemplo, es perfectamente legítimo.
  const [modelo, setModelo] = useState(oferta.modelo === 'apoyo' ? 'apoyo'
    : ['relacion','implicacion','compromiso'].includes(oferta.modelo) ? 'relacion' : 'implantacion');
  const [fechaLimite, setFechaLimite] = useState(oferta.fecha_certificacion || '');
  const [normas, setNormas] = useState((oferta.normas || []).map(String));
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const sugerido = codigoProyecto({
    cliente: oferta.empresa, anio: new Date(oferta.creado || Date.now()).getFullYear(),
    modelo: oferta.modelo, normas: oferta.normas || [],
  });

  async function generarContrato() {
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: 'En modo demostración no se genera de verdad.' }); return; }
      const r = await fetch('/api/generar-contrato', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto_id: oferta.id }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'No se pudo generar.');
      // Si el PDF no se guardó, hay que decirlo: un contrato sin documento no
      // se puede firmar, y creer que está hecho es peor que saber que falta.
      setMsg(j.aviso
        ? { err: true, t: j.aviso }
        : { err: false, t: `Contrato ${j.numero} ${j.ya_existia ? 'ya existía' : 'generado'}.` });
      onCambio && onCambio();
    } catch (e) {
      setMsg({ err: true, t: `${e?.message || e}` });
    } finally { setOcupado(false); }
  }

  /** Rehace el PDF. Sale idéntico: los datos están congelados en el contrato. */
  async function regenerarPdf() {
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: 'En modo demostración no se regenera.' }); return; }
      const r = await fetch('/api/generar-contrato', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contrato_id: contrato.id, regenerar: true }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'No se pudo regenerar.');
      setMsg({ err: false, t: 'PDF rehecho.' });
      setPrevia(true);
      onCambio && onCambio();
    } catch (e) { setMsg({ err: true, t: `${e?.message || e}` }); }
    finally { setOcupado(false); }
  }

  async function crearProyecto() {
    if (!productos.length) { setMsg({ err: true, t: 'Elige al menos una herramienta.' }); return; }
    // El código es obligatorio: la base lo exige y es lo que identifica el
    // proyecto en todo lo demás. Se propone, pero tiene que haber uno.
    if (!codigo.trim()) { setMsg({ err: true, t: 'El código del proyecto es obligatorio.' }); return; }
    setOcupado(true); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: 'En modo demostración no se da de alta.' }); return; }
      if (!fechaLimite) throw new Error('Falta la fecha límite: es la que gobierna los avisos de 30/60/90 días.');
      if (!normas.length) throw new Error('Elige al menos una norma: cada una será un contexto de trabajo.');
      const { data, error } = await supabase.rpc('activar_productos_contrato', {
        p_contrato_id: contrato.id,
        p_productos: productos,
        p_nombre_proyecto: nombre.trim() || null,
        p_codigo: codigo.trim(),
      });
      if (error) throw error;
      if (data?.ok === false) throw new Error(data.error);

      // El modelo y la fecha límite, del flujo nuevo (v90)
      const pid = data?.proyecto_id;
      if (pid) {
        await supabase.from('proyectos_cliente')
          .update({ modelo, fecha_limite: fechaLimite }).eq('id', pid);
        // Un CONTEXTO por norma: tres sistemas son tres contextos, y las
        // tareas de cada uno se programan por separado. Nunca se integra.
        for (const n of normas) {
          await supabase.from('proyecto_contextos')
            .insert({ proyecto_id: pid, norma: String(n) })
            .then(() => {}, () => {});   // si ya existía, se sigue
        }
      }
      setMsg({ err: false, t: `Proyecto dado de alta con ${productos.length === 2 ? 'las dos herramientas' : PRODUCTOS.find((x) => x.id === productos[0])?.etq}.` });
      setAbierto(false);
      onCambio && onCambio();
    } catch (e) {
      setMsg({ err: true, t: `No se pudo dar de alta: ${e?.message || e}` });
    } finally { setOcupado(false); }
  }

  // ── Aceptar la oferta por indicación del cliente ──
  // El cliente casi nunca acepta pulsando un botón: lo dice por teléfono, por
  // correo o en una reunión. Sin esta acción, una oferta aceptada de verdad se
  // quedaba en «emitida» para siempre y no había forma de generar su contrato
  // ni de abrir el proyecto. Se registra QUIÉN y CUÁNDO la dio por aceptada,
  // porque es una afirmación sobre la voluntad de un tercero.
  async function aceptar() {
    if (!window.confirm(
      `¿Confirmas que ${oferta.empresa} ha aceptado la oferta ${oferta.numero_oferta || ''}?\n\n`
      + 'Queda registrado que la das por aceptada tú, con la fecha de hoy.')) return;
    setOcupado(true); setMsg(null);
    try {
      await updateRow('presupuestos', oferta.id, {
        estado: 'aceptada',
        aceptada_en: new Date().toISOString(),
        aceptada_por: user?.id || null,
      });
      setMsg({ err: false, t: 'Oferta marcada como aceptada. Ya puedes generar el contrato.' });
      onCambio && onCambio();
    } catch (e) {
      setMsg({ err: true, t: `No se pudo marcar como aceptada: ${e?.message || e}` });
    } finally { setOcupado(false); }
  }

  async function revertirAceptacion() {
    if (!window.confirm('¿Devolver la oferta a «emitida»? Solo si se marcó por error.')) return;
    setOcupado(true);
    try {
      await updateRow('presupuestos', oferta.id,
        { estado: 'emitida', aceptada_en: null, aceptada_por: null });
      onCambio && onCambio();
    } catch (e) {
      setMsg({ err: true, t: `${e?.message || e}` });
    } finally { setOcupado(false); }
  }

  if (!contrato) {
    const estado = oferta.estado || 'emitida';

    // Una oferta rechazada o anulada no se acepta desde aquí: si el cliente
    // cambió de opinión, lo limpio es emitir una nueva.
    if (['rechazada', 'anulada', 'caducada'].includes(estado)) return null;

    if (estado !== 'aceptada') {
      return (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button onClick={aceptar} disabled={ocupado}
            className="rounded-full border border-emerald-400/50 px-3 py-1 text-[11.5px] font-bold text-emerald-300 transition hover:bg-emerald-500/10 disabled:opacity-50"
            title="El cliente la ha aceptado (por teléfono, correo o reunión)">
            {ocupado ? 'Guardando…' : '✓ El cliente la acepta'}
          </button>
          {msg && <span className={`text-[11.5px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</span>}
        </div>
      );
    }

    return (
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="chip !px-2 !py-0.5 bg-emerald-500/15 text-[10.5px] font-extrabold text-emerald-300">
          Aceptada{oferta.aceptada_en ? ` · ${new Date(oferta.aceptada_en).toLocaleDateString('es-ES')}` : ''}
        </span>
        <button onClick={generarContrato} disabled={ocupado}
          className="btn-orange !px-3 !py-1 text-[11.5px] disabled:opacity-50">
          {ocupado ? 'Generando…' : 'Generar contrato'}
        </button>
        <button onClick={revertirAceptacion} disabled={ocupado}
          className="text-[11px] font-bold text-[#7FA7B4] hover:text-red-300"
          title="Deshacer: la oferta vuelve a «emitida»">deshacer</button>
        {msg && <span className={`text-[11.5px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</span>}
      </div>
    );
  }

  // Ya hay contrato: se puede colgar el proyecto
  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip !px-2 !py-0.5 bg-emerald-500/15 text-[10.5px] font-extrabold text-emerald-300">
          {contrato.numero}
        </span>
        {contrato.url_pdf ? (
          <>
            <button type="button" onClick={() => setPrevia((v) => !v)}
              className="text-[11.5px] font-bold text-brand-orange hover:underline">
              {previa ? 'Cerrar vista previa' : 'Ver contrato'}
            </button>
            <a href={contrato.url_pdf} target="_blank" rel="noopener"
              className="text-[11.5px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">Abrir aparte</a>
          </>
        ) : (
          <span className="text-[11.5px] font-bold text-red-300">Sin PDF</span>
        )}
        <button type="button" onClick={regenerarPdf} disabled={ocupado}
          className="text-[11.5px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7] disabled:opacity-50"
          title="Rehace el PDF con lo que se congeló al firmar: sale idéntico">
          {ocupado ? 'Rehaciendo…' : '↻ Regenerar PDF'}
        </button>
        <button onClick={() => { setAbierto((v) => !v); setNombre(nombre || contrato.objeto || sugerido); setCodigo(codigo || sugerido); }}
          className="text-[11.5px] font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">
          {abierto ? 'Cancelar' : '+ Dar de alta el proyecto'}
        </button>
      </div>

      {/* Vista previa aquí mismo: abrir el PDF en otra pestaña para comprobar
          una cifra obliga a saltar de contexto cada vez. */}
      {previa && contrato.url_pdf && (
        <div className="overflow-hidden rounded-xl border border-[#1E5468]">
          <iframe src={`${contrato.url_pdf}#view=FitH`} title={`Contrato ${contrato.numero}`}
            className="h-[520px] w-full bg-white" />
        </div>
      )}

      {abierto && (
        <div className="rounded-xl bg-[#0D3242] p-3">
          <label className="label" htmlFor={`np-${oferta.id}`}>Nombre del proyecto</label>
          <input id={`np-${oferta.id}`} className="input !py-1.5 !text-[13px]" value={nombre}
            onChange={(e) => setNombre(e.target.value)} />
          <label className="label mt-3" htmlFor={`cp-${oferta.id}`}>
            Código del proyecto <span className="text-brand-orange">*</span>
          </label>
          <input id={`cp-${oferta.id}`} className="input !py-1.5 !text-[13px] font-mono" value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
          <p className="mt-1 text-[11px] leading-snug text-[#7FA7B4]">
            Cliente · año · servicio · normas. Se propone {sugerido === codigo ? 'éste' : <><code className="text-[#9FC0CB]">{sugerido}</code></>};
            puedes cambiarlo, pero no puede repetirse.
          </p>

          <p className="label !mb-1.5 mt-3">Herramientas que se le abren</p>
          <div className="space-y-1.5">
            {PRODUCTOS.map((pr) => {
              const on = productos.includes(pr.id);
              return (
                <button key={pr.id} type="button"
                  onClick={() => setProductos(on ? productos.filter((x) => x !== pr.id) : [...productos, pr.id])}
                  className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                    on ? 'border-brand-verde bg-brand-verde/12' : 'border-[#1E5468] hover:border-brand-verde/50'}`}>
                  <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border-[1.5px] text-[10px] font-bold ${
                    on ? 'border-brand-verde bg-brand-verde text-[#061F2B]' : 'border-[#3F7D93]'}`}>{on ? '✓' : ''}</span>
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold text-[#EAF4F7]">{pr.etq}</span>
                    <span className="block text-[11px] leading-snug text-[#7FA7B4]">{pr.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button onClick={crearProyecto} disabled={ocupado}
            className="btn-orange mt-3 !px-4 !py-1.5 text-xs disabled:opacity-50">
            {ocupado ? 'Dando de alta…' : 'Dar de alta el proyecto'}
          </button>
        </div>
      )}

      {msg && (
        <p className={`text-[11.5px] font-bold ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.t}</p>
      )}
    </div>
  );
}
