import { useEffect, useMemo, useState } from 'react';
import { listTable } from '../lib/data.js';
import { normalizarCif, ROL_LABEL } from '../lib/crm.js';

// ════════════════════════════════════════════════════════════════════════════
// IMPORTAR UNA PERSONA DE CONTACTO DE LA EMPRESA
//
// Al reeditar una oferta del histórico, los datos de la persona son los que se
// escribieron el día que se emitió. Si esa persona ya no está, o la oferta se
// redirige a otro interlocutor, había que teclear nombre, cargo, correo y
// teléfono a mano teniéndolos ya en el CRM.
//
// La empresa se localiza por CIF normalizado y, si no hay, por razón social:
// una oferta antigua puede tener el CIF escrito con guiones o en minúsculas.
//
// Solo carga los datos cuando se despliega. Son tres tablas y la edición de una
// oferta se abre muchas veces sin necesitar tocar el contacto.
// ════════════════════════════════════════════════════════════════════════════

const norm = (s) => String(s || '')
  .toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[.,]/g, ' ')
  .replace(/\b(S\s*L\s*U?|S\s*A\s*U?|SLU|SAU|SL|SA)\b/g, ' ')
  .replace(/\s+/g, ' ').trim();

/** Nombre y apellidos por separado, que es como los guardan los formularios. */
function partirNombre(c) {
  if (c?.apellidos) return { nombre: c.nombre || '', apellidos: c.apellidos };
  const t = String(c?.nombre || '').trim();
  const i = t.indexOf(' ');
  return i < 0 ? { nombre: t, apellidos: '' } : { nombre: t.slice(0, i), apellidos: t.slice(i + 1) };
}

export default function ImportarContacto({ cif, empresa, onElegir, actual }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!abierto || datos) return;
    let vivo = true;
    Promise.all([
      listTable('empresas').catch(() => []),
      listTable('contactos').catch(() => []),
      listTable('empresa_contactos').catch(() => []),
    ]).then(([e, c, v]) => {
      if (vivo) setDatos({ empresas: e || [], contactos: c || [], vinculos: v || [] });
    }).catch((x) => vivo && setError(x?.message || String(x)));
    return () => { vivo = false; };
  }, [abierto, datos]);

  const personas = useMemo(() => {
    if (!datos) return [];
    const c = normalizarCif(cif);
    const n = norm(empresa);
    const emp = datos.empresas.find((e) => c && normalizarCif(e.cif) === c)
      || datos.empresas.find((e) => n && (norm(e.nombre) === n || norm(e.nombre_comercial) === n));
    if (!emp) return [];
    return datos.vinculos
      .filter((v) => String(v.empresa_id) === String(emp.id))
      .map((v) => ({ vinc: v, c: datos.contactos.find((x) => String(x.id) === String(v.contacto_id)) }))
      .filter((x) => x.c)
      // Primero el principal y los directivos: son los que reciben la oferta.
      .sort((a, b) => (b.vinc.principal ? 1 : 0) - (a.vinc.principal ? 1 : 0)
        || (b.vinc.rol === 'directivo' ? 1 : 0) - (a.vinc.rol === 'directivo' ? 1 : 0));
  }, [datos, cif, empresa]);

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="text-[11.5px] font-bold text-brand-verdeTexto hover:underline">
        ↓ Traer persona de contacto de la empresa
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-brand-verde/40 bg-[#0B2E3D] p-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11.5px] font-extrabold text-brand-verdeTexto">
          Contactos de {empresa || 'la empresa'}
        </p>
        <button type="button" onClick={() => setAbierto(false)}
          className="text-[11px] font-bold text-[#7FA7B4] hover:text-[#EAF4F7]">cerrar</button>
      </div>

      {error && <p className="mt-1.5 text-[11.5px] font-bold text-red-300">{error}</p>}
      {!datos && !error && <p className="mt-1.5 text-[11.5px] text-[#7FA7B4]">Buscando…</p>}

      {datos && personas.length === 0 && (
        <p className="mt-1.5 text-[11.5px] text-[#7FA7B4]">
          {cif || empresa
            ? 'No se encontró esta empresa en el CRM, o no tiene contactos asignados.'
            : 'Escribe antes el CIF o el nombre de la empresa.'}
        </p>
      )}

      {datos && personas.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {personas.map(({ vinc, c }) => {
            const puesto = String(c.id) === String(actual);
            return (
              <li key={vinc.id}>
                <button type="button" onClick={() => {
                    const n = partirNombre(c);
                    onElegir({
                      nombre: n.nombre, apellidos: n.apellidos,
                      cargo: vinc.cargo || c.cargo || '',
                      email: c.email || '',
                      // El móvil manda sobre el fijo: es el que sirve para avisar.
                      telefono: c.movil || c.telefono || '',
                      contacto_id: c.id,
                    });
                    setAbierto(false);
                  }}
                  className={`flex w-full flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border px-2.5 py-1.5 text-left transition ${
                    puesto ? 'border-brand-orange/60 bg-brand-orange/[0.07]' : 'border-[#1E5468] hover:border-brand-verde'}`}>
                  <span className="text-[12.5px] font-bold text-[#EAF4F7]">
                    {c.nombre} {c.apellidos || ''}
                  </span>
                  {vinc.principal && (
                    <span className="chip bg-brand-orange/20 !px-1.5 !py-0 text-[9px] font-extrabold text-brand-orange">★</span>
                  )}
                  <span className="text-[11px] text-[#7FA7B4]">{ROL_LABEL[vinc.rol] || vinc.rol}</span>
                  <span className="w-full truncate text-[11px] text-[#9FC0CB]">
                    {c.email || <span className="font-bold text-red-300">sin correo</span>}
                    {c.movil || c.telefono ? ` · ${c.movil || c.telefono}` : ''}
                  </span>
                  {puesto && <span className="text-[10.5px] font-bold text-brand-orange">es el que está puesto</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
