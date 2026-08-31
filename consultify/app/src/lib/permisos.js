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
    // Todo lo comercial pasa a colgar del CRM: generar una oferta y fijar sus
    // reglas no son cosas aparte, son lo que se hace SOBRE un cliente. Tenerlo
    // en dos bloques obligaba a saltar de un sitio a otro para lo mismo.
    label: 'CRM',
    items: [
      { to: 'empresas',  label: 'Empresas',  icon: 'building', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'contactos', label: 'Contactos', icon: 'contact',  roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'proveedores', label: 'Proveedores', icon: 'truck', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      {
        to: 'clientes', label: 'Clientes', icon: 'users',
        roles: ['superadmin', 'admin', 'director', 'gestion'],
        hijos: [
          { to: 'clientes',           label: 'Cartera de clientes',  roles: ['superadmin', 'admin', 'director', 'gestion'] },
          { to: 'clientes/dashboard', label: 'Dashboard de clientes', roles: ['superadmin', 'admin', 'director', 'gestion'] },
        ],
      },
      {
        to: 'ofertas', label: 'Ofertas', icon: 'receipt',
        roles: ['superadmin', 'admin', 'director', 'gestion'],
        hijos: [
          { to: 'ofertas',      label: 'Histórico de ofertas', roles: ['superadmin', 'admin', 'director', 'gestion'] },
          { to: 'planificador', label: 'Generador de ofertas', roles: ['superadmin', 'admin', 'director', 'consultor'] },
          { to: 'reglas',       label: 'Reglas comerciales',   roles: ['superadmin', 'admin', 'director'] },
        ],
      },
      {
        to: 'proyectos', label: 'Proyectos', icon: 'folder-kanban',
        roles: ['superadmin', 'admin', 'director', 'gestion', 'consultor'],
        hijos: [
          { to: 'proyectos',             label: 'Cartera de proyectos',    roles: ['superadmin', 'admin', 'director', 'gestion', 'consultor'] },
          { to: 'proyectos/dashboard',   label: 'Panel de proyectos',      roles: ['superadmin', 'admin', 'director', 'gestion', 'consultor'] },
          { to: 'proyectos/planificador', label: 'Planificador de proyectos', roles: ['superadmin', 'admin', 'director', 'consultor'] },
        ],
      },
      { to: 'sistemas', label: 'Sistemas de gestión', icon: 'shield-check', roles: ['superadmin', 'admin', 'director'] },
    ],
  },
  {
    label: 'Organización',
    items: [
      { to: 'mis-datos', label: 'Mis datos', icon: 'user', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
      { to: 'equipo', label: 'Equipo', icon: 'user-cog', roles: ['superadmin', 'admin'] },
      { to: 'procesos-internos', label: 'Procesos internos', icon: 'repeat', roles: ['superadmin', 'admin', 'director', 'consultor'] },
      { to: 'versiones', label: 'Backlog de versiones', icon: 'git-branch', roles: ['superadmin', 'admin', 'director'] },
      { to: 'registro', label: 'Control de accesos', icon: 'shield-alert', roles: ['superadmin', 'admin'] },
      { to: 'accesibilidad', label: 'Accesibilidad AAA', icon: 'accessibility', roles: ['superadmin', 'admin', 'director'] },
      { to: 'accesos', label: 'Accesos', icon: 'key', roles: ['superadmin', 'admin'] },
    ],
  },
];

// Lista plana (compatibilidad con código existente)
// Incluye los hijos: si no, las rutas anidadas quedarían fuera del control de acceso.
export const TABS_PORTAL = GRUPOS_PORTAL.flatMap((g) =>
  g.items.flatMap((i) => (i.hijos ? [i, ...i.hijos] : [i])));

// Capacidades puntuales
export const ROLES_CLIENTE = ['administrador', 'consultor', 'usuario_cliente'];
export const ROL_CLIENTE_LABEL = {
  administrador: 'Administración (responsable del proyecto)',
  consultor: 'Consultoría',
  usuario_cliente: 'Persona usuaria del cliente',
};

// ════════════════════════════════════════════════════════════════
// QUÉ SEPARA A «ADMINISTRACIÓN» DE «SUPERADMINISTRACIÓN»
//
// Administración tiene TODO: importes, equipo, accesos y control de accesos.
// Antes no veía los importes —gestionaba ofertas sin poder leer su precio— ni
// entraba en Accesos, así que cualquier alta de usuario dependía de una sola
// persona.
//
// Lo único reservado al superadministrador es lo que permitiría **saltarse la
// propia jerarquía**:
//   · asignar o retirar el rol `superadmin`
//   · modificar la ficha de un superadministrador
//   · «ver como» otro rol
//
// Si Administración pudiera nombrar superadministradores, el nivel dejaría de
// existir: bastaría con ascenderse. La separación tiene que estar en esas tres
// acciones, no en esconder pantallas de trabajo.
// ════════════════════════════════════════════════════════════════

export const can = {
  // Importes, márgenes, MRR y calculadora. Administración los necesita: es
  // quien factura y quien revisa las ofertas.
  verEconomico: (rol) => rol === 'superadmin' || rol === 'admin',
  // Alta y baja de consultores y equipo de gestión
  gestionarEquipo: (rol) => rol === 'superadmin' || rol === 'admin',
  // Gestionar accesos: quién entra y con qué rol
  gestionarAccesos: (rol) => rol === 'superadmin' || rol === 'admin',
  // Auditoría de accesos
  verRegistroAccesos: (rol) => rol === 'superadmin' || rol === 'admin',
  // ── Exclusivo de superadministración ──
  // Otorgar el rol superadmin, o tocar a quien ya lo tiene.
  gestionarSuperadmins: (rol) => rol === 'superadmin',
  // Suplantar otro rol para comprobar qué ve
  verComoOtroRol: (rol) => rol === 'superadmin',
  // Entrar a la zona interna
  esEquipo: (rol) => ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(rol),
};

/** Roles que un usuario puede ASIGNAR a otros. */
export const rolesAsignablesPor = (rol) => rol === 'superadmin'
  ? ['superadmin', 'admin', 'director', 'consultor', 'gestion']
  : rol === 'admin'
    ? ['admin', 'director', 'consultor', 'gestion']   // sin superadmin
    : [];

export const tabsParaRol = (rol) => TABS_PORTAL.filter((t) => t.roles.includes(rol));

// Grupos visibles para el rol (filtra items y descarta grupos vacíos)
// Filtra por rol también los hijos: un consultor ve «Ofertas» pero dentro solo
// lo que le corresponde, sin entradas que le darían un «no tienes permiso».
export const gruposParaRol = (rol) =>
  GRUPOS_PORTAL
    .map((g) => ({
      ...g,
      items: g.items
        .filter((it) => it.roles.includes(rol))
        .map((it) => (it.hijos
          ? { ...it, hijos: it.hijos.filter((h) => h.roles.includes(rol)) }
          : it)),
    }))
    .filter((g) => g.items.length > 0);
