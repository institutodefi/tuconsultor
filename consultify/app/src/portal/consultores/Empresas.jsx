import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SincronizarCrm from '../../components/SincronizarCrm.jsx';
import { listTable, updateRow, deleteRow } from '../../lib/data.js';
import { useAuth } from '../../lib/auth.jsx';
import { semaforoEmpresa, ESTADOS_COMERCIALES , nombreVisible, tieneComercialDistinto } from '../../lib/crm.js';
import FichaEmpresa from './FichaEmpresa.jsx';
import DialogoFicha from '../../components/DialogoFicha.jsx';
import { BarraLote, BotonLote, InformeLote, CasillaTodos } from '../../components/BarraLote.jsx';
import { useLote, exportarCSV, copiarCorreos } from '../../lib/lote.js';
import { diagnosticarCrm, informeTexto } from '../../lib/diagnosticoCrm.js';

// Referencia estable para el alta. Con `{}` escrito en el JSX se creaba un
// objeto nuevo en cada render y los efectos de la ficha que dependían de él se
// disparaban sin parar.
const EMPRESA_NUEVA = Object.freeze({});

// ════════════════════════════════════════════════════════════════════════════
// EMPRESAS · pestaña única del CRM.
// Sustituye a las tres antiguas (Empresas · Clientes · Clientes potenciales):
// ahora son filtros sobre la misma tabla.
// ════════════════════════════════════════════════════════════════════════════

const FILTROS = [
  ['todas',      'Todas'],
  ['cliente',    'Clientes'],
  ['proveedor',  'Proveedores'],
  ['potencial',  'Potenciales'],
  ['incidencia', 'Con incidencias'],
  ['sin_revisar', 'Alta automática'],
];

const PUNTO = { rojo: 'bg-red-500', ambar: 'bg-brand-orange', verde: 'bg-emerald-400' };

