import { useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import TextoPoliticas from '../components/TextoPoliticas.jsx';

// Gate que se muestra en el primer login: el usuario debe aceptar las políticas
// de seguridad y confidencialidad antes de poder usar el portal.
export default function GatePoliticas() {
  const { aceptarPoliticas } = useAuth();
  const [marcado, setMarcado] = useState(false);
  const [busy, setBusy] = useState(false);

  async function aceptar() {
    if (!marcado) return;
    setBusy(true);
    await aceptarPoliticas();
    // el estado politicasOk pasa a true → el portal se desbloquea solo
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-[#10394A] shadow-2xl">
        <div className="bg-navy-900 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-orange">Antes de empezar</p>
          <h1 className="mt-1 text-xl font-extrabold text-white">Políticas de seguridad, confidencialidad y herramientas</h1>
        </div>

        <div className="max-h-[52vh] space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-[#B9D2DA]">
          <p>Como miembro del equipo de Consultify, al acceder a la plataforma aceptas cumplir las siguientes obligaciones de seguridad, confidencialidad y uso de las herramientas:</p>
          <TextoPoliticas compacto />
          <p className="text-xs text-[#9FC0CB]">La aceptación queda registrada con fecha y hora. Estas políticas quedan siempre a mano en Organización → Políticas y avisos. Si tienes dudas, consulta con la dirección antes de continuar.</p>
        </div>

        <div className="border-t border-[#1E5468] px-6 py-5">
          <label className="flex cursor-pointer items-start gap-3">
            <input type="checkbox" checked={marcado} onChange={e => setMarcado(e.target.checked)} className="mt-0.5 h-5 w-5 rounded border-[#2A6480] text-brand-orange" />
            <span className="text-sm font-semibold text-[#CFE3E9]">He leído y acepto las políticas de seguridad y confidencialidad de Consultify.</span>
          </label>
          <button onClick={aceptar} disabled={!marcado || busy} className="btn-primary mt-4 w-full disabled:opacity-40">
            {busy ? 'Guardando…' : 'Aceptar y continuar'}
          </button>
        </div>
      </div>
    </div>
  );
}
