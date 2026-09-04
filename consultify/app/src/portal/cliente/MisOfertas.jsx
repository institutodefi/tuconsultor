import { useState } from 'react';
import { supabase, DEMO } from '../../lib/supabase.js';
import { LEYENDA_IMPUESTOS, SUFIJO_SIN_IMPUESTOS } from '../../lib/impuestos.js';

// ════════════════════════════════════════════════════════════════════════════
// MIS PROPUESTAS · el cliente acepta o rechaza
//
// Aceptar desde aquí es lo que dispara el contrato. Rechazar exige motivo, y no
// por incordiar: es lo único que después permite saber por qué se pierden
// propuestas. Se le pregunta con respeto y se le deja escribir libremente.
//
// Los dos botones tienen el mismo peso visual. Si rechazar cuesta más que
// aceptar, la decisión deja de ser libre.
// ════════════════════════════════════════════════════════════════════════════

const eur = (n) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

const ESTADO = {
  emitida:   { etq: 'Pendiente de tu respuesta', tono: 'bg-brand-orange/15 text-brand-orange' },
  aceptada:  { etq: 'Aceptada', tono: 'bg-emerald-500/15 text-emerald-300' },
  rechazada: { etq: 'Rechazada', tono: 'bg-red-500/15 text-red-300' },
  caducada:  { etq: 'Caducada', tono: 'bg-white/8 text-[#9FC0CB]' },
  borrador:  { etq: 'En preparación', tono: 'bg-white/8 text-[#9FC0CB]' },
};

export default function MisOfertas({ ofertas, contratos = [], onCambio }) {
  const [rechazando, setRechazando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  async function cambiar(oferta, estado, porQue) {
    setOcupado(oferta.id); setMsg(null);
    try {
      if (DEMO) { setMsg({ err: false, t: 'En modo demostración no se guarda.' }); return; }
      const { data, error } = await supabase.rpc('cambiar_estado_oferta', {
        p_id: oferta.id, p_estado: estado, p_motivo: porQue || null, p_actor: 'cliente',
      });
      if (error) throw error;
      if (data && data.ok === false) throw new Error(data.error);
      setRechazando(null); setMotivo('');
      setMsg({ err: false, t: estado === 'aceptada'
        ? 'Propuesta aceptada. Nos ponemos en marcha y te escribimos con los siguientes pasos.'
        : 'Gracias por decírnoslo. Lo tendremos en cuenta.' });
      onCambio && onCambio();
    } catch (e) {
      setMsg({ err: true, t: `No se pudo registrar: ${e?.message || e}` });
    } finally { setOcupado(null); }
  }

  if (!ofertas?.length) return (
    <section className="card">
      <p className="text-[13px] text-[#9FC0CB]">Todavía no tienes ninguna propuesta.</p>
    </section>
  );

  return (
    <div className="space-y-3">
      {msg && (
        <p role={msg.err ? 'alert' : 'status'}
          className={`rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>
          {msg.t}
        </p>
      )}

      {ofertas.map((o) => {
        const est = ESTADO[o.estado || 'emitida'] || ESTADO.emitida;
        const decidible = (o.estado || 'emitida') === 'emitida';
        return (
          <section key={o.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13.5px] font-extrabold text-[#EAF4F7]">{o.numero_oferta || 'Propuesta'}</p>
                <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">
                  {o.modelo}{o.creado ? ` · ${new Date(o.creado).toLocaleDateString('es-ES')}` : ''}
                </p>
              </div>
              <span className={`chip !px-2.5 !py-0.5 text-[10.5px] font-extrabold ${est.tono}`}>{est.etq}</span>
            </div>

            <p className="mt-2 text-xl font-extrabold text-[#EAF4F7]">
              {eur(o.precio)}
              <span className="ml-1 text-[12px] font-bold text-[#7FA7B4]">
                {o.tipo === 'mes' ? `/mes · ${SUFIJO_SIN_IMPUESTOS}` : SUFIJO_SIN_IMPUESTOS}
              </span>
            </p>
            <p className="mt-1 text-[11px] text-[#7FA7B4]">{LEYENDA_IMPUESTOS}</p>

            {o.notas_oferta && (
              <p className="mt-2 whitespace-pre-line rounded-lg bg-[#0D3242] px-3 py-2 text-[12px] leading-relaxed text-[#B9D2DA]">
                {o.notas_oferta}
              </p>
            )}

            {/* El contrato, cuando lo hay. Es el documento que se firma, así
                que se enseña aparte y con más peso que la propuesta. */}
            {(() => {
              const c = contratos.find((x) => String(x.presupuesto_id) === String(o.id) && x.estado !== 'anulado');
              if (!c) return null;
              return (
                <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2">
                  <p className="text-[12.5px] font-extrabold text-emerald-300">
                    Contrato {c.numero}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#9FC0CB]">
                    {c.estado === 'firmado' ? 'Firmado' : 'Pendiente de firma'}
                    {c.fecha_contrato ? ` · ${new Date(c.fecha_contrato).toLocaleDateString('es-ES')}` : ''}
                  </p>
                  {c.url_pdf ? (
                    <a href={c.url_pdf} target="_blank" rel="noopener"
                      className="btn-ghost mt-2 inline-flex !px-3 !py-1 text-[11.5px]">Ver el contrato</a>
                  ) : (
                    <p className="mt-1 text-[11px] text-[#7FA7B4]">
                      Estamos preparando el documento. Te avisamos en cuanto esté.
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="mt-3 flex flex-wrap gap-2">
              {o.url_pdf && (
                <a href={o.url_pdf} target="_blank" rel="noopener" className="btn-ghost !px-3 !py-1.5 text-xs">Ver la propuesta (PDF)</a>
              )}
              {o.url_pptx && (
                <a href={o.url_pptx} target="_blank" rel="noopener" className="btn-ghost !px-3 !py-1.5 text-xs">Presentación</a>
              )}
            </div>

            {decidible && rechazando !== o.id && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#153F52] pt-3">
                <button onClick={() => cambiar(o, 'aceptada')} disabled={ocupado === o.id}
                  className="btn-orange !px-4 !py-1.5 text-xs disabled:opacity-50">
                  {ocupado === o.id ? 'Un momento…' : 'Aceptar la propuesta'}
                </button>
                <button onClick={() => { setRechazando(o.id); setMotivo(''); }}
                  className="btn-ghost !px-4 !py-1.5 text-xs">No me encaja</button>
              </div>
            )}

            {rechazando === o.id && (
              <div className="mt-3 space-y-2 border-t border-[#153F52] pt-3">
                <label className="label" htmlFor={`mot-${o.id}`}>¿Qué no te encaja?</label>
                <textarea id={`mot-${o.id}`} rows={3} className="input !py-1.5 !text-[13px]"
                  value={motivo} onChange={(e) => setMotivo(e.target.value)}
                  placeholder="El precio, el plazo, el alcance… Nos ayuda a mejorar la próxima." />
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => cambiar(o, 'rechazada', motivo)}
                    disabled={motivo.trim().length < 5 || ocupado === o.id}
                    className="btn-ghost !px-4 !py-1.5 text-xs disabled:opacity-40">Enviar y rechazar</button>
                  <button onClick={() => setRechazando(null)} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
                </div>
              </div>
            )}

            {o.estado === 'rechazada' && o.motivo_rechazo && (
              <p className="mt-2 text-[11.5px] italic text-[#7FA7B4]">Motivo: {o.motivo_rechazo}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
