import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable } from '../../lib/data.js';
import { carteraDe, fmtEur, fmtFecha } from '../../lib/cartera.js';
import AltaProyecto from './AltaProyecto.jsx';
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

/**
 * Una cifra del panel. Con `a` se convierte en enlace a la pantalla que
 * gestiona ese dato: pulsar un número y no poder ir a lo que cuenta es la
 * frustración clásica de un panel.
 */
function Cifra({ etiqueta, valor, tono = 'text-[#EAF4F7]', pie, a, titulo }) {
  const cuerpo = (
    <>
      <p className={`text-xl font-extrabold leading-none ${tono}`}>{valor}</p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etiqueta}</p>
      {pie && <p className="mt-0.5 text-[10.5px] text-[#7FA7B4]">{pie}</p>}
    </>
  );
  const clases = 'block rounded-xl border border-[#1E5468] bg-[#0D3242] px-3 py-2.5';
  if (!a) return <div className={clases}>{cuerpo}</div>;
  return (
    <Link to={a} title={titulo} className={`${clases} transition hover:border-brand-orange`}>
      {cuerpo}
    </Link>
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
  const [alta, setAlta] = useState(null);   // { origen, tipo } mientras se da de alta

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

  // Destinos de los enlaces. Las ofertas se filtran por nombre de empresa
  // porque el listado busca por texto; los proyectos, por id de cliente.
  const aOfertas = `/consultores/ofertas?empresa=${encodeURIComponent(empresa?.nombre || '')}`;

  const cartera = useMemo(() => carteraDe(empresa, datos || {}), [empresa, datos]);
  const { ofertas, contratos, proyectos, resumen: R } = cartera;

  // Ficha de cliente de esta empresa: los proyectos cuelgan de ahí, no de la
  // ficha del CRM. Sin ella no se puede abrir un proyecto.
  const clienteId = useMemo(() => {
    if (!datos || !empresa) return null;
    const c = carteraDe(empresa, datos);
    return c.proyectos[0]?.cliente_id
      || (datos.clientes || []).find((x) => {
        const n = (s) => String(s || '').toUpperCase().replace(/[\s.-]/g, '');
        return (n(x.cif) && n(x.cif) === n(empresa.cif));
      })?.id
      || null;
  }, [datos, empresa]);

  const aProyectos = clienteId ? `/consultores/proyectos?cliente=${clienteId}` : '/consultores/proyectos';

  // Tras crear un proyecto se recarga solo esa tabla: recargar las cuatro por
  // un alta es tiempo de espera que no aporta.
  const trasCrear = async () => {
    setAlta(null);
    const proyectos_cliente = await listTable('proyectos_cliente').catch(() => datos.proyectos);
    setDatos((d) => ({ ...d, proyectos: proyectos_cliente }));
    setPestana('proyectos');
  };

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
      {/* ── Minidashboard ──
          Primera fila: cómo va la relación comercial. Segunda: en qué estado
          está el trabajo. Se separan porque responden a preguntas distintas. */}
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <Cifra etiqueta="Ofertas" valor={R.ofertas} a={aOfertas} titulo="Ver las ofertas de esta empresa"
          pie={R.ofertasAbiertas ? `${R.ofertasAbiertas} sin cerrar` : 'todas resueltas'}
          tono={R.ofertasAbiertas ? 'text-brand-orange' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Aceptadas" valor={R.aceptadas} a={aOfertas} titulo="Ver las ofertas de esta empresa"
          pie={R.tasaAceptacion != null ? `${R.tasaAceptacion}% de las resueltas` : 'ninguna resuelta'}
          tono={R.aceptadas ? 'text-emerald-300' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Rechazadas" valor={R.rechazadas} a={aOfertas} titulo="Ver las ofertas de esta empresa"
          pie={R.rechazadas ? 'rechazadas o caducadas' : null}
          tono={R.rechazadas ? 'text-red-300' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Comprometido / año" valor={fmtEur(R.facturacionAnual)}
          pie={R.ultimaActividad ? `últ. ${fmtFecha(R.ultimaActividad)}` : null} />
      </div>

      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        <Cifra etiqueta="Contratos" valor={R.contratos} a={aOfertas} titulo="Los contratos se gestionan desde su oferta"
          pie={R.contratosFirmados ? `${R.contratosFirmados} firmado${R.contratosFirmados > 1 ? 's' : ''}` : null} />
        {/* Pendiente = contrato firmado sin proyecto abierto. Es el hueco que
            de verdad hay que vigilar: trabajo vendido sin arrancar. */}
        <Cifra etiqueta="Proy. pendientes" valor={R.proyPendientes}
          pie={R.proyPendientes ? 'firmados sin abrir' : 'nada sin arrancar'}
          tono={R.proyPendientes ? 'text-brand-orange' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Proy. activos" valor={R.proyectosActivos} a={aProyectos} titulo="Ver los proyectos de este cliente"
          pie={R.proyPausados ? `${R.proyPausados} en pausa` : null}
          tono={R.proyectosActivos ? 'text-emerald-300' : 'text-[#EAF4F7]'} />
        <Cifra etiqueta="Proy. cerrados" valor={R.proyCerrados} a={aProyectos} titulo="Ver los proyectos de este cliente"
          pie={R.proyectos ? `${R.proyectos} en total` : null} />
      </div>

      {/* Una sola alerta, la más urgente. Una lista de cinco no se lee. */}
      {R.alerta && (
        <p className={`rounded-xl border px-3 py-2 text-[12px] font-bold ${TONO_ALERTA[R.alerta.nivel]}`}>
          {R.alerta.texto}
        </p>
      )}

      {/* Crear proyecto está siempre a mano, con o sin ofertas detrás: hay
          clientes que ya trabajaban con nosotros antes de que las ofertas
          existieran en el sistema, y trabajos que no vienen de una oferta. */}
      {!alta && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11.5px] text-[#7FA7B4]">
            {clienteId
              ? 'Puedes abrir un proyecto desde una oferta, desde un contrato o desde cero.'
              : 'Esta empresa aún no tiene ficha de cliente: créala para poder abrir proyectos.'}
          </p>
          <button type="button" disabled={!clienteId}
            onClick={() => setAlta({ origen: null, tipo: null })}
            className="rounded-full bg-brand-orange px-3.5 py-1.5 text-[12px] font-extrabold text-[#0A2B3A] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
            + Nuevo proyecto
          </button>
        </div>
      )}

      {alta && (
        <AltaProyecto origen={alta.origen} tipo={alta.tipo} clienteId={clienteId}
          onCerrar={() => setAlta(null)} onCreado={trasCrear} />
      )}

      {/* Contratos firmados sin proyecto: se ofrecen para abrirlos de una vez,
          en lugar de dejar que el aviso se quede ahí sin acción posible. */}
      {!alta && R.contratosSinProyecto?.length > 0 && (
        <div className="rounded-xl border border-brand-orange/40 bg-brand-orange/[0.07] px-3 py-2.5">
          <p className="text-[12px] font-bold text-brand-orange">
            {R.contratosSinProyecto.length === 1
              ? 'Hay un contrato firmado sin proyecto abierto'
              : `Hay ${R.contratosSinProyecto.length} contratos firmados sin proyecto abierto`}
          </p>
          <ul className="mt-1.5 space-y-1">
            {R.contratosSinProyecto.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                <span className="font-bold text-[#EAF4F7]">{c.numero}</span>
                <span className="text-[#7FA7B4]">{c.modelo} · {(c.normas || []).join(' + ')}</span>
                <button type="button" onClick={() => setAlta({ origen: c, tipo: 'contrato' })}
                  className="font-bold text-brand-orange hover:underline">Abrir proyecto →</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sinNada ? (
        <Vacio>
          Sin ofertas, contratos ni proyectos a nombre de esta empresa.
          {!empresa?.cif
            ? ' Añade el CIF: es la llave con la que se cruzan.'
            : ' Puedes abrir un proyecto directamente con el botón de arriba.'}
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
                  <button type="button" onClick={() => setAlta({ origen: c, tipo: 'contrato' })}
                    className="shrink-0 text-[11px] font-bold text-brand-orange hover:underline"
                    title="Abrir un proyecto con los datos de este contrato">+ proyecto</button>
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
                      {o.modelo} · {(o.normas || []).join(' + ')} · emitida {fmtFecha(o.fecha_emision || o.creado)}
                    </span>
                    {(o.fecha_inicio || o.fecha_fin) && (
                      <span className="block text-[11px] text-[#7FA7B4]">
                        {fmtFecha(o.fecha_inicio)} → {fmtFecha(o.fecha_fin)}
                        {' · cert. '}{o.fecha_certificacion ? fmtFecha(o.fecha_certificacion) : 'sin fecha'}
                      </span>
                    )}
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
                    <button type="button" onClick={() => setAlta({ origen: o, tipo: 'oferta' })}
                      className="text-[11px] font-bold text-brand-orange hover:underline"
                      title="Abrir un proyecto con los datos de esta oferta">+ proyecto</button>
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
