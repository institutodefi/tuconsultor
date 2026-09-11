import { useEffect, useState } from 'react';
import { listTable, insertRow, updateRow, deleteRow, explicarErrorBd } from '../lib/data.js';
import { ROLES_CUENTA } from '../lib/cuentaClientePuro.js';
import { useAuth } from '../lib/auth.jsx';
import { esGratuito } from '../lib/dominios.js';

// ════════════════════════════════════════════════════════════════════════════
// USUARIOS DE LA CUENTA DE CLIENTE
//
// Quién puede entrar en Órbita por esta empresa y con qué papel:
//   · administrador de cuenta · gestiona datos de empresa, sedes,
//     certificados, personas de contacto y usuarios.
//   · usuario de cuenta       · usa el portal de proyectos y sus datos.
// Va por correo (cliente_usuarios, v127): la persona entra creando su cuenta
// en Órbita con ese mismo correo; no hay que enlazar nada más. Lo usan el
// administrador de la cuenta desde el portal y el equipo desde la ficha.
// ════════════════════════════════════════════════════════════════════════════

const T = (v) => String(v ?? '').trim();
const low = (v) => T(v).toLowerCase();
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(T(v));

export default function UsuariosCuenta({ clienteId, email = '', puedeGestionar = true, titulo = 'Usuarios de la cuenta' }) {
  const { role, adminUsuarios } = useAuth();
  const puedeInvitar = ['superadmin', 'admin'].includes(role);
  const [invitando, setInvitando] = useState(null);
  // Invitación de Supabase: la persona recibe un correo para poner su
  // contraseña. Es la vía para correos genéricos (Gmail…), que el registro
  // público no admite: la excepción la decide Administración desde aquí.
  async function invitar(u) {
    setInvitando(u.id); setMsg(null);
    try {
      const r = await adminUsuarios({ action: 'invite', email: low(u.email), nombre: T(u.nombre), apellidos: '', rol: 'cliente' });
      if (r?.ok) setMsg({ err: false, t: `Invitación enviada a ${u.email}: recibirá un correo para poner su contraseña.` });
      else if (/ya tiene cuenta/i.test(r?.error || '')) setMsg({ err: false, t: `${u.email} ya tiene cuenta: entra con su contraseña y verá esta empresa.` });
      else setMsg({ err: true, t: r?.error || 'No se pudo invitar.' });
    } catch (e) { setMsg({ err: true, t: String(e?.message || e) }); }
    finally { setInvitando(null); }
  }
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(null);
  const [msg, setMsg] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [sinTabla, setSinTabla] = useState(false);

  const cargar = async () => {
    const r = await listTable('cliente_usuarios').catch(() => null);
    setSinTabla(r === null);
    setLista((r || []).filter((u) => String(u.cliente_id) === String(clienteId))
      .sort((a, b) => (a.rol_cuenta === b.rol_cuenta ? low(a.email).localeCompare(low(b.email)) : a.rol_cuenta === 'admin' ? -1 : 1)));
  };
  useEffect(() => { if (clienteId) cargar(); }, [clienteId]);   // eslint-disable-line react-hooks/exhaustive-deps

  const soyYo = (u) => low(u.email) === low(email);
  const admins = (lista || []).filter((u) => u.rol_cuenta === 'admin');

  async function guardar() {
    const f = form;
    if (!emailOk(f.email)) { setMsg({ err: true, t: 'Pon un correo válido.' }); return; }
    if ((lista || []).some((u) => low(u.email) === low(f.email) && String(u.id) !== String(f.id))) { setMsg({ err: true, t: 'Ese correo ya está en la cuenta.' }); return; }
    if (f.id && f.rol_cuenta === 'usuario' && admins.length === 1 && String(admins[0].id) === String(f.id)) { setMsg({ err: true, t: 'Tiene que quedar al menos un administrador de cuenta.' }); return; }
    setOcupado(true); setMsg(null);
    try {
      const fila = { cliente_id: clienteId, email: low(f.email), nombre: T(f.nombre) || null, rol_cuenta: f.rol_cuenta === 'admin' ? 'admin' : 'usuario' };
      if (f.id) await updateRow('cliente_usuarios', f.id, fila);
      else await insertRow('cliente_usuarios', { ...fila, invitado_por: low(email) || null });
      setForm(null); await cargar();
      setMsg({ err: false, t: f.id ? 'Guardado.' : (esGratuito(fila.email)
        ? `Añadido. ${fila.email} es un correo genérico y no puede registrarse solo: ${puedeInvitar ? 'pulsa «✉ Invitar» para mandarle el acceso.' : 'pide a Administración que le envíe la invitación.'}`
        : `Añadido. Para entrar, esa persona crea su cuenta en Órbita («Entrar como cliente → Crear cuenta») con el correo ${fila.email}; con eso ya ve esta empresa.${puedeInvitar ? ' O pulsa «✉ Invitar» y le llega el acceso por correo.' : ''}`) });
    } catch (e) { setMsg({ err: true, t: `No se pudo guardar: ${explicarErrorBd(e, 'cliente_usuarios')}${/cliente_usuarios|does not exist/i.test(String(e?.message || e)) ? ' Falta aplicar la migración v127 (usuarios de cuenta).' : ''}` }); }
    finally { setOcupado(false); }
  }
  async function quitar(u) {
    if (u.rol_cuenta === 'admin' && admins.length === 1) { setMsg({ err: true, t: 'Tiene que quedar al menos un administrador de cuenta.' }); return; }
    if (!window.confirm(`¿Quitar el acceso de ${u.email}?`)) return;
    try { await deleteRow('cliente_usuarios', u.id); await cargar(); }
    catch (e) { setMsg({ err: true, t: `No se pudo quitar: ${e?.message || e}` }); }
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-extrabold text-[#EAF4F7]">{titulo} · {lista?.length ?? '…'}</h2>
          <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Quién entra en Órbita por esta empresa. <b>Administrador</b>: gestiona los datos de la empresa y los usuarios. <b>Usuario</b>: usa el portal de proyectos.</p>
        </div>
        {puedeGestionar && !form && !sinTabla && <button type="button" onClick={() => setForm({ email: '', nombre: '', rol_cuenta: 'usuario' })} className="btn-ghost !px-3 !py-1 text-[12px]">+ Añadir usuario</button>}
      </div>
      {sinTabla && <p className="mt-2 text-[12px] font-bold text-amber-100">Los usuarios de cuenta se activan al aplicar la migración v127.</p>}
      {lista && lista.length > 0 && (
        <ul className="mt-3 divide-y divide-[#1E5468]/60">
          {lista.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-[#EAF4F7]">{u.email}{soyYo(u) && <span className="ml-2 text-[10.5px] font-medium text-[#9FC0CB]">(tú)</span>}</p>
                <p className="text-[11.5px] text-[#9FC0CB]">{u.nombre ? `${u.nombre} · ` : ''}<span className={`chip !px-2 !py-0 text-[10px] ${u.rol_cuenta === 'admin' ? 'bg-brand-orange/20 text-[#F9A83A]' : 'bg-[#123F52] text-[#9FC0CB]'}`}>{ROLES_CUENTA[u.rol_cuenta]?.etq || u.rol_cuenta}</span></p>
              </div>
              {puedeGestionar && (
                <div className="flex gap-2 text-[11.5px] font-bold">
                  {puedeInvitar && !soyYo(u) && (
                    <button type="button" onClick={() => invitar(u)} disabled={invitando === u.id} className="text-brand-verdeTexto hover:underline disabled:opacity-50"
                      title={esGratuito(u.email) ? 'Correo genérico: solo puede entrar por invitación' : 'Le llega un correo para poner su contraseña'}>
                      {invitando === u.id ? '…' : '✉ Invitar'}{esGratuito(u.email) ? ' (correo genérico)' : ''}
                    </button>
                  )}
                  <button type="button" onClick={() => setForm({ id: u.id, email: u.email, nombre: u.nombre || '', rol_cuenta: u.rol_cuenta })} className="text-brand-orange hover:underline">Editar</button>
                  {!soyYo(u) && <button type="button" onClick={() => quitar(u)} className="text-[#7FA7B4] hover:text-red-300">Quitar</button>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {lista && !lista.length && !sinTabla && !form && <p className="mt-2 text-[12px] text-[#9FC0CB]">Nadie más tiene acceso todavía.</p>}
      {form && (
        <div className="mt-3 rounded-xl border border-[#1E5468] bg-[#0B2E3D] p-3">
          <p className="text-[12px] font-extrabold text-[#EAF4F7]">{form.id ? 'Editar usuario' : 'Nuevo usuario de la cuenta'}</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <div><label className="label" htmlFor="uc-email">Correo</label><input id="uc-email" type="email" className="input !py-1.5 !text-[13px]" value={form.email} disabled={!!form.id} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><label className="label" htmlFor="uc-nombre">Nombre (opcional)</label><input id="uc-nombre" className="input !py-1.5 !text-[13px]" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div>
              <label className="label" htmlFor="uc-rol">Papel</label>
              <select id="uc-rol" className="input !py-1.5 !text-[13px]" value={form.rol_cuenta} onChange={(e) => setForm({ ...form, rol_cuenta: e.target.value })}>
                {Object.entries(ROLES_CUENTA).map(([k, r]) => <option key={k} value={k}>{r.etq}</option>)}
              </select>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-[#7FA7B4]">{ROLES_CUENTA[form.rol_cuenta]?.desc}</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={guardar} disabled={ocupado} className="btn-orange !px-4 !py-1.5 text-xs disabled:opacity-50">{ocupado ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" onClick={() => { setForm(null); setMsg(null); }} className="btn-ghost !px-3 !py-1.5 text-xs">Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p role={msg.err ? 'alert' : 'status'} className={`mt-3 rounded-lg px-3 py-2 text-[12.5px] font-bold ${msg.err ? 'bg-red-500/12 text-red-200' : 'bg-emerald-500/12 text-emerald-200'}`}>{msg.t}</p>}
    </section>
  );
}
