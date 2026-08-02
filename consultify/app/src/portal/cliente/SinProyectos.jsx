import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { listTable } from '../../lib/data.js';
import MisOfertas from './MisOfertas.jsx';

// ════════════════════════════════════════════════════════════════════════════
// CLIENTE SIN PROYECTOS TODAVÍA
//
// Quien acaba de darse de alta no tiene proyectos, pero sí tiene sus datos y
// los de su empresa. Enseñarle un cartel que diga «aún no tienes servicios» y
// nada más lo deja sin nada que hacer y sin saber qué sabemos de él.
//
// Aquí ve tres cosas: sus datos, los de su empresa, y cómo pedir una oferta.
// ════════════════════════════════════════════════════════════════════════════

const Dato = ({ etiqueta, valor }) => (
  <div>
    <p className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etiqueta}</p>
    <p className="mt-0.5 text-[13.5px] font-bold text-[#EAF4F7]">{valor || <span className="font-normal text-[#7FA7B4]">Sin indicar</span>}</p>
  </div>
);

export default function ClienteSinProyectos() {
  const { user } = useAuth();
  const [empresa, setEmpresa] = useState(null);
  const [contacto, setContacto] = useState(null);
  const [ofertas, setOfertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const correo = (user?.email || '').toLowerCase();
    Promise.all([
      listTable('clientes').catch(() => []),
      listTable('contactos').catch(() => []),
      listTable('presupuestos').catch(() => []),
    ]).then(([cl, co, pr]) => {
      setEmpresa((cl || []).find((c) => String(c.user_id) === String(user?.id))
              || (cl || []).find((c) => (c.email || '').toLowerCase() === correo) || null);
      setContacto((co || []).find((c) => (c.email || '').toLowerCase() === correo) || null);
      setOfertas((pr || []).filter((o) => (o.email || '').toLowerCase() === correo));
    }).finally(() => setCargando(false));
  }, [user, recarga]);

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando tus datos…</p>;

  const nombre = [contacto?.nombre, contacto?.apellidos].filter(Boolean).join(' ')
    || empresa?.contacto || user?.email?.split('@')[0];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#EAF4F7]">
          Hola{nombre ? `, ${nombre.split(' ')[0]}` : ''}
        </h1>
        {/* La empresa, una sola vez y aquí: quien entra necesita saber en
            nombre de qué organización está mirando. Repetirla en cada tarjeta
            era ruido. */}
        {(empresa?.empresa || empresa?.nombre) && (
          <p className="mt-0.5 text-[13px] font-bold text-brand-verdeTexto">
            {empresa.empresa || empresa.nombre}
            {empresa.cif && <span className="ml-2 font-normal text-[#7FA7B4]">{empresa.cif}</span>}
          </p>
        )}
        <p className="mt-1 text-sm text-[#9FC0CB]">
          Todavía no hay ningún proyecto en marcha. Cuando lo haya, lo verás aquí con su estado y sus fechas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tus datos */}
        <section className="card">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tus datos</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Dato etiqueta="Nombre" valor={contacto?.nombre} />
            <Dato etiqueta="Apellidos" valor={contacto?.apellidos} />
            <Dato etiqueta="Correo" valor={user?.email} />
            <Dato etiqueta="Cargo" valor={contacto?.cargo} />
            <Dato etiqueta="Teléfono" valor={contacto?.telefono} />
            <Dato etiqueta="Móvil" valor={contacto?.movil} />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-[#7FA7B4]">
            ¿Algo mal? Escríbenos a <a href="mailto:hola@tuconsultor.com" className="text-brand-orange underline">hola@tuconsultor.com</a> y lo corregimos.
          </p>
        </section>

        {/* Tu empresa */}
        <section className="card">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tu empresa</h2>
          {empresa ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Dato etiqueta="CIF" valor={empresa.cif} />
              <Dato etiqueta="Dirección" valor={empresa.direccion} />
              <Dato etiqueta="Teléfono" valor={empresa.telefono} />
              <Dato etiqueta="Correo" valor={empresa.email} />
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] leading-relaxed text-[#9FC0CB]">
              Aún no hemos vinculado tu cuenta con ninguna empresa. Pide una oferta y la damos de alta
              con los datos que nos facilites.
            </p>
          )}
        </section>
      </div>

      {/* Un vistazo; el detalle y la decisión, en «Mis propuestas» */}
      {ofertas.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">Tus propuestas</h2>
          <ul className="mt-2 divide-y divide-[#153F52]">
            {ofertas.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="text-[13px] font-bold text-[#EAF4F7]">{o.numero_oferta || 'Sin número'}</span>
                <span className="min-w-0 flex-1 truncate text-[12px] text-[#9FC0CB]">{o.modelo}</span>
                <span className="chip !px-2 !py-0 bg-white/8 text-[10.5px] text-[#9FC0CB]">{o.estado || 'emitida'}</span>
                {o.url_pdf && (
                  <a href={o.url_pdf} target="_blank" rel="noopener"
                     className="text-[12px] font-bold text-brand-orange hover:underline">Ver PDF</a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Pedir una oferta */}
      <section className="card border-brand-orange/40">
        <h2 className="text-sm font-extrabold text-brand-orange">¿Quieres una propuesta?</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-[#B9D2DA]">
          Elige los sistemas que te interesan y el modelo de servicio, y obtienes el precio al momento.
          Sin compromiso: la revisamos contigo antes de nada.
        </p>
        <a href="/app/calculadora" className="btn-orange mt-3 inline-flex">Calcular mi propuesta →</a>
      </section>
    </div>
  );
}
