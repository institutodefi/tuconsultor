import { useEffect, useState } from 'react';
import { listTable } from '../../lib/data.js';
import { NORMA_BY_ID } from '../../lib/calcEngine.js';
import { cargarContactosFicha, ROLES_CUENTA } from '../../lib/cuentaCliente.js';

// Lo que ve de su empresa un USUARIO de cuenta (no administrador): un resumen
// de solo lectura. Para cambiar algo, se lo pide a su administrador de cuenta.
export default function ResumenEmpresa({ cliente, rol = 'usuario' }) {
  const [d, setD] = useState({ sedes: [], certs: [], contactos: [], usuarios: [] });
  useEffect(() => {
    if (!cliente?.id) return;
    const mio = (x) => String(x.cliente_id) === String(cliente.id);
    Promise.all([
      listTable('cliente_sedes').catch(() => []), listTable('cliente_certificados').catch(() => []),
      cargarContactosFicha(cliente).catch(() => ({ contactos: [] })), listTable('cliente_usuarios').catch(() => []),
    ]).then(([s, c, f, u]) => setD({ sedes: (s || []).filter(mio), certs: (c || []).filter(mio), contactos: f.contactos || [], usuarios: (u || []).filter(mio) }));
  }, [cliente?.id]);   // eslint-disable-line react-hooks/exhaustive-deps

  if (!cliente) return <section className="card"><p className="text-[12.5px] text-[#9FC0CB]">Tu usuario todavía no está enlazado a una ficha de cliente. Escríbenos y lo enlazamos en un minuto.</p></section>;
  const admins = d.usuarios.filter((u) => u.rol_cuenta === 'admin').map((u) => u.email);
  const Dato = ({ etq, v }) => <div><p className="label !mb-0">{etq}</p><p className="text-[13px] font-bold text-[#EAF4F7]">{v || '—'}</p></div>;
  return (
    <section className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-extrabold text-[#EAF4F7]">{cliente.nombre_comercial || cliente.empresa}</h2>
        <span className="chip bg-[#123F52] !px-2 !py-0.5 text-[10.5px] text-[#9FC0CB]">{ROLES_CUENTA[rol]?.etq || rol}</span>
      </div>
      <p className="mt-0.5 text-[11.5px] text-[#7FA7B4]">Los datos de la empresa los gestiona el administrador de la cuenta{admins.length ? ` (${admins.join(', ')})` : ''}. Si algo no está bien, pídeselo.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato etq="Razón social" v={cliente.empresa} />
        <Dato etq="CIF" v={cliente.cif} />
        <Dato etq="Actividad" v={cliente.actividad} />
        <Dato etq="Domicilio" v={[cliente.direccion, cliente.cp, cliente.poblacion].filter(Boolean).join(', ')} />
        <Dato etq="Sedes" v={d.sedes.length ? d.sedes.map((s) => s.nombre || s.poblacion || s.direccion).join(' · ') : null} />
        <Dato etq="Normas certificadas" v={d.certs.length ? d.certs.map((c) => NORMA_BY_ID[c.norma]?.nombre || c.norma).join(' · ') : null} />
        <Dato etq="Personas de contacto" v={d.contactos.length ? d.contactos.map((c) => `${c.nombre}${c.apellidos ? ` ${c.apellidos}` : ''}`).join(' · ') : null} />
        <Dato etq="Usuarios con acceso" v={d.usuarios.length ? String(d.usuarios.length) : null} />
      </div>
    </section>
  );
}
