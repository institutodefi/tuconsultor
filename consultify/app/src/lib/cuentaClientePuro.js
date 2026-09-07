// ════════════════════════════════════════════════════════════════════════════
// CUENTA DE CLIENTE · funciones puras (sin Supabase), probadas desde Node en
// scripts/test-cuenta-cliente.mjs. Lo que toca datos está en cuentaCliente.js.
// ════════════════════════════════════════════════════════════════════════════

export const S = (v) => String(v ?? '').trim();
export const low = (v) => S(v).toLowerCase();
export const normCif = (v) => S(v).toUpperCase().replace(/[^A-Z0-9]/g, '');

export const ROLES_CUENTA = {
  admin: { etq: 'Administrador de cuenta', desc: 'Gestiona los datos de la empresa, sedes, certificados, personas de contacto y usuarios.' },
  usuario: { etq: 'Usuario de cuenta', desc: 'Usa el portal de proyectos (planificación, tareas, documentos) y sus datos personales.' },
};

/**
 * Papel de este usuario en la cuenta de un cliente.
 * @returns 'admin' | 'usuario' | null (no pertenece)
 */
export function rolCuenta(user, cliente, usuarios = []) {
  if (!user || !cliente) return null;
  const correo = low(user.email);
  const mios = (usuarios || []).filter((u) => String(u.cliente_id) === String(cliente.id)
    && ((u.user_id && String(u.user_id) === String(user.id)) || (correo && low(u.email) === correo)));
  if (mios.some((u) => u.rol_cuenta === 'admin')) return 'admin';
  if (mios.length) return 'usuario';
  if (cliente.user_id && String(cliente.user_id) === String(user.id)) return 'admin';   // enlazado de siempre
  return null;
}

/** La empresa del CRM que corresponde a la ficha de cliente: por traza o por CIF. */
export function empresaDeCliente(cliente, empresas = []) {
  if (!cliente) return null;
  const porTraza = empresas.find((e) => e.cliente_id_old && String(e.cliente_id_old) === String(cliente.id));
  if (porTraza) return porTraza;
  const cif = normCif(cliente.cif);
  if (!cif) return null;
  const c = empresas.filter((e) => normCif(e.cif) === cif).sort((a, b) => Number(!!b.es_cliente) - Number(!!a.es_cliente) || S(a.creado).localeCompare(S(b.creado)));
  return c[0] || null;
}

/**
 * Personas de contacto de una empresa: una por persona aunque tenga varios
 * roles (directivo, proyecto, facturación…), con los roles juntos.
 */
export function contactosDeEmpresa(empresaId, enlaces = [], contactos = []) {
  if (!empresaId) return [];
  const porContacto = new Map();
  for (const ec of enlaces.filter((x) => String(x.empresa_id) === String(empresaId))) {
    const c = contactos.find((x) => String(x.id) === String(ec.contacto_id));
    if (!c) continue;
    const k = String(c.id);
    const prev = porContacto.get(k) || { ...c, cargo: ec.cargo || c.cargo || null, principal: false, roles: [] };
    prev.principal = prev.principal || !!ec.principal;
    if (ec.rol && !prev.roles.includes(ec.rol)) prev.roles.push(ec.rol);
    if (!prev.cargo && ec.cargo) prev.cargo = ec.cargo;
    porContacto.set(k, prev);
  }
  return [...porContacto.values()].sort((a, b) => Number(b.principal) - Number(a.principal) || S(a.nombre).localeCompare(S(b.nombre)));
}

export const ROL_CONTACTO = { directivo: 'Dirección', proyecto: 'Proyecto', facturacion: 'Facturación', calidad: 'Calidad', otro: 'Otro' };

