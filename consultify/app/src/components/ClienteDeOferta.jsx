import { useEffect, useMemo, useState } from 'react';
import { listTable } from '../lib/data.js';
import { ROLES_CONTACTO } from '../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// A QUIÉN VA LA OFERTA
//
// Dos caminos, porque son dos situaciones distintas:
//
//   · Cliente que ya está en el CRM → se elige y se rellena solo, incluida la
//     persona de contacto. Es el caso frecuente y el que más errores daba:
//     teclear a mano el CIF de un cliente que ya tienes es pedir una errata.
//   · Cliente nuevo → el formulario de siempre, y al generar la oferta se da
//     de alta con el CIF como clave (eso ya lo hace la función desde la v67).
//
// Va en su propio componente a propósito: el generador es un archivo grande y
// meterle otro bloque dentro es como se rompen las cosas.
// ════════════════════════════════════════════════════════════════════════════

const nombreDe = (c) => [c?.nombre, c?.apellidos].filter(Boolean).join(' ').trim();

export default function ClienteDeOferta({ cli, setCli, publico = false }) {
  const [modo, setModo] = useState('nuevo');        // 'existente' | 'nuevo'
  const [empresas, setEmpresas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [busca, setBusca] = useState('');
  const [elegida, setElegida] = useState(null);
  const [cargando, setCargando] = useState(false);

  // En la calculadora pública no hay CRM que consultar.
  useEffect(() => {
    if (publico || modo !== 'existente' || empresas.length) return;
    setCargando(true);
    Promise.all([
      listTable('empresas').catch(() => []),
      listTable('contactos').catch(() => []),
      listTable('empresa_contactos').catch(() => []),
    ]).then(([e, c, v]) => {
      setEmpresas(e || []); setContactos(c || []); setVinculos(v || []);
    }).finally(() => setCargando(false));
  }, [modo, publico, empresas.length]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return empresas
      .filter((e) => e.activo !== false)
      .filter((e) => !q || [e.nombre, e.nombre_comercial, e.cif].filter(Boolean).join(' ').toLowerCase().includes(q))
      // Primero los que ya son clientes: son los que más se ofertan.
      .sort((a, b) => (b.es_cliente ? 1 : 0) - (a.es_cliente ? 1 : 0) ||
                      String(a.nombre_comercial || a.nombre).localeCompare(String(b.nombre_comercial || b.nombre)))
      .slice(0, 40);
  }, [empresas, busca]);

  const personasDe = (empresaId) => vinculos
    .filter((v) => String(v.empresa_id) === String(empresaId))
    .map((v) => ({ vinc: v, c: contactos.find((x) => String(x.id) === String(v.contacto_id)) }))
    .filter((x) => x.c);

  function elegirEmpresa(e) {
    setElegida(e);
    const personas = personasDe(e.id);
    // Se propone quien manda; si no hay, la primera con correo.
    const principal = personas.find((x) => x.vinc.principal)
      || personas.find((x) => x.vinc.rol === 'directivo')
      || personas.find((x) => x.c.email) || personas[0];
    setCli((c) => ({
      ...c,
      empresa: e.nombre_comercial || e.nombre || '',
      cif: e.cif || '',
      direccion: e.direccion || c.direccion,
      empresa_id: e.id,
      contacto: principal ? nombreDe(principal.c) : '',
      email: principal?.c?.email || '',
      telefono: principal?.c?.movil || principal?.c?.telefono || e.telefono || '',
      contacto_id: principal?.c?.id || null,
    }));
  }

  function elegirPersona(x) {
    setCli((c) => ({
      ...c,
      contacto: nombreDe(x.c),
      email: x.c.email || '',
      telefono: x.c.movil || x.c.telefono || c.telefono,
      contacto_id: x.c.id,
    }));
  }

  if (publico) return null;   // la web pública solo tiene el formulario

  return (
    <div className="mb-4 rounded-2xl border-[1.5px] border-[#1E5468] bg-[#0D3242] p-4">
      <p className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">¿Para quién es la oferta?</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {[['existente', 'Un cliente que ya tengo'], ['nuevo', 'Un cliente nuevo']].map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setModo(k); if (k === 'nuevo') { setElegida(null); } }}
            className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-bold transition ${
              modo === k ? 'border-brand-orange bg-brand-orange/20 text-brand-orange' : 'border-[#1E5468] text-[#9FC0CB] hover:border-brand-orange/60'}`}>
            {l}
          </button>
        ))}
      </div>

      {modo === 'existente' && (
        <div className="mt-3">
          <label className="label" htmlFor="co-busca">Buscar por nombre o CIF</label>
          <input id="co-busca" className="input !py-1.5 !text-[13px]" value={busca}
            onChange={(e) => setBusca(e.target.value)} placeholder="Empieza a escribir…" />

          {cargando && <p className="mt-2 text-[12px] text-[#7FA7B4]">Cargando el CRM…</p>}

          {!cargando && !elegida && (
            <ul className="mt-2 max-h-56 space-y-1 overflow-auto">
              {lista.length === 0 && (
                <li className="py-3 text-center text-[12.5px] text-[#7FA7B4]">
                  {empresas.length ? 'Ninguna empresa con ese texto.' : 'No hay empresas en el CRM todavía.'}
                </li>
              )}
              {lista.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => elegirEmpresa(e)}
                    className="flex w-full items-center gap-2 rounded-lg border border-[#1E5468] px-3 py-2 text-left hover:border-brand-orange/60">
                    {e.es_cliente && <span className="chip !px-1.5 !py-0 bg-brand-orange/15 text-[9.5px] text-brand-orange">Cliente</span>}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-[#EAF4F7]">{e.nombre_comercial || e.nombre}</span>
                      <span className="text-[11px] text-[#7FA7B4]">{e.cif || 'sin CIF'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {elegida && (
            <div className="mt-3 rounded-xl bg-[#10394A] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] font-extrabold text-[#EAF4F7]">
                  {elegida.nombre_comercial || elegida.nombre}
                  <span className="ml-2 text-[11.5px] font-bold text-[#7FA7B4]">{elegida.cif}</span>
                </p>
                <button type="button" onClick={() => { setElegida(null); setBusca(''); }}
                  className="text-[11.5px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">Cambiar</button>
              </div>

              <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">A quién se dirige</p>
              {personasDe(elegida.id).length === 0 ? (
                <p className="mt-1 text-[12px] text-brand-orange">
                  Esta empresa no tiene contactos. Escribe abajo a quién va dirigida, o añádela primero en el CRM.
                </p>
              ) : (
                <div className="mt-1 space-y-1">
                  {personasDe(elegida.id).map((x) => {
                    const sel = String(cli.contacto_id || '') === String(x.c.id);
                    return (
                      <button key={x.vinc.id} type="button" onClick={() => elegirPersona(x)} disabled={!x.c.email}
                        className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                          sel ? 'border-brand-orange bg-brand-orange/12' : 'border-[#1E5468] hover:border-brand-orange/50'} ${x.c.email ? '' : 'opacity-50'}`}>
                        <span className="chip !px-1.5 !py-0 bg-white/8 text-[9.5px] text-[#9FC0CB]">
                          {ROLES_CONTACTO.find((r) => r.k === x.vinc.rol)?.corto || 'Secundario'}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#EAF4F7]">{nombreDe(x.c)}</span>
                        <span className="shrink-0 text-[11px] text-[#7FA7B4]">{x.c.email || 'sin correo'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-2 text-[11px] text-[#7FA7B4]">
                Los datos de abajo se han rellenado con esta ficha. Puedes corregirlos sin que cambie el CRM.
              </p>
            </div>
          )}
        </div>
      )}

      {modo === 'nuevo' && (
        <p className="mt-2 text-[11.5px] leading-relaxed text-[#9FC0CB]">
          Rellena los datos abajo. Al generar la oferta, si el CIF no está en el CRM
          se da de alta la empresa y su contacto, marcados para revisar.
        </p>
      )}
    </div>
  );
}
