import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listTable } from '../../lib/data.js';

// ════════════════════════════════════════════════════════════════════════════
// PROVEEDORES
//
// El listado de empresas los mezcla con los clientes, y de un proveedor no se
// mira lo mismo: interesa si está homologado, para qué normas y si algo caduca.
//
// Lo que hace útil esta pantalla es el AVISO: un certificado que vence en dos
// meses no es un problema hoy, pero lo será, y descubrirlo el día de la
// auditoría es tarde.
// ════════════════════════════════════════════════════════════════════════════

const NORMAS = [
  { id: '9001', etq: 'ISO 9001' }, { id: '14001', etq: 'ISO 14001' },
  { id: '27001', etq: 'ISO 27001' }, { id: '45001', etq: 'ISO 45001' },
];

const ESTADO = {
  homologado:   { etq: 'Homologado',   tono: 'bg-emerald-500/15 text-emerald-300', orden: 1 },
  condicionado: { etq: 'Condicionado', tono: 'bg-brand-orange/15 text-brand-orange', orden: 2 },
  pendiente:    { etq: 'Pendiente',    tono: 'bg-white/8 text-[#9FC0CB]', orden: 3 },
  caducado:     { etq: 'Caducado',     tono: 'bg-red-500/15 text-red-300', orden: 0 },
  rechazado:    { etq: 'Rechazado',    tono: 'bg-red-500/15 text-red-300', orden: 0 },
};

const dias = (iso) => {
  if (!iso) return null;
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((d - hoy) / 864e5);
};
const fmt = (iso) => iso ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString('es-ES') : '—';

