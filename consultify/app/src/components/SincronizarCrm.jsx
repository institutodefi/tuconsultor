import { useState } from 'react';
import { DEMO } from '../lib/supabase.js';

// ════════════════════════════════════════════════════════════════════════════
// LANZAR LA SINCRONIZACIÓN
//
// La función existía desde la v147 pero nada la llamaba: por eso las listas de
// Brevo seguían vacías aunque las empresas tuvieran correo. Estaba escrita y
// nunca se ejecutaba.
//
// Tres modos, y el orden importa: conviene probar primero solo Holded y mirar
// el informe antes de dejarla correr entera, porque la primera pasada puede
// tocar muchas fichas de golpe.
// ════════════════════════════════════════════════════════════════════════════

const MODOS = [
  { k: 'solo-holded', etq: 'Solo Holded', desc: 'Trae lo fiscal. No toca Brevo.' },
  { k: 'solo-brevo',  etq: 'Solo Brevo',  desc: 'Sube contactos y empresas. No toca Holded.' },
  { k: 'completo',    etq: 'Completa',    desc: 'Las dos, en los dos sentidos.' },
];

export default function SincronizarCrm() {
  const [abierto, setAbierto] = useState(false);
  const [modo, setModo] = useState('solo-holded');
  const [ocupado, setOcupado] = useState(false);
  const [res, setRes] = useState(null);

  async function lanzar() {
    setOcupado(true); setRes(null);
    try {
      if (DEMO) { setRes({ ok: false, error: 'En modo demostración no se sincroniza.' }); return; }
      const r = await fetch('/api/sincronizar-crm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modo }),
      });
      setRes(await r.json());
    } catch (e) {
      setRes({ ok: false, error: e?.message || String(e) });
    } finally { setOcupado(false); }
  }

  const inf = res?.informe;

  return (
    <div>
      <button onClick={() => setAbierto((v) => !v)} className="btn-ghost !px-3 !py-1.5 text-xs">
        ⇄ Sincronizar CRM
      </button>

      {abierto && (
        <div className="mt-2 space-y-3 rounded-xl border border-[#1E5468] bg-[#0D3242] p-3">
          <p className="text-[11.5px] leading-relaxed text-[#7FA7B4]">
            Holded manda en lo fiscal · el CRM manda en lo comercial · de Brevo solo vuelven las bajas.
          </p>

          <div className="space-y-1.5">
            {MODOS.map((m) => (
              <button key={m.k} onClick={() => setModo(m.k)}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
                  modo === m.k ? 'border-brand-orange bg-brand-orange/10' : 'border-[#1E5468] hover:border-brand-orange/50'}`}>
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-bold text-[#EAF4F7]">{m.etq}</span>
                  <span className="block text-[11px] text-[#7FA7B4]">{m.desc}</span>
                </span>
              </button>
            ))}
          </div>

          <button onClick={lanzar} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-xs disabled:opacity-50">
            {ocupado ? 'Sincronizando…' : 'Lanzar'}
          </button>

          {res && (
            <div className="space-y-2 rounded-lg bg-[#10394A] p-3">
              {res.error && <p className="text-[12px] font-bold text-red-300">{res.error}</p>}

              {inf && (
                <>
                  <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">Holded → CRM</p>
                  <p className="text-[12px] text-[#EAF4F7]">
                    {inf.holded.leidas} leídas · {inf.holded.creadas} creadas ·{' '}
                    {inf.holded.actualizadas} actualizadas · {inf.holded.sin_cambios} sin cambios
                  </p>

                  <p className="mt-2 text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">CRM → Brevo</p>
                  <p className="text-[12px] text-[#EAF4F7]">
                    {inf.brevo.subidas} contactos · {inf.brevo.empresas || 0} empresas ·{' '}
                    {inf.brevo.bajas} baja{inf.brevo.bajas === 1 ? '' : 's'} recogida{inf.brevo.bajas === 1 ? '' : 's'}
                  </p>

                  {inf.brevo.empresas_sin_correo?.length > 0 && (
                    <p className="text-[11.5px] text-brand-orange">
                      Sin correo, no subidas: {inf.brevo.empresas_sin_correo.join(' · ')}
                    </p>
                  )}

                  {inf.conflictos?.length > 0 && (
                    <>
                      <p className="mt-2 text-[10.5px] font-extrabold uppercase tracking-wide text-brand-orange">
                        Conflictos · ganó Holded
                      </p>
                      <ul className="space-y-1">
                        {inf.conflictos.map((c, i) => (
                          <li key={i} className="text-[11.5px] text-[#B9D2DA]">
                            <b className="text-[#EAF4F7]">{c.empresa}</b> — {c.campos.join(', ')}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {inf.errores?.length > 0 && (
                    <ul className="space-y-1">
                      {inf.errores.map((e, i) => (
                        <li key={i} className="text-[11.5px] font-bold text-red-300">{e}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
