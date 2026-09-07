import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { listTable } from '../../lib/data.js';
import MisDatosCliente from './MisDatosCliente.jsx';
import DatosEmpresaCliente from './DatosEmpresaCliente.jsx';

// Pestaña «Mi empresa» del portal de cliente. Está siempre, haya proyectos o no.
//
// Primero lo de la empresa (datos, sedes, normas certificadas y alcances, con
// propuestas leídas de sus documentos); los datos personales del contacto y
// la contraseña van debajo, plegados: antes solo salían los personales y el
// cliente no podía tocar los de su empresa.
export default function MisDatosPagina() {
  const { user } = useAuth();
  const [contacto, setContacto] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    const correo = (user?.email || '').toLowerCase();
    Promise.all([
      listTable('contactos').catch(() => []),
      listTable('clientes').catch(() => []),
    ]).then(([co, cl]) => {
      setContacto((co || []).find((c) => (c.email || '').toLowerCase() === correo) || null);
      // Su ficha de cliente: por usuario enlazado (lo que permite la RLS) o,
      // si no, por el correo de la ficha.
      setEmpresa((cl || []).find((c) => String(c.user_id) === String(user?.id))
              || (cl || []).find((c) => (c.email || '').toLowerCase() === correo) || null);
    }).finally(() => setCargando(false));
  }, [user, recarga]);

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando tus datos…</p>;

  return (
    <div className="space-y-4">
      <DatosEmpresaCliente cliente={empresa} onGuardado={() => setRecarga((n) => n + 1)} />
      <details className="card">
        <summary className="cursor-pointer text-sm font-extrabold text-[#EAF4F7]">Mis datos personales y contraseña</summary>
        <p className="mt-0.5 mb-3 text-[11.5px] text-[#7FA7B4]">Tu nombre, cargo y teléfonos como persona de contacto, y la contraseña de tu acceso.</p>
        <MisDatosCliente contacto={contacto} empresa={empresa} email={user?.email} onGuardado={() => setRecarga((n) => n + 1)} />
      </details>
    </div>
  );
}
