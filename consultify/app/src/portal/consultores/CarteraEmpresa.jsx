import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import { carteraDe, fmtEur, fmtFecha } from '../../lib/cartera.js';
import { TONO_SEMAFORO, fmtFecha as fmtFechaProy } from '../../lib/proyectos.js';

// ════════════════════════════════════════════════════════════════════════════
// Cartera de la empresa · ofertas, contratos y proyectos
//
// Hasta ahora, para saber qué había con un cliente tocaba pasear por tres
// pantallas: Ofertas, Contratos y Proyectos, buscando por nombre en cada una.
// Aquí se ve de un vistazo, cruzado por CIF.
//
// Carga bajo demanda: son cuatro tablas y la ficha de empresa se abre muchas
// veces solo para mirar un teléfono. Se piden al desplegar, no antes.
// ════════════════════════════════════════════════════════════════════════════

const COLOR_ESTADO_OFERTA = {
  aceptada:  'bg-emerald-500/15 text-emerald-300',
  enviada:   'bg-sky-500/15 text-sky-300',
  anulada:   'bg-red-500/15 text-red-300',
  rechazada: 'bg-red-500/15 text-red-300',
};
const COLOR_ESTADO_CONTRATO = {
  firmado:  'bg-emerald-500/15 text-emerald-300',
  enviado:  'bg-sky-500/15 text-sky-300',
  borrador: 'bg-white/5 text-[#9FC0CB]',
  anulado:  'bg-red-500/15 text-red-300',
};
const COLOR_ESTADO_PROYECTO = {
  'implantación': 'bg-brand-orange/15 text-brand-orange',
  activo:         'bg-emerald-500/15 text-emerald-300',
  pausado:        'bg-white/5 text-[#9FC0CB]',
  cerrado:        'bg-white/5 text-[#7FA7B4]',
};

const TONO_ALERTA = {
  rojo:  'border-red-400/50 bg-red-500/10 text-red-200',
  ambar: 'border-brand-orange/50 bg-brand-orange/10 text-brand-orange',
  gris:  'border-[#1E5468] bg-[#0D3242] text-[#9FC0CB]',
};

function Cifra({ etiqueta, valor, tono = 'text-[#EAF4F7]', pie }) {
  return (
    <div className="rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2.5">
      <p className={`text-xl font-extrabold leading-none ${tono}`}>{valor}</p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etiqueta}</p>
      {pie && <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{pie}</p>}
    </div>
  );
}

function Pestana({ activa, onClick, children, n }) {
  return (
    <button type="button" onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11.5px] font-bold transition ${
        activa ? 'bg-brand-orange/20 text-brand-orange' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
      {children}{typeof n === 'number' && <span className="ml-1 opacity-70">{n}</span>}
    </button>
  );
}

const Vacio = ({ children }) => (
  <p className="py-4 text-center text-[12px] text-[#7FA7B4]">{children}</p>
);

// El título de cada línea es el enlace: es lo que se pulsa por instinto.
const ENLACE = 'block truncate text-[12.5px] font-bold text-[#EAF4F7] hover:text-brand-orange hover:underline';