export default function Empresas() {
  const { role, demo } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const puedeEditar = ['superadmin', 'admin', 'director', 'gestion'].includes(role);
  const puedeBorrar = ['superadmin', 'admin'].includes(role);

  const [empresas, setEmpresas] = useState([]);
  const [contactos, setContactos] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [nueva, setNueva] = useState(false);
  const [diagBd, setDiagBd] = useState(null);   // comprobación de escritura en la base
  const [errorCarga, setErrorCarga] = useState(null);  // motivo real si la lectura falla

  async function comprobarBd() {
    setDiagBd({ cargando: true });
    try { setDiagBd(await diagnosticarCrm()); }
    catch (e) { setDiagBd({ conclusion: `La comprobación falló: ${e?.message || e}`, problemas: [] }); }
  }

  const sel = params.get('e');
  const seleccionar = (id) => { setNueva(false); if (id) setParams({ e: String(id) }); else setParams({}); };

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [e, c, v] = await Promise.all([
        listTable('empresas').catch((e) => { setErrorCarga(e?.message || String(e)); return []; }),
        listTable('contactos').catch(() => []),
        listTable('empresa_contactos').catch(() => []),
      ]);
      (e || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      setEmpresas(e || []); setContactos(c || []); setVinculos(v || []);
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  // Semáforo precalculado por empresa
  const semaforos = useMemo(() => {
    const m = new Map();
    for (const e of empresas) {
      const vs = vinculos.filter((v) => String(v.empresa_id) === String(e.id));
      const cs = vs.map((v) => contactos.find((c) => String(c.id) === String(v.contacto_id))).filter(Boolean);
      m.set(String(e.id), { ...semaforoEmpresa(e, vs, cs), n: vs.length });
    }
    return m;
  }, [empresas, contactos, vinculos]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return empresas.filter((e) => {
      if (filtro === 'cliente' && !e.es_cliente) return false;
      if (filtro === 'proveedor' && !e.es_proveedor) return false;
      if (filtro === 'potencial' && e.estado_comercial !== 'potencial') return false;
      if (filtro === 'incidencia' && semaforos.get(String(e.id))?.color !== 'rojo') return false;
      // Fichas creadas solas al pedir una oferta desde la web: los datos los
      // tecleó el cliente y nadie del equipo los ha mirado todavía.
      if (filtro === 'sin_revisar' && e.revisado !== false) return false;
      if (!t) return true;
      return [e.nombre, e.nombre_comercial, e.cif, e.poblacion, e.email, e.web]
        .filter(Boolean).join(' ').toLowerCase().includes(t);
    });
  }, [empresas, q, filtro, semaforos]);

  // ── Acciones en lote ──
  const lote = useLote(lista, cargar);

  const marcarComo = (campo, valor, etq) => lote.ejecutar(etq,
    (e) => updateRow('empresas', e.id, { [campo]: valor }));

  const loteEstado = (estado) => lote.ejecutar(`marcadas como ${estado}`,
    (e) => updateRow('empresas', e.id, { estado_comercial: estado }));

  const loteBorrar = () => lote.ejecutarConAviso(
    'eliminadas',
    `Se van a eliminar ${lote.nMarcados} empresa(s). Sus contactos quedarán sin empresa. No se puede deshacer.`,
    (e) => deleteRow('empresas', e.id),
  );

  const loteCSV = () => exportarCSV(
    lote.seleccionados.length ? lote.seleccionados : lista,
    [
      ['Nombre comercial', (e) => nombreVisible(e)], ['Razón social', (e) => e.nombre], ['CIF', (e) => e.cif],
      ['Dirección', (e) => e.direccion], ['CP', (e) => e.cp],
      ['Población', (e) => e.poblacion], ['Provincia', (e) => e.provincia],
      ['País', (e) => e.pais], ['Email', (e) => e.email], ['Teléfono', (e) => e.telefono],
      ['Cliente', (e) => (e.es_cliente ? 'sí' : 'no')],
      ['Proveedor', (e) => (e.es_proveedor ? 'sí' : 'no')],
      ['Estado', (e) => e.estado_comercial],
    ],
    'empresas',
  );

  // Esta pantalla no tiene barra de mensajes propia: el aviso se da con el
  // mismo informe que usan las demás acciones del lote.
  const [avisoCopia, setAvisoCopia] = useState(null);
  const loteCorreos = async () => {
    const r = await copiarCorreos(lote.seleccionados);
    setAvisoCopia(r.ok ? `${r.n} correo(s) copiados al portapapeles.`
      : (r.error || 'Ninguna de las marcadas tiene email válido.'));
    setTimeout(() => setAvisoCopia(null), 4000);
  };

  const empresa = sel ? empresas.find((e) => String(e.id) === String(sel)) : null;
  const sinRevisar = empresas.filter((e) => e.revisado === false).length;
  const rojas = useMemo(() => [...semaforos.values()].filter((s) => s.color === 'rojo').length, [semaforos]);
  const huerfanos = useMemo(
    () => contactos.filter((c) => !vinculos.some((v) => String(v.contacto_id) === String(c.id))).length,
    [contactos, vinculos],
  );

  const abrirContacto = (id) => navigate({ pathname: '../contactos', search: `?c=${id}` });

  // La ficha se abre EN DIÁLOGO sobre el listado. Antes sustituía la pantalla
  // entera con un `return` temprano: al cerrarla se volvía al listado desde
  // arriba, con el filtro y el desplazamiento perdidos, y no había forma de
  // consultar un dato de otra empresa sin salir de la que se estaba editando.
  const fichaAbierta = nueva || !!empresa;
  // Llegar por enlace a una empresa que ya no está —borrada, o de otra cuenta—
  // dejaba el listado tal cual, sin explicar por qué no se abría nada.
  const enlaceRoto = !!sel && !cargando && !empresa;
  const cerrarFicha = () => { setNueva(false); setParams({}); cargar(); };

  // ── Listado ──
  return (
    <div className="space-y-5">
      {fichaAbierta && (
        <DialogoFicha
          titulo={nueva ? 'Nueva empresa' : (nombreVisible(empresa) || 'Empresa')}
          subtitulo={nueva ? 'Alta en el CRM'
            : [tieneComercialDistinto(empresa) ? empresa.nombre : null, empresa?.cif,
               empresa?.es_cliente ? 'Cliente' : null, empresa?.es_proveedor ? 'Proveedor' : null]
              .filter(Boolean).join(' · ')}
          onCerrar={cerrarFicha}
          ancho="1100px"
        >
          <FichaEmpresa
            empresa={nueva ? EMPRESA_NUEVA : empresa}
            empresas={empresas} contactos={contactos} vinculos={vinculos}
            puedeEditar={puedeEditar} puedeBorrar={puedeBorrar}
            onCambio={cargar}
            onSeleccionar={seleccionar}
            onCerrar={cerrarFicha}
            onAbrirContacto={abrirContacto}
            enDialogo
          />
        </DialogoFicha>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">CRM</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Empresas</h1>
          <p className="mt-1 text-sm font-medium text-[#9FC0CB]">
            Clientes, proveedores y potenciales en una sola ficha. Cada empresa lleva sus contactos y, si es proveedor, su homologación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['superadmin', 'admin'].includes(role) && (
            <button onClick={comprobarBd} disabled={diagBd?.cargando} className="btn-ghost !px-3 !py-2 text-xs">
              {diagBd?.cargando ? 'Comprobando…' : '⚙ Comprobar base de datos'}
            </button>
          )}
          {puedeEditar && <SincronizarCrm />}
          {puedeEditar && <button onClick={() => setNueva(true)} className="btn-orange">+ Nueva empresa</button>}
        </div>
      </div>

      {demo && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-brand-orange">Modo demo: los cambios no se guardan.</div>}

      {enlaceRoto && (
        <p className="rounded-xl bg-amber-400/10 px-3 py-2 text-[12.5px] font-bold text-amber-200">
          No se encuentra la empresa del enlace. Puede que se haya eliminado.
          <button onClick={() => setParams({})} className="ml-2 underline">ver todas</button>
        </p>
      )}

      <BarraLote n={lote.nMarcados} onLimpiar={lote.limpiar}>
        <BotonLote onClick={loteCorreos}>Copiar correos</BotonLote>
        <BotonLote onClick={loteCSV}>Exportar CSV</BotonLote>
        {puedeEditar && <>
          <BotonLote onClick={() => marcarComo('es_cliente', true, 'marcadas como cliente')}>Marcar cliente</BotonLote>
          <BotonLote onClick={() => marcarComo('es_proveedor', true, 'marcadas como proveedor')}>Marcar proveedor</BotonLote>
          <BotonLote onClick={() => loteEstado('activo')}>Estado: activo</BotonLote>
          <BotonLote onClick={() => loteEstado('potencial')}>Estado: potencial</BotonLote>
        </>}
        {puedeBorrar && <BotonLote onClick={loteBorrar} peligro>Eliminar</BotonLote>}
      </BarraLote>

      <InformeLote estado={lote.estado} onCerrar={lote.cerrarEstado} nombreDe={(e) => nombreVisible(e)} />
      {avisoCopia && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[12.5px] font-bold text-emerald-300">{avisoCopia}</p>
      )}

      {diagBd && !diagBd.cargando && (
        <div className="space-y-2 rounded-xl border border-[#1E5468] bg-[#0D3242] p-3 text-[11.5px] leading-snug text-[#B9D2DA]">
          <div className="flex items-start justify-between gap-3">
            <p className={`font-extrabold ${diagBd.problemas?.length ? 'text-red-300' : 'text-emerald-300'}`}>{diagBd.conclusion}</p>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => navigator.clipboard?.writeText(informeTexto(diagBd))}
                className="rounded border border-[#1E5468] px-2 py-1 text-[11px] font-bold text-[#9FC0CB] hover:border-brand-verde">copiar informe</button>
              <button onClick={() => setDiagBd(null)} className="text-[#7FA7B4] hover:text-white">×</button>
            </div>
          </div>

          {diagBd.sesion && (
            <p>Sesión: <b className="text-[#EAF4F7]">{diagBd.sesion.email}</b>
              {diagBd.perfil?.fila
                ? <> · perfiles: rol <b className="text-[#EAF4F7]">{diagBd.perfil.fila.rol}</b>, activo <b className={diagBd.perfil.fila.activo === true ? 'text-emerald-300' : 'text-red-300'}>{String(diagBd.perfil.fila.activo)}</b></>
                : <b className="text-red-300"> · sin fila en perfiles</b>}
            </p>
          )}

          {Object.entries(diagBd.tablas || {}).map(([t, x]) => (
            <p key={t}>
              <b className="text-[#EAF4F7]">{t}</b> ·
              lectura <span className={x.lectura?.ok ? 'text-emerald-300' : 'text-red-300'}>{x.lectura?.ok ? 'ok' : 'no'}</span> ·
              escritura <span className={x.escritura?.ok ? (x.escritura.leidaDeVuelta ? 'text-emerald-300' : 'text-brand-orange') : 'text-red-300'}>
                {x.escritura?.ok ? (x.escritura.leidaDeVuelta ? 'ok' : 'crea pero no lee') : 'no'}
              </span>
              {x.escritura && !x.escritura.ok && <> · <code className="text-[#EAF4F7]">{x.escritura.code} {x.escritura.message}</code></>}
              {x.columnasAusentes?.length > 0 && <> · faltan columnas: <code className="text-red-300">{x.columnasAusentes.join(', ')}</code></>}
            </p>
          ))}

          {diagBd.problemas?.length > 0 && (
            <ul className="space-y-1 border-t border-[#1E5468] pt-2 font-semibold text-red-300">
              {diagBd.problemas.map((pr, i) => <li key={i}>· {pr}</li>)}
            </ul>
          )}
        </div>
      )}

      {(rojas > 0 || huerfanos > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-red-500/10 p-3 text-xs font-bold text-red-300">
          <span>
            {rojas > 0 && `${rojas} empresa(s) sin contacto o con contactos sin email`}
            {rojas > 0 && huerfanos > 0 && ' · '}
            {huerfanos > 0 && `${huerfanos} contacto(s) sin empresa`}
          </span>
          {rojas > 0 && (
            <button onClick={() => setFiltro('incidencia')} className="underline hover:text-red-200">ver empresas</button>
          )}
          {huerfanos > 0 && (
            <button onClick={() => navigate({ pathname: '../contactos', search: '?filtro=huerfanos' })} className="underline hover:text-red-200">
              ver contactos
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, CIF, población…" className="input max-w-xs !py-2" />
        <div className="flex flex-wrap overflow-hidden rounded-xl border border-[#1E5468] text-xs font-bold">
          {FILTROS.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 py-2 ${filtro === k ? 'bg-brand-verde text-[#061F2B]' : 'text-[#9FC0CB] hover:text-[#EAF4F7]'}`}>
              {l}{k === 'incidencia' && rojas > 0 ? ` (${rojas})` : ''}{k === 'sin_revisar' && sinRevisar > 0 ? ` (${sinRevisar})` : ''}
            </button>
          ))}
        </div>
        <span className="text-xs font-semibold text-[#7FA7B4]">{lista.length} de {empresas.length}</span>
      </div>

      {cargando ? <p className="py-10 text-center text-[#7FA7B4]">Cargando…</p> : (
        <div className="card overflow-hidden p-0">
          <div className="max-h-[640px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[#0D3242] text-[10px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">
                <tr>
                  <th className="w-9 px-2 py-2.5">
                    <CasillaTodos marcado={lote.todosMarcados} onCambio={lote.alternarTodos} />
                  </th>
                  <th className="px-5 py-2.5 text-left">Empresa</th>
                  <th className="hidden px-3 py-2.5 text-left sm:table-cell">Tipo</th>
                  <th className="hidden px-3 py-2.5 text-left md:table-cell">Estado</th>
                  <th className="px-3 py-2.5 text-right">Contactos</th>
                </tr>
              </thead>
              <tbody>
                {lista.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-[#7FA7B4]">
                    {empresas.length === 0 ? (
                      errorCarga ? (
                        <>
                          <b className="text-red-300">No se pudo leer la tabla de empresas.</b>
                          <span className="mt-1 block text-[11.5px] text-[#7FA7B4]">{errorCarga}</span>
                          <span className="mt-1 block text-[11.5px] text-[#7FA7B4]">
                            Si dice que la relación no existe, faltan las migraciones v48 y v56.
                          </span>
                        </>
                      ) : (
                        <>
                          Todavía no hay ninguna empresa.
                          {puedeEditar && <> Crea la primera con <b className="text-[#EAF4F7]">+ Nueva empresa</b>.</>}
                          {['superadmin', 'admin'].includes(role) && (
                            <span className="mt-2 block text-[11.5px] text-[#7FA7B4]">
                              ¿Has intentado crear una y no se guarda? Pulsa
                              {' '}<button onClick={comprobarBd} className="font-bold text-brand-orange underline">Comprobar base de datos</button>:
                              {' '}escribe con tu sesión y te dice el motivo exacto.
                            </span>
                          )}
                        </>
                      )
                    ) : 'Ninguna empresa con ese filtro.'}
                  </td></tr>
                )}
                {lista.map((e) => {
                  const s = semaforos.get(String(e.id));
                  return (
                    <tr key={e.id}
                      className={`border-b border-[#1E5468]/60 last:border-0 hover:bg-[#10394A] ${
                        lote.marcados.has(String(e.id)) ? 'bg-brand-orange/[0.07]' : ''}`}>
                      {/* La casilla va fuera del área que abre la ficha: marcar
                          para un lote y abrir para editar son gestos distintos
                          y no deben confundirse. */}
                      <td className="px-2 py-3" onClick={(ev) => ev.stopPropagation()}>
                        <input type="checkbox" aria-label={`Marcar ${nombreVisible(e)}`}
                          checked={lote.marcados.has(String(e.id))}
                          onChange={() => lote.alternar(e.id)} />
                      </td>
                      <td className="cursor-pointer px-5 py-3" onClick={() => seleccionar(e.id)}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${PUNTO[s.color]}`}
                            title={s.motivos.join(' · ') || 'Ficha completa'} />
                          <span className="font-bold text-[#EAF4F7]">{nombreVisible(e)}</span>
                        </div>
                        <div className="ml-4 text-xs text-[#7FA7B4]">
                          {/* La razón social solo aparece cuando difiere del
                              nombre comercial: repetirla en cada fila es ruido. */}
                          {tieneComercialDistinto(e) && <span className="block truncate">{e.nombre}</span>}
                          {e.cif || 'sin CIF'}{e.poblacion ? ` · ${e.poblacion}` : ''}
                          {e.empresa_matriz_id ? ' · filial' : ''}
                        </div>
                      </td>
                      <td onClick={() => seleccionar(e.id)} className="cursor-pointer hidden px-3 py-3 sm:table-cell">
                        <span className="inline-flex flex-wrap gap-1">
                          {e.es_cliente && <span className="chip bg-brand-orange/15 !px-2 !py-0.5 text-[10px] text-brand-orange">Cliente</span>}
                          {e.es_proveedor && <span className="chip bg-brand-verde/15 !px-2 !py-0.5 text-[10px] text-brand-verdeTexto">Proveedor</span>}
                          {!e.es_cliente && !e.es_proveedor && <span className="text-[10px] text-[#7FA7B4]">—</span>}
                        </span>
                      </td>
                      <td onClick={() => seleccionar(e.id)} className="cursor-pointer hidden px-3 py-3 text-xs font-semibold text-[#9FC0CB] md:table-cell">
                        {ESTADOS_COMERCIALES.find((x) => x.k === e.estado_comercial)?.label || 'Potencial'}
                      </td>
                      <td onClick={() => seleccionar(e.id)} className="cursor-pointer px-3 py-3 text-right text-xs font-bold text-[#9FC0CB]">{s.n}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
