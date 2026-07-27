import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { ROL_LABEL } from '../../lib/permisos.js';
import { NORMAS } from '../../lib/calcEngine.js';
import { ROLES_CLIENTE, ROL_CLIENTE_LABEL } from '../../lib/permisos.js';
import { listTable, insertRow, deleteRow, updateRow } from '../../lib/data.js';

const ROLES_ASIGNABLES = ['superadmin', 'admin', 'director', 'consultor', 'gestion'];
const ROLES_DOMINIO = ['director', 'consultor'];
const DOMINIOS_PERMITIDOS = ['tuconsultor.com', 'consultify.pro'];
const dominioOk = (email, rol) => {
  if (!ROLES_DOMINIO.includes(rol)) return true;
  const dom = String(email).split('@')[1]?.toLowerCase() || '';
  return DOMINIOS_PERMITIDOS.includes(dom);
};
const NIVELES = ['J1', 'J2', 'J3', 'Senior'];

function Badge({ children, tone = 'navy' }) {
  const map = {
    navy: 'bg-[#123F52] text-[#CFE3E9]',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-300',
    orange: 'bg-brand-orange/20 text-[#F9A83A]',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${map[tone]}`}>{children}</span>;
}

export default function Accesos() {
  const { adminUsuarios, esSuper, user, demo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  // Formulario de invitación (incluye datos de agenda: nivel, normas, capacidad)
  const [inv, setInv] = useState({ email: '', nombre: '', apellidos: '', rol: 'consultor', nivel: '', normas: [], capacidad_clientes: 12 });
  const [invBusy, setInvBusy] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [asignando, setAsignando] = useState(null); // id de usuario con el panel abierto
  const [nuevo, setNuevo] = useState({ cliente_id: '', rol_cliente: 'consultor' });

  async function cargarClientes() {
    try {
      const [c, m] = await Promise.all([
        listTable('clientes').catch(() => []),
        listTable('miembros_cliente').catch(() => []),
      ]);
      setClientes(c || []); setMiembros(m || []);
    } catch { /* sin datos */ }
  }
  useEffect(() => { if (esSuper) cargarClientes(); }, [esSuper]);

  async function asignar(usuarioId) {
    if (!nuevo.cliente_id) return;
    setMsg(null); setError(null);
    try {
      await insertRow('miembros_cliente', { usuario_id: usuarioId, cliente_id: nuevo.cliente_id, rol_cliente: nuevo.rol_cliente });
      setNuevo({ cliente_id: '', rol_cliente: 'consultor' });
      setMsg('Cliente asignado.'); cargarClientes();
    } catch { setError('No se pudo asignar (¿ya estaba asignado?).'); }
  }
  async function quitarAsignacion(m) {
    try { await deleteRow('miembros_cliente', m.id); cargarClientes(); }
    catch { setError('No se pudo quitar la asignación.'); }
  }
  async function cambiarRolCliente(m, rol) {
    try { await updateRow('miembros_cliente', m.id, { rol_cliente: rol }); cargarClientes(); }
    catch { setError('No se pudo cambiar el rol en el cliente.'); }
  }

  async function cargar() {
    setCargando(true); setError(null);
    try {
      const r = await adminUsuarios({ action: 'list' });
      if (r.ok) setUsuarios(r.usuarios || []);
      else setError(r.error || 'No se pudo cargar la lista.');
    } catch (e) { setError('Error de conexión.'); }
    finally { setCargando(false); }
  }
  useEffect(() => { if (esSuper) cargar(); }, [esSuper]);

  if (!esSuper) {
    return <div className="card"><p className="font-bold text-[#CFE3E9]">Acceso restringido</p><p className="text-sm text-[#9FC0CB]">Solo el superadministrador puede gestionar los accesos.</p></div>;
  }

  async function invitar(e) {
    e.preventDefault(); setInvBusy(true); setMsg(null); setError(null);
    // Validación de dominio en cliente (feedback inmediato); el backend la repite.
    if (!dominioOk(inv.email.trim(), inv.rol)) {
      setError('Para Director de Proyecto o Consultor, el email debe ser @tuconsultor.com o @consultify.pro.');
      setInvBusy(false); return;
    }
    try {
      const r = await adminUsuarios({ action: 'invite', email: inv.email.trim(), nombre: inv.nombre.trim(), apellidos: inv.apellidos.trim(), rol: inv.rol, nivel: inv.nivel || null, normas: inv.normas || [], capacidad_clientes: inv.capacidad_clientes ?? 12 });
      if (r.ok) {
        setMsg(`Invitación enviada a ${inv.email}. Recibirá un email para poner su contraseña.`);
        setInv({ email: '', nombre: '', apellidos: '', rol: 'consultor', nivel: '', normas: [], capacidad_clientes: 12 });
        cargar();
      } else setError(r.error || 'No se pudo invitar.');
    } catch { setError('Error de conexión.'); }
    finally { setInvBusy(false); }
  }

  async function cambiarRol(id, rol) {
    setMsg(null); setError(null);
    const r = await adminUsuarios({ action: 'set_role', id, rol });
    if (r.ok) { setMsg('Rol actualizado.'); cargar(); } else setError(r.error || 'No se pudo cambiar el rol.');
  }

  async function toggleActivo(u) {
    setMsg(null); setError(null);
    const r = await adminUsuarios({ action: 'set_active', id: u.id, activo: !u.activo });
    if (r.ok) { setMsg(u.activo ? 'Usuario desactivado.' : 'Usuario reactivado.'); cargar(); }
    else setError(r.error || 'No se pudo cambiar el estado.');
  }

  async function resetPassword(u) {
    if (!u.email) { setError('Ese usuario no tiene email registrado.'); return; }
    if (!window.confirm(`¿Enviar a ${u.email} un email para restablecer su contraseña?`)) return;
    setMsg(null); setError(null);
    const r = await adminUsuarios({ action: 'reset_password', email: u.email });
    if (r.ok) setMsg(`Email de restablecimiento enviado a ${u.email}.`);
    else setError(r.error || 'No se pudo enviar el email.');
  }

  // Edición de perfil por el superadmin (nombre, apellidos, nivel, normas, capacidad)
  const [editando, setEditando] = useState(null); // {id, nombre, apellidos, nivel, normas, capacidad_clientes}
  async function guardarPerfil() {
    setMsg(null); setError(null);
    const r = await adminUsuarios({ action: 'update_perfil', ...editando });
    if (r.ok) { setMsg('Perfil actualizado.'); setEditando(null); cargar(); }
    else setError(r.error || 'No se pudo actualizar el perfil.');
  }

  async function eliminar(u) {
    if (!window.confirm(`¿Eliminar definitivamente a ${u.nombre || u.email}? Esta acción no se puede deshacer.`)) return;
    setMsg(null); setError(null);
    const r = await adminUsuarios({ action: 'delete', id: u.id });
    if (r.ok) { setMsg('Usuario eliminado.'); cargar(); } else setError(r.error || 'No se pudo eliminar.');
  }

  const fecha = (s) => s ? new Date(s).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Organización</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Accesos del equipo</h1>
        <p className="mt-1 text-sm font-medium text-[#9FC0CB]">Invita consultores, asigna su rol y activa o desactiva su acceso.</p>
      </div>

      {demo && <div className="rounded-xl bg-brand-orange/10 p-3 text-xs font-semibold text-[#F9A83A]">Modo demo: los cambios no se guardan. Con Supabase configurado, esto gestiona accesos reales.</div>}
      {msg && <div className="rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">{msg}</div>}
      {error && <div className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-300">{error}</div>}

      {/* Invitar */}
      <div className="card">
        <h2 className="mb-4 text-lg font-extrabold text-[#EAF4F7]">Invitar a un nuevo miembro</h2>
        <form onSubmit={invitar} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1"><label className="label">Nombre</label><input className="input" value={inv.nombre} onChange={e => setInv({ ...inv, nombre: e.target.value })} required /></div>
          <div className="lg:col-span-1"><label className="label">Apellidos</label><input className="input" value={inv.apellidos} onChange={e => setInv({ ...inv, apellidos: e.target.value })} /></div>
          <div className="lg:col-span-1"><label className="label">Email corporativo</label><input type="email" className="input" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} required /></div>
          <div><label className="label">Rol</label>
            <select className="input" value={inv.rol} onChange={e => setInv({ ...inv, rol: e.target.value })}>
              {ROLES_ASIGNABLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
            </select>
          </div>
          <div><label className="label">Nivel (consultor)</label>
            <select className="input" value={inv.nivel} onChange={e => setInv({ ...inv, nivel: e.target.value })}>
              <option value="">—</option>
              {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* Datos de agenda: solo para roles que ejecutan proyectos */}
          {['director', 'consultor'].includes(inv.rol) && (
            <>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="label">Normas que maneja</label>
                <div className="flex flex-wrap gap-1.5">
                  {NORMAS.map(n => {
                    const on = (inv.normas || []).includes(n.id);
                    return (
                      <button key={n.id} type="button"
                        onClick={() => setInv({ ...inv, normas: on ? inv.normas.filter(x => x !== n.id) : [...(inv.normas || []), n.id] })}
                        className={`chip border text-xs transition ${on ? 'border-brand-orange bg-brand-orange/15 text-[#F9A83A]' : 'border-[#1E5468] text-[#9FC0CB] hover:border-navy-400'}`}>
                        {on ? '✓ ' : ''}{n.id}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="label">Capacidad (clientes)</label>
                <input type="number" min="1" max="40" className="input" value={inv.capacidad_clientes}
                  onChange={e => setInv({ ...inv, capacidad_clientes: Number(e.target.value) || 12 })} />
              </div>
            </>
          )}
          <div className="sm:col-span-2 lg:col-span-4">
            <button disabled={invBusy} className="btn-primary">{invBusy ? 'Enviando invitación…' : 'Enviar invitación por email'}</button>
            <p className="mt-2 text-xs text-[#7FA7B4]">El miembro recibirá un email con un enlace para crear su propia contraseña.</p>
          </div>
        </form>
      </div>

      {/* Lista */}
      <div className="card overflow-hidden p-0">
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-lg font-extrabold text-[#EAF4F7]">Miembros del equipo</h2>
          <button onClick={cargar} className="text-sm font-bold text-[#9FC0CB] hover:text-[#EAF4F7]">↻ Actualizar</button>
        </div>
        {cargando ? (
          <p className="px-5 py-8 text-center text-[#9FC0CB]">Cargando…</p>
        ) : usuarios.length === 0 ? (
          <p className="px-5 py-8 text-center text-[#9FC0CB]">Aún no hay miembros. Invita al primero arriba.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-[#1E5468] bg-navy-50/50 text-left text-xs font-bold uppercase tracking-wide text-[#9FC0CB]">
                  <th className="px-5 py-3">Miembro</th>
                  <th className="px-3 py-3">Rol</th>
                  <th className="px-3 py-3">Nivel</th>
                  <th className="px-3 py-3">Estado</th>
                  <th className="px-3 py-3">Último acceso</th>
                  <th className="px-5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => {
                  const yo = u.id === user?.id;
                  return (
                    <tr key={u.id} className="border-b border-navy-50 last:border-0">
                      <td className="px-5 py-3">
                        <div className="font-bold text-[#EAF4F7]">{[u.nombre, u.apellidos].filter(Boolean).join(' ') || '—'} {yo && <span className="text-xs font-semibold text-[#7FA7B4]">(tú)</span>}</div>
                        <div className="text-xs text-[#9FC0CB]">{u.email}</div>
                      </td>
                      <td className="px-3 py-3">
                        <select value={u.rol} disabled={yo} onChange={e => cambiarRol(u.id, e.target.value)}
                          className="rounded-lg border border-[#1E5468] bg-[#10394A] px-2 py-1 text-xs font-bold text-[#CFE3E9] disabled:opacity-50">
                          {ROLES_ASIGNABLES.map(r => <option key={r} value={r}>{ROL_LABEL[r]}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          {u.nivel ? <Badge>{u.nivel}</Badge> : <span className="text-[#7FA7B4]">—</span>}
                          <button onClick={() => { setAsignando(asignando === u.id ? null : u.id); setNuevo({ cliente_id: '', rol_cliente: u.rol === 'cliente' ? 'usuario_cliente' : 'consultor' }); }}
                            className="text-left text-[11px] font-bold text-[#F9A83A] hover:underline">
                            Clientes ({miembros.filter(m => m.usuario_id === u.id).length}) {asignando === u.id ? '▴' : '▾'}
                          </button>
                          {asignando === u.id && (
                            <div className="mt-1 w-64 rounded-xl border border-[#1E5468] bg-navy-50/60 p-2">
                              {miembros.filter(m => m.usuario_id === u.id).map(m => {
                                const c = clientes.find(x => x.id === m.cliente_id);
                                return (
                                  <div key={m.id} className="mb-1 flex items-center justify-between gap-1 rounded-lg bg-[#10394A] px-2 py-1">
                                    <span className="truncate text-[11px] font-bold text-[#EAF4F7]">{c?.nombre || c?.empresa || `#${m.cliente_id}`}</span>
                                    <select value={m.rol_cliente} onChange={e => cambiarRolCliente(m, e.target.value)}
                                      className="rounded border border-[#1E5468] px-1 py-0.5 text-[10px] font-bold text-[#B9D2DA]">
                                      {ROLES_CLIENTE.filter(r => u.rol === 'cliente' || r !== 'usuario_cliente').map(r => <option key={r} value={r}>{ROL_CLIENTE_LABEL[r]}</option>)}
                                    </select>
                                    <button onClick={() => quitarAsignacion(m)} className="text-xs font-bold text-red-500" title="Quitar">✕</button>
                                  </div>
                                );
                              })}
                              <div className="mt-1.5 flex items-center gap-1">
                                <select value={nuevo.cliente_id} onChange={e => setNuevo(n => ({ ...n, cliente_id: e.target.value }))}
                                  className="w-28 rounded border border-[#1E5468] px-1 py-1 text-[10px] font-bold text-[#B9D2DA]">
                                  <option value="">Cliente…</option>
                                  {clientes.filter(c => !miembros.some(m => m.usuario_id === u.id && m.cliente_id === c.id)).map(c =>
                                    <option key={c.id} value={c.id}>{c.nombre || c.empresa || `#${c.id}`}</option>)}
                                </select>
                                <select value={nuevo.rol_cliente} onChange={e => setNuevo(n => ({ ...n, rol_cliente: e.target.value }))}
                                  className="rounded border border-[#1E5468] px-1 py-1 text-[10px] font-bold text-[#B9D2DA]">
                                  {ROLES_CLIENTE.filter(r => u.rol === 'cliente' || r !== 'usuario_cliente').map(r => <option key={r} value={r}>{ROL_CLIENTE_LABEL[r]}</option>)}
                                </select>
                                <button onClick={() => asignar(u.id)} className="rounded-lg bg-brand-orange px-2 py-1 text-[10px] font-extrabold text-[#0A2B3A]">Añadir</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">{u.activo ? <Badge tone="green">Activo</Badge> : <Badge tone="red">Desactivado</Badge>}</td>
                      <td className="px-3 py-3 text-[#9FC0CB]">{fecha(u.ultimo_acceso)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setEditando({ id: u.id, nombre: u.nombre || '', apellidos: u.apellidos || '', nivel: u.nivel || '', normas: u.normas || [], capacidad_clientes: u.capacidad_clientes ?? 12 })}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#9FC0CB] hover:bg-[#0D3242]" title="Editar datos del perfil">
                            Editar
                          </button>
                          <button onClick={() => resetPassword(u)}
                            className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#9FC0CB] hover:bg-[#0D3242]" title="Enviar email para restablecer contraseña">
                            Resetear contraseña
                          </button>
                          <button onClick={() => toggleActivo(u)} disabled={yo}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-40 ${u.activo ? 'bg-red-50 text-red-300 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                            {u.activo ? 'Desactivar' : 'Reactivar'}
                          </button>
                          <button onClick={() => eliminar(u)} disabled={yo}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#9FC0CB] hover:bg-[#0D3242] hover:text-red-300 disabled:opacity-40" aria-label="Eliminar">
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edición de perfil (superadmin) */}
      {editando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/70 p-4" onClick={() => setEditando(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-[#10394A] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-extrabold text-[#EAF4F7]">Editar perfil</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><label className="label">Nombre</label><input className="input" value={editando.nombre} onChange={e => setEditando({ ...editando, nombre: e.target.value })} /></div>
              <div><label className="label">Apellidos</label><input className="input" value={editando.apellidos} onChange={e => setEditando({ ...editando, apellidos: e.target.value })} /></div>
              <div><label className="label">Nivel</label>
                <select className="input" value={editando.nivel} onChange={e => setEditando({ ...editando, nivel: e.target.value })}>
                  <option value="">—</option>
                  {NIVELES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div><label className="label">Capacidad (clientes)</label><input type="number" min="1" max="40" className="input" value={editando.capacidad_clientes} onChange={e => setEditando({ ...editando, capacidad_clientes: Number(e.target.value) || 12 })} /></div>
              <div className="sm:col-span-2">
                <label className="label">Normas que maneja</label>
                <div className="flex flex-wrap gap-1.5">
                  {NORMAS.map(n => {
                    const on = (editando.normas || []).includes(n.id);
                    return (
                      <button key={n.id} type="button"
                        onClick={() => setEditando({ ...editando, normas: on ? editando.normas.filter(x => x !== n.id) : [...(editando.normas || []), n.id] })}
                        className={`chip border text-xs transition ${on ? 'border-brand-orange bg-brand-orange/15 text-[#F9A83A]' : 'border-[#1E5468] text-[#9FC0CB] hover:border-navy-400'}`}>
                        {on ? '✓ ' : ''}{n.id}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={guardarPerfil} className="btn-primary">Guardar</button>
              <button onClick={() => setEditando(null)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
