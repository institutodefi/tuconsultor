// ════════════════════════════════════════════════════════════════
// PERMISOS POR ROL — fuente única de verdad para la UI
// Roles: superadmin · admin · director · consultor · gestion · cliente
// ════════════════════════════════════════════════════════════════

export const ROLES = ['superadmin', 'admin', 'director', 'consultor', 'gestion', 'cliente'];

export const ROL_LABEL = {
  superadmin: 'Superadministración',
  admin: 'Administración',
  director: 'Dirección de Proyecto',
  consultor: 'Consultoría',
  gestion: 'Equipo de gestión',
  cliente: 'Cliente',
};

// Pestañas del portal interno y quién las ve
// (el orden define el orden de aparición)
// Navegación agrupada para la barra lateral.
export const GRUPOS_PORTAL = [
  {
    label: null, // sin título: pestaña suelta
    items: [
      { to: 'mi-agenda', label: 'Mi agenda', icon: 'calendar-check', roles: ['superadmin', 'admin', 'director', 'consultor'] },
    ],
  },
  {
    label: 'Operación',
    items: [
      { to: 'panel',  label: 'Dashboard', icon: 'layout-dashboard', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'agenda', label: 'Agenda',    icon: 'calendar-days',    roles: ['superadmin', 'admin', 'director', 'consultor'] },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: 'planificador', label: 'Generador de ofertas', icon: 'file-text', roles: ['superadmin', 'admin', 'director', 'consultor'] },
      { to: 'reglas',       label: 'Reglas comerciales',   icon: 'sliders-horizontal', roles: ['superadmin', 'admin', 'director'] },
      { to: 'sistemas',     label: 'Sistemas de gestión',  icon: 'shield-check', roles: ['superadmin', 'admin', 'director'] },
    ],
  },
  {
    label: 'CRM',
    items: [
      // Una sola pestaña: clientes, proveedores y potenciales son filtros de 'empresas'
      { to: 'empresas',  label: 'Empresas',  icon: 'building', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'contactos', label: 'Contactos', icon: 'contact',  roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'ofertas',   label: 'Ofertas',   icon: 'receipt',  roles: ['superadmin', 'admin', 'director', 'gestion'] },
      { to: 'proyectos', label: 'Proyectos', icon: 'folder-kanban', roles: ['superadmin', 'admin', 'director', 'gestion', 'consultor'] },
    ],
  },
  {
    label: 'Organización',
    items: [
      { to: 'mis-datos', label: 'Mis datos', icon: 'user', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'equipo', label: 'Equipo', icon: 'user-cog', roles: ['superadmin', 'admin'] },
      { to: 'procesos-internos', label: 'Procesos internos', icon: 'repeat', roles: ['superadmin', 'admin', 'director', 'consultor'] },
      { to: 'versiones', label: 'Backlog de versiones', icon: 'git-branch', roles: ['superadmin', 'admin', 'director'] },
      { to: 'registro', label: 'Control de accesos', icon: 'shield-alert', roles: ['superadmin'] },
      { to: 'accesibilidad', label: 'Accesibilidad AAA', icon: 'accessibility', roles: ['superadmin', 'admin', 'director'] },
      { to: 'accesos', label: 'Accesos', icon: 'key', roles: ['superadmin'] },
    ],
  },
];

// Lista plana (compatibilidad con código existente)
export const TABS_PORTAL = GRUPOS_PORTAL.flatMap((g) => g.items);

// Capacidades puntuales
export const ROLES_CLIENTE = ['administrador', 'consultor', 'usuario_cliente'];
export const ROL_CLIENTE_LABEL = {
  administrador: 'Administración (responsable del proyecto)',
  consultor: 'Consultoría',
  usuario_cliente: 'Persona usuaria del cliente',
};

export const can = {
  // Ver importes, márgenes, MRR, calculadora → SOLO superadmin
  verEconomico: (rol) => rol === 'superadmin',
  // Gestionar el equipo (alta/baja consultores y gestión)
  gestionarEquipo: (rol) => rol === 'superadmin' || rol === 'admin',
  // Entrar a la zona interna
  esEquipo: (rol) => ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(rol),
};

export const tabsParaRol = (rol) => TABS_PORTAL.filter((t) => t.roles.includes(rol));

// Grupos visibles para el rol (filtra items y descarta grupos vacíos)
export const gruposParaRol = (rol) =>
  GRUPOS_PORTAL
    .map((g) => ({ ...g, items: g.items.filter((it) => it.roles.includes(rol)) }))
    .filter((g) => g.items.length > 0);
