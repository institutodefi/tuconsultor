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
    label: null, // sin título: lo primero que se ve
    items: [
      // Inicio arriba del todo y suelto: es la pantalla de entrada y desde ahí
      // se llega a lo demás. Estaba dentro de «Operación», por debajo de la
      // agenda, así que quien quería volver al principio no sabía dónde mirar.
      { to: '', label: 'Inicio', icon: 'home', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
    ],
  },
  {
    label: 'Agendas',
    items: [
      // La propia primero: es la que se mira todos los días.
      { to: 'mi-agenda', label: 'Mi agenda', icon: 'calendar-check', roles: ['superadmin', 'admin', 'director', 'consultor'] },
      // La global reparte trabajo de otras personas, así que es de quien lo
      // reparte. Consultoría ve la suya y la de sus proyectos, no la de la casa.
      { to: 'agenda', label: 'Agenda del equipo', icon: 'calendar-days', roles: ['superadmin', 'admin', 'director'] },
    ],
  },
  {
    label: 'Operación',
    items: [
      // El panel de gestión enseña MRR, márgenes y cartera: cifras de negocio.
      // Solo Administración.
      { to: 'panel',  label: 'Panel de gestión', icon: 'layout-dashboard', roles: ['superadmin', 'admin'] },
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
          // Cartera y panel eran dos pantallas sobre los mismos proyectos: una
          // con la tabla, otra con las cifras. Se entra a mirar «cómo va» y
          // había que recordar en cuál estaba cada cosa. Ahora es una sola.
          //
          // El «planificador de proyectos» se ha retirado: repartía tareas por
          // el calendario de forma automática, y programar es una decisión de
          // quien va a hacer el trabajo. Eso se hace ahora tarea a tarea, con
          // sus sesiones.
          { to: 'proyectos', label: 'Proyectos', roles: ['superadmin', 'admin', 'director', 'gestion', 'consultor'] },
        ],
      },
      // Lo ve también consultoría y gestión: necesitan consultar qué tareas
      // define cada modelo para saber qué les toca hacer. Editarlo es otra
      // cosa: ver `can.editarCatalogoTareas`.
      { to: 'sistemas', label: 'Sistemas de gestión', icon: 'shield-check', roles: ['superadmin', 'admin', 'director', 'consultor', 'gestion'] },
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
  // ── El catálogo de tareas: se consulta mucho, se edita poco ──
  // Dirección de proyecto, consultoría y gestión lo LEEN: es la referencia de
  // qué hay que hacer en cada norma y modelo, y consultarla es parte del
  // trabajo diario.
  //
  // Editarlo queda en Administración. No es jerarquía por jerarquía: ese
  // catálogo alimenta las horas de TODAS las ofertas y de todos los proyectos.
  // Cambiar las horas de una tarea ahí mueve el precio de lo que se está
  // ofertando en ese momento, y esa decisión tiene que estar acotada.
  verCatalogoTareas: (rol) => ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(rol),
  editarCatalogoTareas: (rol) => ['superadmin', 'admin'].includes(rol),

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