export default function Proveedores() {
  const navegar = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [homs, setHoms] = useState([]);
  const [conds, setConds] = useState([]);
  const [archivos, setArchivos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState(null);

  const cargar = useCallback(() => Promise.all([
    listTable('empresas').catch(() => []),
    listTable('homologaciones_norma').catch(() => []),
    listTable('homologacion_condiciones').catch(() => []),
    listTable('homologacion_archivos').catch(() => []),
  ]).then(([e, h, c, a]) => {
    setEmpresas((e || []).filter((x) => x.es_proveedor));
    setHoms(h || []); setConds(c || []); setArchivos(a || []);
  }).finally(() => setCargando(false)), []);

  useEffect(() => { cargar(); }, [cargar]);

  /** El estado sale de las condiciones, igual que en la ficha. */
  const estadoDe = useCallback((h) => {
    const cs = conds.filter((c) => String(c.homologacion_id) === String(h.id));
    const obl = cs.filter((c) => c.obligatoria);
    const caducadoArch = archivos.some((a) => String(a.homologacion_id) === String(h.id)
      && a.caduca && dias(a.caduca) < 0);
    if (h.hasta && dias(h.hasta) < 0) return 'caducado';
    if (h.estado === 'rechazado') return 'rechazado';
    if (caducadoArch) return 'condicionado';
    if (!obl.length || obl.some((c) => !c.cumplida)) return 'pendiente';
    return cs.every((c) => c.cumplida) ? 'homologado' : 'condicionado';
  }, [conds, archivos]);

  const filas = useMemo(() => empresas.map((e) => {
    const suyas = homs.filter((h) => String(h.empresa_id) === String(e.id));
    const porNorma = suyas.map((h) => ({ norma: h.norma, estado: estadoDe(h), h }));
    // Lo que vence pronto: es el aviso que da valor a la pantalla.
    const venceEn = archivos
      .filter((a) => suyas.some((h) => String(h.id) === String(a.homologacion_id)) && a.caduca)
      .map((a) => ({ ...a, d: dias(a.caduca) }))
      .sort((x, y) => x.d - y.d)[0] || null;
    const peor = porNorma.reduce((p, x) => {
      const o = ESTADO[x.estado]?.orden ?? 9;
      return o < (ESTADO[p]?.orden ?? 9) ? x.estado : p;
    }, 'homologado');
    return { e, porNorma, venceEn, peor: porNorma.length ? peor : 'sin_abrir' };
  }), [empresas, homs, archivos, estadoDe]);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return filas
      .filter((f) => !filtro || (filtro === 'vence'
        ? f.venceEn && f.venceEn.d <= 60
        : f.peor === filtro))
      .filter((f) => !t || [f.e.nombre, f.e.cif, f.e.poblacion].filter(Boolean).join(' ').toLowerCase().includes(t))
      .sort((a, b) => (ESTADO[a.peor]?.orden ?? 9) - (ESTADO[b.peor]?.orden ?? 9));
  }, [filas, q, filtro]);

  const cuenta = (k) => k === 'vence'
    ? filas.filter((f) => f.venceEn && f.venceEn.d <= 60).length
    : filas.filter((f) => f.peor === k).length;

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando proveedores…</p>;

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow">CRM</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#EAF4F7]">Proveedores</h1>
        <p className="mt-1 text-sm text-[#9FC0CB]">
          Quién está homologado, para qué normas, y qué caduca pronto.
        </p>
      </div>

      {/* Las cifras: pulsar filtra */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          ['caducado', 'Caducados', 'text-red-300'],
          ['condicionado', 'Condicionados', 'text-brand-orange'],
          ['pendiente', 'Pendientes', 'text-[#9FC0CB]'],
          ['homologado', 'Homologados', 'text-emerald-300'],
          ['vence', 'Vencen en 60 días', 'text-brand-orange'],
        ].map(([k, etq, color]) => (
          <button key={k} onClick={() => setFiltro(filtro === k ? null : k)}
            className={`rounded-xl border border-[#1E5468] bg-[#0D3242] px-4 py-3 text-left transition hover:border-brand-orange ${
              filtro === k ? 'ring-1 ring-brand-orange' : ''}`}>
            <span className={`block text-2xl font-extrabold leading-none ${color}`}>{cuenta(k)}</span>
            <span className="mt-1 block text-[10.5px] font-extrabold uppercase tracking-wide text-[#7FA7B4]">{etq}</span>
          </button>
        ))}
      </div>

      <input className="input !py-2 !text-[13px]" placeholder="Buscar por nombre, CIF, población…"
        value={q} onChange={(e) => setQ(e.target.value)} />

      {lista.length === 0 ? (
        <p className="card py-8 text-center text-[13px] text-[#7FA7B4]">
          {empresas.length === 0
            ? 'Todavía no hay ninguna empresa marcada como proveedor. Márcala en su ficha.'
            : 'Ningún proveedor con ese criterio.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map(({ e, porNorma, venceEn, peor }) => (
            <li key={e.id}>
              <button onClick={() => navegar({ pathname: '../empresas', search: `?e=${e.id}` })}
                className="w-full rounded-xl border border-[#1E5468] bg-[#0D3242] p-3 text-left transition hover:border-brand-orange">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-[#EAF4F7]">{e.nombre}</span>
                    <span className="text-[11.5px] text-[#7FA7B4]">
                      {e.cif || 'sin CIF'}{e.poblacion ? ` · ${e.poblacion}` : ''}
                    </span>
                  </span>
                  {peor === 'sin_abrir' ? (
                    <span className="chip !px-2 !py-0.5 bg-white/8 text-[10.5px] text-[#7FA7B4]">sin homologar</span>
                  ) : (
                    <span className={`chip !px-2 !py-0.5 text-[10.5px] font-extrabold ${ESTADO[peor]?.tono}`}>
                      {ESTADO[peor]?.etq}
                    </span>
                  )}
                </div>

                {porNorma.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {porNorma.map((x) => (
                      <span key={x.norma}
                        className={`chip !px-2 !py-0 text-[10px] font-bold ${ESTADO[x.estado]?.tono}`}>
                        {NORMAS.find((n) => n.id === x.norma)?.etq || x.norma} · {ESTADO[x.estado]?.etq}
                      </span>
                    ))}
                  </div>
                )}

                {venceEn && venceEn.d <= 60 && (
                  <p className={`mt-1.5 text-[11.5px] font-bold ${venceEn.d < 0 ? 'text-red-300' : 'text-brand-orange'}`}>
                    {venceEn.d < 0
                      ? `«${venceEn.nombre}» caducó el ${fmt(venceEn.caduca)}`
                      : `«${venceEn.nombre}» vence en ${venceEn.d} días (${fmt(venceEn.caduca)})`}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
