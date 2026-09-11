// ════════════════════════════════════════════════════════════════════════════
// DOMINIOS DE CORREO · quién es de casa y qué correos son «genéricos»
//
// Un solo sitio para las dos listas: las usan el acceso (registro de clientes),
// la pantalla de Accesos (invitar al equipo) y la función admin-usuarios.
// ════════════════════════════════════════════════════════════════════════════

/** Dominios del equipo (las sociedades y marcas de TuConsultor). */
export const DOMINIOS_INTERNOS = ['tuconsultor.com', '3coreproyectos.com', 'institutoexcelencia.com', 'consultify.pro'];

/** Correos gratuitos / genéricos: no valen para registrarse solo como cliente. */
export const DOMINIOS_GRATUITOS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'mac.com', 'protonmail.com', 'proton.me', 'aol.com', 'gmx.com', 'gmx.es', 'mail.com', 'yandex.com', 'zoho.com', 'tutanota.com', 'mail.ru'];

export const dominioDe = (email) => (String(email || '').split('@')[1] || '').toLowerCase().trim();
export const esInterno = (email) => DOMINIOS_INTERNOS.includes(dominioDe(email));
export const esGratuito = (email) => DOMINIOS_GRATUITOS.includes(dominioDe(email));
export const listaInternos = () => DOMINIOS_INTERNOS.map((d) => `@${d}`).join(', ');
