// ════════════════════════════════════════════════════════════════════════════
// ACCESO AL PORTAL DESDE UNA OFERTA ACEPTADA
//
// La persona que pidió la oferta y la aceptó pasa a ser usuaria de la zona de
// clientes (administradora de la cuenta de su empresa):
//   1. se busca (o se crea) la ficha operativa `clientes` por CIF;
//   2. se la apunta en `cliente_usuarios` con rol admin (v127);
//   3. si quien lo hace es Administración, se le manda la invitación de
//      Supabase para poner su contraseña. Eso vale también con un correo
//      genérico (Gmail…), que el registro público no admite: es la excepción
//      que decide el equipo.
// ════════════════════════════════════════════════════════════════════════════
import { listTable, insertRow } from './data.js';
import { normalizarCif } from './crm.js';
import { esGratuito } from './dominios.js';

const S = (v) => String(v ?? '');
const low = (v) => S(v).trim().toLowerCase();

export async function darAccesoPortal({ oferta, email, nombre, rol = 'admin', invitadoPor = null, invitar = null }) {
  const correo = low(email || oferta?.email);
  if (!correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw new Error('Hace falta un correo válido de la persona.');
  const cif = normalizarCif(oferta?.cif);
  if (!cif) throw new Error('La oferta no tiene CIF: sin él no se puede enlazar la empresa.');

  const [clientes, usuarios] = await Promise.all([listTable('clientes').catch(() => []), listTable('cliente_usuarios').catch(() => [])]);
  let cliente = clientes.find((c) => normalizarCif(c.cif) === cif) || null;
  let clienteNuevo = false;
  if (!cliente) {
    cliente = await insertRow('clientes', { empresa: oferta?.empresa || cif, cif, email: correo, nombre_comercial: oferta?.nombre_comercial || null });
    clienteNuevo = true;
  }
  let usuario = usuarios.find((u) => String(u.cliente_id) === String(cliente.id) && low(u.email) === correo) || null;
  let usuarioNuevo = false;
  if (!usuario) {
    usuario = await insertRow('cliente_usuarios', { cliente_id: cliente.id, email: correo, nombre: S(nombre || oferta?.nombre).trim() || null, rol_cuenta: rol === 'usuario' ? 'usuario' : 'admin', invitado_por: invitadoPor || null });
    usuarioNuevo = true;
  }

  let invitacion = null;
  if (invitar) {
    const r = await invitar({ action: 'invite', email: correo, nombre: S(nombre || oferta?.nombre).trim(), apellidos: '', rol: 'cliente' }).catch((e) => ({ ok: false, error: String(e?.message || e) }));
    invitacion = r?.ok ? 'enviada' : (/ya tiene cuenta/i.test(r?.error || '') ? 'ya_tenia_cuenta' : `error: ${r?.error || 'sin respuesta'}`);
  }
  const generico = esGratuito(correo);
  return { cliente, clienteNuevo, usuario, usuarioNuevo, invitacion, generico, correo };
}

/** Frase para la pantalla, con lo que ha pasado. */
export function explicarAcceso(r) {
  const partes = [];
  partes.push(r.clienteNuevo ? `Ficha de cliente creada (${r.cliente.empresa}).` : `Ficha de cliente: ${r.cliente.empresa}.`);
  partes.push(r.usuarioNuevo ? `${r.correo} añadido como administrador de la cuenta.` : `${r.correo} ya estaba en la cuenta.`);
  if (r.invitacion === 'enviada') partes.push('Invitación enviada: recibirá un correo para poner su contraseña.');
  else if (r.invitacion === 'ya_tenia_cuenta') partes.push('Ya tenía cuenta: entra con su contraseña y verá la empresa.');
  else if (r.invitacion) partes.push(`No se pudo enviar la invitación (${r.invitacion.replace(/^error: /, '')}).`);
  else partes.push(r.generico
    ? 'Es un correo genérico: no puede registrarse solo. Pide a Administración que le envíe la invitación desde aquí.'
    : 'Puede crear su cuenta en Órbita («Entrar como cliente → Crear cuenta») con ese correo, o Administración le envía la invitación.');
  return partes.join(' ');
}