export default function CarteraEmpresa({ empresa, onAbrirOferta }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [pestana, setPestana] = useState('proyectos');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const [presupuestos, contratos, clientes, proyectos] = await Promise.all([
          listTable('presupuestos').catch(() => []),
          listTable('contratos').catch(() => []),
          listTable('clientes').catch(() => []),
          listTable('proyectos_cliente').catch(() => []),
        ]);
        if (vivo) setDatos({ presupuestos, contratos, clientes, proyectos });
      } catch (e) {
        if (vivo) setError(e?.message || String(e));
      }
    })();
    return () => { vivo = false; };
  }, [empresa?.id]);

  const cartera = useMemo(() => carteraDe(empresa, datos || {}), [empresa, datos]);
  const { ofertas, contratos, proyectos, resumen: R } = cartera;

  // Se abre por la pestaña que tiene algo que enseñar, en orden de relevancia:
  // lo que está vivo primero. Abrir siempre en «Proyectos» con la lista vacía
  // hace pensar que no hay nada cuando sí hay tres ofertas abiertas.
  useEffect(() => {
    if (!datos) return;
    if (proyectos.length) setPestana('proyectos');
    else if (contratos.length) setPestana('contratos');
    else if (ofertas.length) setPestana('ofertas');
  }, [datos, proyectos.length, contratos.length, ofertas.length]);

  if (error) return <p className="text-[12px] text-red-300">No se pudo cargar la cartera: {error}</p>;
  if (!datos) return <p className="text-[12px] text-[#7FA7B4]">Cargando cartera…</p>;

  const sinNada = !ofertas.length && !contratos.length && !proyectos.length;

  return (
    <div className="space-y-3">
      {/* ── Minidashboard ── */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <Cifra etiqueta="Ofertas" valor={R.ofertas}
          pie={R.ofertasAbiertas ? `${R.ofertasAbiertas} sin cerrar` : null}
          tono={R.ofertasAbiertas ? 'text-brand-orange' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Contratos" valor={R.contratos}
          pie={R.contratosFirmados ? `${R.contratosFirmados} firmado${R.contratosFirmados > 1 ? 's' : ''}` : null} />
        <Cifra etiqueta="Proyectos activos" valor={R.proyectosActivos}
          pie={R.proyectos !== R.proyectosActivos ? `${R.proyectos} en total` : null}
          tono={R.proyectosActivos ? 'text-emerald-300' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Comprometido / año" valor={fmtEur(R.facturacionAnual)}
          pie={R.ultimaActividad ? `últ. ${fmtFecha(R.ultimaActividad)}` : null} />
      </div>

      {/* Una sola alerta, la más urgente. Una lista de cinco no se lee. */}
      {R.alerta && (
        <p className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${TONO_ALERTA[R.alerta.nivel]}`}>
          {R.alerta.texto}
        </p>
      )}

      {sinNada ? (
        <Vacio>
          Sin ofertas, contratos ni proyectos a nombre de esta empresa.
          {!empresa?.cif && ' Añade el CIF: es la llave con la que se cruzan.'}
        </Vacio>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-[#1E5468] pb-2">
            <Pestana activa={pestana === 'proyectos'} onClick={() => setPestana('proyectos')} n={proyectos.length}>Proyectos</Pestana>
            <Pestana activa={pestana === 'contratos'} onClick={() => setPestana('contratos')} n={contratos.length}>Contratos</Pestana>
            <Pestana activa={pestana === 'ofertas'} onClick={() => setPestana('ofertas')} n={ofertas.length}>Ofertas</Pestana>
          </div>

          {/* ── Proyectos ── */}
          {pestana === 'proyectos' && (proyectos.length ? (
            <ul className="divide-y divide-[#153F52]">
              {proyectos.map((p) => {
                const t = TONO_SEMAFORO[p.sem.nivel];
                return (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.punto}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <Link to={`/consultores/proyectos?proyecto=${p.id}`} className={ENLACE}
                        title="Abrir el proyecto">
                        {p.nombre || (p.normas || []).join(' + ') || 'Sin nombre'}
                      </Link>
                      <span className="text-[11px] text-[#7FA7B4]">
                        {[p.modelo, (p.normas || []).join(' + ')].filter(Boolean).join(' · ')}
                        {p.fecha_inicio || p.fecha_fin ? ` · ${fmtFechaProy(p.fecha_inicio)} → ${fmtFechaProy(p.fecha_fin)}` : ''}
                      </span>
                    </span>
                    <span className={`chip !px-2 !py-0 text-[10px] ${COLOR_ESTADO_PROYECTO[p.estado] || ''}`}>{p.estado}</span>
                    {p.sem.nivel !== 'ok' && p.sem.nivel !== 'sin_fecha' && (
                      <span className={`chip ${t.chip} !px-2 !py-0 text-[10px] font-extrabold`}>{p.sem.etiqueta}</span>
                    )}
                    {p.precio_mes ? <span className="text-[11.5px] font-bold text-[#9FC0CB]">{fmtEur(p.precio_mes)}/mes</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : <Vacio>Ningún proyecto todavía.</Vacio>)}

          {/* ── Contratos ── */}
          {pestana === 'contratos' && (contratos.length ? (
            <ul className="divide-y divide-[#153F52]">
              {contratos.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="min-w-0 flex-1">
                    {/* El contrato se gestiona colgando de su oferta, así que el
                        enlace lleva allí y no a una pantalla propia que no existe. */}
                    <Link to={`/consultores/ofertas?oferta=${c.presupuesto_id}`} className={ENLACE}
                      title="Abrir el contrato en su oferta">
                      {c.numero}
                    </Link>
                    <span className="text-[11px] text-[#7FA7B4]">
                      {c.modelo} · {(c.normas || []).join(' + ')} · {fmtFecha(c.fecha_contrato)}
                    </span>
                  </span>
                  <span className={`chip !px-2 !py-0 text-[10px] ${COLOR_ESTADO_CONTRATO[c.estado] || ''}`}>{c.estado}</span>
                  <span className="text-[11.5px] font-bold text-[#9FC0CB]">
                    {fmtEur(c.importe)}{c.tipo === 'mes' ? '/mes' : ''}
                  </span>
                  {c.url_pdf && (
                    <a href={c.url_pdf} target="_blank" rel="noreferrer"
                      className="shrink-0 text-[11px] font-bold text-brand-verdeTexto hover:underline"
                      title="Abrir el contrato en PDF">PDF</a>
                  )}
                </li>
              ))}
            </ul>
          ) : <Vacio>Ningún contrato todavía.</Vacio>)}

          {/* ── Ofertas ── */}
          {pestana === 'ofertas' && (ofertas.length ? (
            <ul className="divide-y divide-[#153F52]">
              {ofertas.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <span className="min-w-0 flex-1">
                    <Link to={`/consultores/ofertas?oferta=${o.id}`} className={ENLACE}
                      title="Abrir la oferta para editarla">
                      {o.numero_oferta || 'Sin número'}
                      {/* Cuando el cruce ha sido por nombre y no por CIF, se dice:
                          es menos fiable y quien mira debe poder desconfiar. */}
                      {o._match === 'nombre' && (
                        <span className="ml-1.5 text-[10px] font-bold text-brand-orange" title="Coincide por nombre, no por CIF">
                          ~ por nombre
                        </span>
                      )}
                    </Link>
                    <span className="text-[11px] text-[#7FA7B4]">
                      {o.modelo} · {(o.normas || []).join(' + ')} · {fmtFecha(o.fecha_emision || o.creado)}
                    </span>
                  </span>
                  {o.estado && <span className={`chip !px-2 !py-0 text-[10px] ${COLOR_ESTADO_OFERTA[o.estado] || 'bg-white/5 text-[#9FC0CB]'}`}>{o.estado}</span>}
                  <span className="text-[11.5px] font-bold text-[#9FC0CB]">
                    {fmtEur(o.precio)}{o.tipo === 'mes' ? '/mes' : ''}
                  </span>
                  {/* Acceso directo al documento emitido, sin pasar por el
                      listado de ofertas. */}
                  <span className="flex shrink-0 gap-2">
                    {o.url_pdf && (
                      <a href={o.url_pdf} target="_blank" rel="noreferrer"
                        className="text-[11px] font-bold text-brand-verdeTexto hover:underline"
                        title="Abrir el PDF emitido">PDF</a>
                    )}
                    {o.url_pptx && (
                      <a href={o.url_pptx} target="_blank" rel="noreferrer"
                        className="text-[11px] font-bold text-[#9FC0CB] hover:underline"
                        title="Abrir la presentación">PPT</a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : <Vacio>Ninguna oferta todavía.</Vacio>)}
        </>
      )}
    </div>
  );
}
