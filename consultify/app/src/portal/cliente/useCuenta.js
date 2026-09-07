import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth.jsx';
import { listTable } from '../../lib/data.js';
import { rolCuenta } from '../../lib/cuentaClientePuro.js';

// ════════════════════════════════════════════════════════════════════════════
// LA CUENTA DE CLIENTE DE QUIEN HA ENTRADO
//
// Resuelve su ficha de cliente y su papel en ella:
//   · por usuario enlazado (clientes.user_id),
//   · por correo en cliente_usuarios (v127: administrador / usuario),
//   · por el correo de la ficha,
//   · y si la política solo le devuelve una ficha, esa es la suya.
// ════════════════════════════════════════════════════════════════════════════

const low = (v) => String(v ?? '').trim().toLowerCase();

export default function useCuenta() {
  const { user, role } = useAuth();
  const [estado, setEstado] = useState({ cargando: true, cliente: null, rol: null, usuarios: [], clientes: [] });
  const [n, setN] = useState(0);
  const recargar = useCallback(() => setN((x) => x + 1), []);

  useEffect(() => {
    let vivo = true;
    const correo = low(user?.email);
    Promise.all([listTable('clientes').catch(() => []), listTable('cliente_usuarios').catch(() => [])]).then(([cl, us]) => {
      if (!vivo) return;
      const clientes = cl || []; const usuarios = us || [];
      const porUsuario = clientes.find((c) => c.user_id && String(c.user_id) === String(user?.id));
      const miembro = usuarios.find((u) => correo && low(u.email) === correo);
      const porMiembro = miembro ? clientes.find((c) => String(c.id) === String(miembro.cliente_id)) : null;
      const porCorreo = clientes.find((c) => correo && low(c.email) === correo);
      const unica = role === 'cliente' && clientes.length === 1 ? clientes[0] : null;
      const cliente = porUsuario || porMiembro || porCorreo || unica || null;
      // Sin fila en cliente_usuarios ni user_id, quien llega por el correo de
      // la ficha (el contacto original) es el administrador.
      const rol = cliente ? (rolCuenta(user, cliente, usuarios) || ((porCorreo || unica) ? 'admin' : null)) : null;
      setEstado({ cargando: false, cliente, rol, usuarios, clientes });
    });
    return () => { vivo = false; };
  }, [user?.id, user?.email, role, n]);

  return { ...estado, recargar, esAdmin: estado.rol === 'admin' };
}
