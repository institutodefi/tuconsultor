import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { listTable } from '../../lib/data.js';
import MisDatosCliente from './MisDatosCliente.jsx';
import DatosEmpresaCliente from './DatosEmpresaCliente.jsx';
import ResumenEmpresa from './ResumenEmpresa.jsx';
import { ROLES_CUENTA } from '../../lib/cuentaClientePuro.js';

// Pestaña «Mi empresa» (administrador de cuenta) o «Mis datos» (usuario de
// cuenta) del portal de cliente. Está siempre, haya proyectos o no.
//
// · Administrador: datos de empresa, sedes, personas de contacto, usuarios y
//   normas certificadas (con propuestas leídas de sus documentos); sus datos
//   personales y contraseña debajo, plegados.
// · Usuario: un resumen de su empresa (solo lectura) y sus datos personales.
export default function MisDatosPagina({ cuenta }) {
  const { user } = useAuth();
  const [contacto, setContacto] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const correo = (user?.email || '').toLowerCase();
    listTable('contactos').catch(() => []).then((co) => setContacto((co || []).find((c) => (c.email || '').toLowerCase() === correo) || null));
  }, [user, recarga]);

  if (!cuenta || cuenta.cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando tus datos…</p>;
  const empresa = cuenta.cliente;
  const recargar = () => { setRecarga((n) => n + 1); cuenta.recargar?.(); };

  return (
    <div className="space-y-4">
      {cuenta.esAdmin
        ? <DatosEmpresaCliente cliente={empresa} email={user?.email} onGuardado={recargar} />
        : <ResumenEmpresa cliente={empresa} rol={cuenta.rol} />}
      <details className="card" open={!cuenta.esAdmin}>
        <summary className="cursor-pointer text-sm font-extrabold text-[#EAF4F7]">Mis datos personales y contraseña</summary>
        <p className="mt-0.5 mb-3 text-[11.5px] text-[#7FA7B4]">Tu nombre, cargo y teléfonos como persona de contacto, y la contraseña de tu acceso.{cuenta.rol ? ` Eres ${ROLES_CUENTA[cuenta.rol]?.etq.toLowerCase()}.` : ''}</p>
        <MisDatosCliente contacto={contacto} empresa={empresa} email={user?.email} onGuardado={recargar} />
      </details>
    </div>
  );
}
