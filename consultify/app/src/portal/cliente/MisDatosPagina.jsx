import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { listTable } from '../../lib/data.js';
import MisDatosCliente from './MisDatosCliente.jsx';

// Pestaña «Mis datos» del portal de cliente. Está siempre, haya proyectos o no:
// antes solo aparecía en la pantalla de quien no tenía ninguno, así que un
// cliente con proyecto no podía corregir su propio teléfono.
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
      setEmpresa((cl || []).find((c) => String(c.user_id) === String(user?.id))
              || (cl || []).find((c) => (c.email || '').toLowerCase() === correo) || null);
    }).finally(() => setCargando(false));
  }, [user, recarga]);

  if (cargando) return <p className="font-semibold text-[#9FC0CB]">Cargando tus datos…</p>;

  return (
    <MisDatosCliente contacto={contacto} empresa={empresa} email={user?.email}
      onGuardado={() => setRecarga((n) => n + 1)} />
  );
}
