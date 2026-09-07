import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Fuerza autenticación real: si es 'true', nunca se entra en modo DEMO aunque falten credenciales. */
const FORCE_AUTH = String(import.meta.env.VITE_FORCE_AUTH || '').toLowerCase() === 'true';

/** true cuando no hay credenciales Y no se fuerza auth: la app funciona con datos de muestra en memoria. */
export const DEMO = (!url || !anon) && !FORCE_AUTH;

/** true si se pidió auth real pero faltan credenciales: la app debe mostrar aviso y no dejar entrar. */
export const AUTH_MISCONFIG = (!url || !anon) && FORCE_AUTH;

export const supabase = (!url || !anon) ? null : createClient(url, anon);

// ---------------- DATOS DEMO (solo cuando DEMO === true) ----------------
export const demoDB = {
  consultores: [
    { id: 'c1', nombre: 'Carlota', apellidos: '', rol: 'consultor', email: 'carlota@tuconsultor.com', nivel: 'J3', normas: ['9001','14001','27001','45001'], capacidad_clientes: 12, activo: true },
    { id: 'c2', nombre: 'Irene',   apellidos: '', rol: 'director',   email: 'irene@tuconsultor.com',   nivel: 'J2', normas: ['9001','14001'],                 capacidad_clientes: 17, activo: true },
    { id: 'c3', nombre: 'Daniela', apellidos: '', rol: 'consultor', email: 'daniela@tuconsultor.com', nivel: 'J1', normas: ['9001'],                          capacidad_clientes: 8,  activo: false },
  ],
  // Perfiles (cuentas): en producción es la tabla de la que salen el equipo
  // de las sesiones y el enlace de calendario. En demo, las mismas personas.
  perfiles: [
    { id: 'c1', nombre: 'Carlota', apellidos: '', rol: 'consultor', email: 'carlota@tuconsultor.com', nivel: 'J3', activo: true, feed_token: null },
    { id: 'c2', nombre: 'Irene',   apellidos: '', rol: 'director',  email: 'irene@tuconsultor.com',   nivel: 'J2', activo: true, feed_token: null },
    { id: 'c3', nombre: 'Daniela', apellidos: '', rol: 'consultor', email: 'daniela@tuconsultor.com', nivel: 'J1', activo: false, feed_token: null },
  ],
  clientes: [
    { id: 'cl1', codigo: 'CL-0001', empresa: 'Industrias Norte S.L.', cif: 'B12345678', contacto: 'María López', email: 'maria@industriasnorte.es', telefono: '+34 600 111 222' },
    { id: 'cl2', codigo: 'CL-0002', empresa: 'TechSecure S.A.',       cif: 'A87654321', contacto: 'Jorge Ruiz',  email: 'jorge@techsecure.es',      telefono: '+34 600 333 444' },
  ],
  proyectos: [
    { id: 'p1', cliente_id: 'cl1', normas: ['9001','14001'], modelo: 'Implicación', consultor_id: 'c1', estado: 'activo', fecha_inicio: '2026-02-01', fecha_auditoria: '2026-11-15', precio_mes: 975,  precio_total: null, notas: '' },
    { id: 'p2', cliente_id: 'cl1', normas: ['45001'],        modelo: 'Relación',    consultor_id: 'c2', estado: 'activo', fecha_inicio: '2026-03-01', fecha_auditoria: null,          precio_mes: 350,  precio_total: null, notas: '' },
    { id: 'p3', cliente_id: 'cl2', normas: ['27001'],        modelo: 'Apoyo',       consultor_id: 'c1', estado: 'implantación', fecha_inicio: '2026-05-10', fecha_auditoria: '2026-09-30', precio_mes: null, precio_total: 8100, notas: 'Bolsa 90 h' },
  ],
  cliente_empresas: [
    { id: 'e1', cliente_id: 'cl1', cif: 'B12345678', razon_social: 'Industrias Norte S.L.' },
    { id: 'e2', cliente_id: 'cl1', cif: 'B99887766', razon_social: 'Norte Logística S.L.U.' },
    { id: 'e3', cliente_id: 'cl2', cif: 'A87654321', razon_social: 'TechSecure S.A.' },
  ],
  empresa_centros: [
    { id: 'ct1', empresa_id: 'e1', nombre: 'Fábrica Alcobendas', direccion: 'Pol. Ind. Norte, nave 12' },
    { id: 'ct2', empresa_id: 'e1', nombre: 'Oficinas centrales', direccion: 'C/ Mayor 1, Madrid' },
    { id: 'ct3', empresa_id: 'e3', nombre: 'Sede Madrid', direccion: 'P.º Castellana 200' },
  ],
  empresa_normas: [
    { id: 'en1', empresa_id: 'e1', norma_id: '9001',  alcance: 'Diseño y fabricación de componentes metálicos.' },
    { id: 'en2', empresa_id: 'e1', norma_id: '14001', alcance: 'Diseño y fabricación de componentes metálicos.' },
    { id: 'en3', empresa_id: 'e3', norma_id: '27001', alcance: 'Servicios de ciberseguridad gestionada.' },
  ],
  procesos_internos: [
    { id: 'pi1', nombre: 'Reunión de equipo', codigo: 'PI-REU', descripcion: 'Reuniones internas', color: '#0A2A6C', activo: true, orden: 10 },
    { id: 'pi2', nombre: 'Formación interna', codigo: 'PI-FORM', descripcion: 'Formación del equipo', color: '#0e7490', activo: true, orden: 20 },
    { id: 'pi3', nombre: 'Mejora de metodología', codigo: 'PI-MET', descripcion: 'Plantillas y herramientas', color: '#7c3aed', activo: true, orden: 30 },
  ],
  presupuestos: [
    { id: 'pr1', email: 'maria@industriasnorte.es', normas: ['9001','14001','27001'], modelo: 'Implicación', precio: 1325, tipo: 'mes', creado: '2026-06-01T10:00:00Z' },
  ],
  // ── Proyectos, equipo, tareas y sesiones (control de horas, v116) ──
  // Lo justo para que Control de horas y las agendas enseñen algo sin base
  // de datos: dos proyectos vivos, Carlota en los dos, Irene en uno.
  proyectos_cliente: [
    { id: 'pc1', cliente_id: 'cl1', codigo: 'INOR-2026-REL-9-14', nombre: 'Industrias Norte · 9001 + 14001 · Relación', normas: ['9001','14001'], modelo: 'Relación', estado: 'activo', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31', fecha_limite: '2026-11-15', meses_estimados: 12, funciones: { pm_tool: true, datos_cliente: true, procesos: ['PE1'] } },
    { id: 'pc2', cliente_id: 'cl2', codigo: 'TSEC-2026-IMP-27', nombre: 'TechSecure · 27001 · Implicación', normas: ['27001'], modelo: 'Implicación', estado: 'activo', fecha_inicio: '2026-04-01', fecha_fin: '2027-03-31', meses_estimados: 12 },
  ],
  proyecto_equipo: [
    { id: 'pe1', proyecto_id: 'pc1', perfil_id: 'c1', papel: 'consultor' },
    { id: 'pe2', proyecto_id: 'pc1', perfil_id: 'c2', papel: 'responsable' },
    { id: 'pe3', proyecto_id: 'pc2', perfil_id: 'c1', papel: 'consultor' },
    { id: 'pe4', proyecto_id: 'pc2', perfil_id: 'c2', papel: 'consultor' },
  ],
  // Vista equipo_visible_proyecto (v124): nombres del equipo que ve el cliente.
  equipo_visible_proyecto: [
    { proyecto_id: 'pc1', perfil_id: 'c1', papel: 'consultor', nombre: 'Carlota', apellidos: '', nivel: 'J3' },
    { proyecto_id: 'pc1', perfil_id: 'c2', papel: 'responsable', nombre: 'Irene', apellidos: '', nivel: 'J2' },
    { proyecto_id: 'pc2', perfil_id: 'c1', papel: 'consultor', nombre: 'Carlota', apellidos: '', nivel: 'J3' },
    { proyecto_id: 'pc2', perfil_id: 'c2', papel: 'consultor', nombre: 'Irene', apellidos: '', nivel: 'J2' },
  ],
  cliente_tareas: [
    { id: 'ct1', cliente_id: 'cl1', proyecto_id: 'pc1', norma_id: '9001', modelo: 'Relación', titulo: 'Contexto de la organización', codigo: 'INOR-9001-01', horas: 40, tipo: 'produccion', subproceso: 'S1 PE1 GESTIÓN DEL CONTEXTO Y GI', definicion: 'Identificar las cuestiones internas y externas y las partes interesadas, y dejar el análisis documentado y revisado por la dirección.', subtareas: [{ texto: 'Entrevista con dirección sobre contexto', hecha: true, fecha: '2026-09-02' }, { texto: 'Matriz de partes interesadas', hecha: false, fecha: null }, { texto: 'DAFO revisado y aprobado', hecha: false, fecha: null }] },
    { id: 'ct2', cliente_id: 'cl1', proyecto_id: 'pc1', norma_id: '9001', modelo: 'Relación', titulo: 'Auditoría interna', codigo: 'INOR-9001-02', horas: 32, tipo: 'produccion', subproceso: 'S2 PE2 AUDITORÍA INTERNA' },
    { id: 'ct3', cliente_id: 'cl1', proyecto_id: 'pc1', norma_id: '14001', modelo: 'Relación', titulo: 'Aspectos ambientales', codigo: 'INOR-14001-01', horas: 48, tipo: 'produccion', subproceso: 'S2 PE1 GESTIÓN DE RIESGOS' },
    { id: 'ct4', cliente_id: 'cl2', proyecto_id: 'pc2', norma_id: '27001', modelo: 'Implicación', titulo: 'Análisis de riesgos', codigo: 'TSEC-27001-01', horas: 60, tipo: 'produccion' },
    { id: 'ct5', cliente_id: 'cl2', proyecto_id: 'pc2', norma_id: '27001', modelo: 'Implicación', titulo: 'Declaración de aplicabilidad', codigo: 'TSEC-27001-02', horas: 36, tipo: 'produccion' },
  ],
  cliente_documentos: [
    { id: 'doc1', cliente_id: 'cl1', proyecto_id: 'pc1', titulo: 'Certificado ISO 45001 · Bureau Veritas', tipo: 'certificado', nombre_fichero: 'cert-45001-bv.pdf', mime: 'application/pdf', creado: '2026-08-20T10:00:00Z' },
    { id: 'doc2', cliente_id: 'cl1', proyecto_id: 'pc1', titulo: 'Escritura de constitución', tipo: 'escritura', nombre_fichero: 'escritura.pdf', mime: 'application/pdf', creado: '2026-08-20T10:05:00Z' },
  ],
  cliente_certificados: [
    { id: 'cc1', cliente_id: 'cl1', proyecto_id: 'pc1', norma: '9001', entidad: 'AENOR', numero: 'ER-0412/2024', alcance: 'Diseño y fabricación de estructuras metálicas', fecha_certificacion: '2024-10-15', fecha_validez: '2027-10-14', documento_id: null, notas: null },
    { id: 'cc2', cliente_id: 'cl1', proyecto_id: 'pc1', norma: '14001', entidad: 'AENOR', numero: 'GA-0198/2024', alcance: 'Diseño y fabricación de estructuras metálicas', fecha_certificacion: '2024-10-15', fecha_validez: '2027-10-14', documento_id: null, notas: null },
  ],
  tarea_sesiones: [
    { id: 'ts1', cliente_tarea_id: 'ct1', consultor_id: 'c1', fecha: '2026-09-02', hora_inicio: '09:00', hora_fin: '13:00', horas: 4, estado: 'hecha' },
    { id: 'ts2', cliente_tarea_id: 'ct1', consultor_id: 'c1', fecha: '2026-09-09', hora_inicio: '09:00', hora_fin: '13:00', horas: 4, estado: 'programada' },
    { id: 'ts3', cliente_tarea_id: 'ct3', consultor_id: 'c1', fecha: '2026-09-16', hora_inicio: '10:00', hora_fin: '14:00', horas: 4, estado: 'programada' },
    { id: 'ts4', cliente_tarea_id: 'ct4', consultor_id: 'c2', fecha: '2026-09-10', hora_inicio: '09:00', hora_fin: '12:00', horas: 3, estado: 'programada' },
    { id: 'ts5', cliente_tarea_id: 'ct4', consultor_id: 'c1', fecha: '2026-08-25', hora_inicio: '09:00', hora_fin: '14:00', horas: 5, estado: 'hecha' },
    { id: 'ts6', tarea_interna_id: 'ti1', consultor_id: 'c1', fecha: '2026-09-07', hora_inicio: '09:00', hora_fin: '11:00', horas: 2, estado: 'hecha' },
    { id: 'ts7', tarea_interna_id: 'ti2', consultor_id: 'c1', fecha: '2026-09-18', hora_inicio: '15:00', hora_fin: '18:00', horas: 3, estado: 'programada' },
  ],
};

export function demoClone(table) {
  return JSON.parse(JSON.stringify(demoDB[table] || []));
}
