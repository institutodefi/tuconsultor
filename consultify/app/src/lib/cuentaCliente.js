import { supabase, DEMO } from './supabase.js';
import { listTable, insertRow, updateRow, deleteRow } from './data.js';

// ════════════════════════════════════════════════════════════════════════════
// CUENTA DE CLIENTE · usuarios (administrador / usuario) y datos coordinados
// con la ficha del CRM
//
// · Una cuenta de cliente puede tener varias personas con acceso a Órbita
//   (cliente_usuarios, por correo). El administrador gestiona los datos de la
//   empresa, sedes, certificados, personas de contacto y usuarios; el usuario
//   solo usa el portal de proyectos y sus datos personales.
// · Las personas de contacto que ve el cliente son las de su ficha del CRM
//   (empresas ↔ empresa_contactos ↔ contactos): mismos datos en el portal y
//   en la ficha. Las escrituras van por funciones de la base (v127) que
//   comprueban que la empresa es la suya; en demo se tocan las tablas.
//
// Las funciones puras están en cuentaClientePuro.js (probadas desde Node).
// ════════════════════════════════════════════════════════════════════════════

import { S, low, empresaDeCliente, contactosDeEmpresa } from './cuentaClientePuro.js';
export * from './cuentaClientePuro.js';

// ── Datos (Supabase o demo) ─────────────────────────────────────────────────

const sinFuncion = (e) => /function .* does not exist|could not find the function|PGRST202/i.test(String(e?.message || e));
const rpc = async (fn, args) => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || String(error));
  return data;
};

/** Contactos de la ficha del cliente (lectura: las tablas del CRM se pueden leer). */
export async function cargarContactosFicha(cliente) {
  const [empresas, enlaces, contactos] = await Promise.all([
    listTable('empresas').catch(() => []), listTable('empresa_contactos').catch(() => []), listTable('contactos').catch(() => []),
  ]);
  const empresa = empresaDeCliente(cliente, empresas || []);
  return { empresa, contactos: contactosDeEmpresa(empresa?.id, enlaces || [], contactos || []) };
}

/** Guardar (alta o cambio) una persona de contacto de la ficha. */
export async function guardarContactoFicha(cliente, datos) {
  const p = {
    id: datos.id || null, nombre: S(datos.nombre), apellidos: S(datos.apellidos) || null, cargo: S(datos.cargo) || null,
    email: low(datos.email) || null, telefono: S(datos.telefono) || null, movil: S(datos.movil) || null, notas: S(datos.notas) || null,
    principal: !!datos.principal, rgpd_aceptado: !!datos.rgpd_aceptado, rol: datos.rol || 'proyecto',
  };
  if (!DEMO) return rpc('cliente_guardar_contacto', { cid: cliente.id, p });
  // Demo: mismas reglas sobre las tablas en memoria.
  const [empresas, enlaces, contactos] = await Promise.all([listTable('empresas'), listTable('empresa_contactos'), listTable('contactos')]);
  let empresa = empresaDeCliente(cliente, empresas);
  if (!empresa) empresa = await insertRow('empresas', { nombre: cliente.empresa, cif: cliente.cif, es_cliente: true, cliente_id_old: cliente.id, origen: 'portal' });
  let id = p.id;
  if (!id && p.email) id = contactos.find((c) => low(c.email) === p.email)?.id || null;
  const fila = { nombre: p.nombre, apellidos: p.apellidos, cargo: p.cargo, email: p.email, telefono: p.telefono, movil: p.movil, notas: p.notas, rgpd_aceptado: p.rgpd_aceptado, rgpd_fecha: p.rgpd_aceptado ? new Date().toISOString() : null };
  if (id) await updateRow('contactos', id, fila); else id = (await insertRow('contactos', { ...fila, origen: 'portal' })).id;
  const enlace = enlaces.find((x) => String(x.empresa_id) === String(empresa.id) && String(x.contacto_id) === String(id));
  if (enlace) await updateRow('empresa_contactos', enlace.id, { cargo: p.cargo, principal: p.principal });
  else await insertRow('empresa_contactos', { empresa_id: empresa.id, contacto_id: id, cargo: p.cargo, principal: p.principal, rol: p.rol });
  if (p.principal) for (const x of enlaces) if (String(x.empresa_id) === String(empresa.id) && String(x.contacto_id) !== String(id) && x.principal) await updateRow('empresa_contactos', x.id, { principal: false });
  return id;
}

/** Quitar una persona de la ficha (se quita el enlace, no la persona del CRM). */
export async function quitarContactoFicha(cliente, contactoId) {
  if (!DEMO) return rpc('cliente_quitar_contacto', { cid: cliente.id, con_id: contactoId });
  const [empresas, enlaces] = await Promise.all([listTable('empresas'), listTable('empresa_contactos')]);
  const empresa = empresaDeCliente(cliente, empresas);
  for (const x of enlaces) if (empresa && String(x.empresa_id) === String(empresa.id) && String(x.contacto_id) === String(contactoId)) await deleteRow('empresa_contactos', x.id);
  return true;
}

// Campos que la ficha de cliente y la empresa del CRM comparten.
const CAMPOS_CRM = ['empresa', 'nombre_comercial', 'cif', 'telefono', 'email', 'web', 'direccion', 'cp', 'poblacion', 'provincia', 'pais'];

/**
 * Guardar los datos de empresa: en la ficha de cliente y en la empresa del
 * CRM a la vez. Si la base aún no tiene la función (v127), se guarda solo la
 * ficha de cliente y se avisa con `soloFicha`.
 */
export async function guardarDatosEmpresa(cliente, patch) {
  if (!DEMO) {
    try { await rpc('cliente_guardar_empresa', { cid: cliente.id, p: patch }); return { soloFicha: false }; }
    catch (e) { if (!sinFuncion(e)) throw e; }
    await updateRow('clientes', cliente.id, patch);
    return { soloFicha: true };
  }
  await updateRow('clientes', cliente.id, patch);
  const empresas = await listTable('empresas');
  const empresa = empresaDeCliente(cliente, empresas);
  if (empresa) {
    const pe = {};
    for (const k of CAMPOS_CRM) if (k in patch) pe[k === 'empresa' ? 'nombre' : k] = patch[k];
    if (Object.keys(pe).length) await updateRow('empresas', empresa.id, pe);
  }
  return { soloFicha: false };
}
