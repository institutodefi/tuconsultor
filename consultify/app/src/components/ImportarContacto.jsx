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
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  // Se carga en cuanto hay algo con lo que buscar. Antes había que pulsar para
  // desplegar y solo entonces se pedían los datos: un desplegable que hay que
  // abrir para que tenga opciones no es un desplegable.
  useEffect(() => {
    if (datos || (!cif && !empresa)) return;
    let vivo = true;
    Promise.all([
      listTable('empresas').catch(() => []),
      listTable('contactos').catch(() => []),
      listTable('empresa_contactos').catch(() => []),
    ]).then(([e, c, v]) => {
      if (vivo) setDatos({ empresas: e || [], contactos: c || [], vinculos: v || [] });
    }).catch((x) => vivo && setError(x?.message || String(x)));
    return () => { vivo = false; };
  }, [datos, cif, empresa]);

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

  const hayDonde = !!(cif || empresa);
  const elegido = personas.find((x) => String(x.c.id) === String(actual));

  const etiqueta = ({ vinc, c }) => {
    const rol = ROL_LABEL[vinc.rol] || vinc.rol;
    return `${c.nombre} ${c.apellidos || ''}`.trim()
      + ` — ${vinc.principal ? '★ ' : ''}${rol}`
      + (c.email ? ` · ${c.email}` : ' · SIN CORREO');
  };

  return (
    <div className="campo">
      <label className="label" htmlFor="imp-contacto">
        Persona de contacto <span className="font-normal normal-case tracking-normal text-[#7FA7B4]">
          — traer del CRM</span>
      </label>
      <select id="imp-contacto" className="input" disabled={!personas.length}
        value={elegido ? String(elegido.c.id) : ''}
        onChange={(e) => {
          const x = personas.find((y) => String(y.c.id) === e.target.value);
          if (!x) return;
          const n = partirNombre(x.c);
          onElegir({
            nombre: n.nombre, apellidos: n.apellidos,
            cargo: x.vinc.cargo || x.c.cargo || '',
            email: x.c.email || '',
            // El móvil manda sobre el fijo: es el que sirve para avisar.
            telefono: x.c.movil || x.c.telefono || '',
            contacto_id: x.c.id,
          });
        }}>
        <option value="">
          {!hayDonde ? '— escribe antes el CIF o la empresa —'
            : error ? '— no se pudo consultar el CRM —'
            : !datos ? '— buscando… —'
            : personas.length ? '— elige a quién va la oferta —'
            : '— esta empresa no tiene contactos en el CRM —'}
        </option>
        {personas.map((x) => (
          <option key={x.vinc.id} value={String(x.c.id)}>{etiqueta(x)}</option>
        ))}
      </select>

      <p className="campo-nota">
        {personas.length > 0
          ? `${personas.length} contacto${personas.length === 1 ? '' : 's'} en el CRM. Rellena nombre, cargo, correo y teléfono.`
          : datos && hayDonde
            ? 'Asígnale contactos desde la ficha de la empresa.'
            : 'Se buscan por CIF y, si no, por razón social.'}
      </p>
    </div>
  );
}
