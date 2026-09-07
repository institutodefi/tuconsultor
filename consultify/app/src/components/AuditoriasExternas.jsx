import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listTable, updateRow } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';
import { can } from '../lib/permisos.js';
import { estadoAuditoriaProyecto, fmt, TONO, aISO, DIAS_AMBAR, DIAS_ROJO } from '../lib/auditorias.js';
import { NORMA_BY_ID } from '../lib/calcEngine.js';

// ════════════════════════════════════════════════════════════════════════════
// AUDITORÍAS EXTERNAS · el aviso del panel
//
// Un proyecto vivo por fila con su próxima auditoría externa:
//   · si está programada (fecha en la ficha del proyecto), esa fecha;
//   · si no, «sin programar» y la fecha límite estimada a partir de los
//     certificados del cliente (cada año desde la certificación, y la
//     renovación al vencer la validez).
//
// Ámbar a tres meses, rojo a treinta días (o ya pasada). Se ordena por
// urgencia: lo primero que se ve es lo que hay que resolver.
// ════════════════════════════════════════════════════════════════════════════

const ORDEN = { rojo: 0, ambar: 1, gris: 2, verde: 3 };
const VIVOS = (p) => !['cerrado', 'cancelado', 'finalizado'].includes(String(p.estado || '').toLowerCase());

export default function AuditoriasExternas({ compacto = false, soloAvisos = false }) {
  const { role } = useAuth();
  const puedeEditar = can.esEquipo(role);
  const [d, setD] = useState(null);
  const [guardando, setGuardando] = useState(null);

  const cargar = async () => {
    const [proyectos, certs, clientes, empresas] = await Promise.all([
      listTable('proyectos_cliente').catch(() => []),
      listTable('cliente_certificados').catch(() => []),
      listTable('clientes').catch(() => []),
      listTable('empresas').catch(() => []),
    ]);
    setD({ proyectos, certs, clientes, empresas });
  };
  useEffect(() => { cargar(); }, []);

  const filas = useMemo(() => {
    if (!d) return [];
    const hoy = aISO(new Date());
    const cif = (x) => String(x || '').toUpperCase().replace(/[\s.-]/g, '');
    const empresaPorCif = Object.fromEntries((d.empresas || []).filter((e) => e.cif).map((e) => [cif(e.cif), e]));
    const nombreCliente = (p) => {
      const c = (d.clientes || []).find((x) => String(x.id) === String(p.cliente_id));
      const e = c?.cif ? empresaPorCif[cif(c.cif)] : null;
      return e?.nombre_comercial || e?.nombre || c?.empresa || '—';
    };
    return (d.proyectos || []).filter(VIVOS).map((p) => ({
      p, cliente: nombreCliente(p), ...estadoAuditoriaProyecto(p, d.certs, hoy),
    })).sort((a, b) => ORDEN[a.color] - ORDEN[b.color] || (a.dias ?? 1e9) - (b.dias ?? 1e9));
  }, [d]);

  const visibles = soloAvisos ? filas.filter((f) => f.color === 'rojo' || f.color === 'ambar' || f.sinProgramar) : filas;
  const nRojo = filas.filter((f) => f.color === 'rojo').length;
  const nAmbar = filas.filter((f) => f.color === 'ambar').length;
  const nSin = filas.filter((f) => f.sinProgramar).length;

  async function programar(f, fecha) {
    setGuardando(f.p.id);
    try { await updateRow('proyectos_cliente', f.p.id, { fecha_auditoria_externa: fecha || null }); await cargar(); }
    catch { /* la ficha del proyecto enseña el error completo */ }
    finally { setGuardando(null); }
  }

  if (!d) return <p className="text-[12.5px] text-[#7FA7B4]">Cargando auditorías…</p>;

  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[14px] font-extrabold text-[#EAF4F7]">Auditorías externas</h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {nRojo > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.rojo.chip}`}>{nRojo} a menos de {DIAS_ROJO} días</span>}
          {nAmbar > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.ambar.chip}`}>{nAmbar} a menos de 3 meses</span>}
          {nSin > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.gris.chip}`}>{nSin} sin programar</span>}
          {!nRojo && !nAmbar && !nSin && filas.length > 0 && <span className={`chip border !px-2 !py-0.5 ${TONO.verde.chip}`}>todo en plazo</span>}
        </div>
      </div>
      <p className="mt-1 text-[11.5px] text-[#7FA7B4]">
        Cada certificado pasa auditoría externa cada año. Ámbar a {DIAS_AMBAR} días, rojo a {DIAS_ROJO}. Sin fecha programada, se estima desde los certificados del cliente.
      </p>

      {visibles.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-[#7FA7B4]">{filas.length ? 'Nada pendiente: todas las auditorías están programadas y en plazo.' : 'No hay proyectos vivos.'}</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#153F52]">
          {visibles.slice(0, compacto ? 6 : undefined).map((f) => {
            const T = TONO[f.color];
            return (
              <li key={f.p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: T.punto }} title={T.etq} />
                <span className="min-w-0 flex-1">
                  <Link to={`/consultores/proyectos?proyecto=${f.p.id}`} className="block truncate text-[13px] font-bold text-[#EAF4F7] hover:text-brand-orange hover:underline">
                    {f.cliente} <span className="font-medium text-[#9FC0CB]">· {(f.p.normas || []).map((n) => NORMA_BY_ID[n]?.nombre || n).join(', ')}</span>
                  </Link>
                  <span className={`block text-[11.5px] ${f.color === 'rojo' ? 'text-red-200' : f.color === 'ambar' ? 'text-amber-100' : 'text-[#9FC0CB]'}`}>{f.texto}</span>
                </span>
                {f.estimada && f.programada && (
                  <span className="text-[10.5px] text-[#5E8494]" title="Estimación desde el certificado">límite {fmt(f.estimada)}</span>
                )}
                {puedeEditar && !compacto && (
                  <input type="date" className="input !w-[150px] !px-2 !py-1 !text-[11.5px]"
                    value={f.programada || ''} disabled={guardando === f.p.id}
                    title="Fecha de la auditoría externa programada"
                    onChange={(e) => programar(f, e.target.value)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
      {compacto && visibles.length > 6 && (
        <Link to="/consultores/panel" className="mt-2 inline-block text-[12px] font-bold text-brand-orange hover:underline">Ver las {visibles.length} →</Link>
      )}
    </div>
  );
}
