// ════════════════════════════════════════════════════════════════════════════
// RESUMEN DEL DÍA · la IA cuenta a cada persona qué tiene que hacer
//
// Al entrar en Órbita, la pantalla de inicio llama aquí. Se generan UNA vez
// al día por persona (se guarda en resumenes_dia, v131) y el resto del día se
// devuelve el mismo. Con {forzar: true} se vuelve a escribir.
//
// Qué se le cuenta a la IA (lib/resumenDia.js, datosResumen): sus sesiones
// de hoy y de los próximos 7 días, las pasadas sin cerrar, sus tareas de
// proyecto con fecha vencida o prevista esta semana y las subtareas (pasos)
// que le quedan por cerrar. La IA no inventa: escribe con eso y solo eso.
// ════════════════════════════════════════════════════════════════════════════
import { datosResumen, textoParaIA, resumenLocal } from '../../app/src/lib/resumenDia.js';

const MODELO = process.env.MODELO_RESUMEN || process.env.MODELO_DOCUMENTOS || 'claude-sonnet-5';
const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

async function sb(path, { method = 'GET', body, headers = {} } = {}) {
  const key = env('SUPABASE_SERVICE_ROLE_KEY') || env('SUPABASE_SERVICE_ROLE');
  return fetch(`${env('SUPABASE_URL') || env('VITE_SUPABASE_URL')}${path}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
}
const leer = async (path) => { const r = await sb(path); return r.ok ? r.json() : []; };

async function quienLlama(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const base = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const u = await fetch(`${base}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY'), Authorization: `Bearer ${token}` } });
  if (!u.ok) return null;
  const { id, email } = await u.json();
  if (!id) return null;
  const p = await leer(`/rest/v1/perfiles?id=eq.${id}&select=id,rol,activo,nombre,apellidos`);
  return p?.[0] ? { ...p[0], email } : { id, email, rol: 'cliente', activo: true };
}
const ES_EQUIPO = (rol) => ['superadmin', 'admin', 'director', 'consultor', 'gestion'].includes(rol);

const INSTRUCCIONES = `Eres el asistente de organización de un consultor de sistemas de gestión (TuConsultor). Con los datos de abajo, escribe su resumen del día en español, en segunda persona, directo y sin adornos.

Reglas:
- Usa SOLO lo que hay en los datos. No inventes tareas, fechas ni clientes. Si una lista está vacía, dilo en una frase corta o no la menciones.
- Estructura, con estos títulos en negrita cuando haya contenido: **Hoy**, **Esta semana**, **Lo que arrastras** (sesiones pasadas sin cerrar y tareas vencidas), **Pasos por cerrar** (las subtareas más relevantes, agrupadas por tarea) y **Prioridad** (una o dos frases con lo primero que haría).
- Frases cortas. Listas con guiones cuando haya varios elementos. Nombra el cliente y el código de la tarea.
- Máximo 220 palabras. Sin saludos largos, sin despedida, sin emojis.`;

async function escribirConIA(texto) {
  const clave = env('ANTHROPIC_API_KEY');
  if (!clave) return { error: 'Falta ANTHROPIC_API_KEY.' };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODELO, max_tokens: 700, messages: [{ role: 'user', content: `${INSTRUCCIONES}\n\nDATOS:\n${texto}` }] }),
  });
  if (!r.ok) return { error: `La IA no respondió (${r.status}).` };
  const j = await r.json();
  const out = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n').trim();
  return out ? { texto: out } : { error: 'La IA devolvió vacío.' };
}

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  const quien = await quienLlama(req);
  if (!quien) return json({ ok: false, error: 'Sesión no válida.' }, 401);
  if (!ES_EQUIPO(quien.rol)) return json({ ok: false, error: 'Solo para el equipo.' }, 403);
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const hoy = body.hoy && /^\d{4}-\d{2}-\d{2}$/.test(body.hoy) ? body.hoy : new Date().toISOString().slice(0, 10);

  // Ya escrito hoy: se devuelve tal cual (una vez al día).
  if (!body.forzar) {
    const previo = await leer(`/rest/v1/resumenes_dia?perfil_id=eq.${quien.id}&fecha=eq.${hoy}&select=texto,datos,modelo,creado`);
    if (previo?.[0]) return json({ ok: true, texto: previo[0].texto, datos: previo[0].datos, creado: previo[0].creado, cacheado: true });
  }

  // Lo suyo, de todas las tablas que hacen falta.
  const [sesiones, tareas, internas, proyectos, equipo, clientes] = await Promise.all([
    leer(`/rest/v1/tarea_sesiones?consultor_id=eq.${quien.id}&select=*`),
    leer('/rest/v1/cliente_tareas?select=id,proyecto_id,consultor_id,titulo,codigo,subproceso,horas,hecha,fecha_estimada,subtareas'),
    leer(`/rest/v1/tareas_internas?select=id,titulo,consultor_id,estado`),
    leer('/rest/v1/proyectos_cliente?select=id,cliente_id,codigo,nombre,estado'),
    leer(`/rest/v1/proyecto_equipo?perfil_id=eq.${quien.id}&select=proyecto_id,perfil_id,papel`),
    leer('/rest/v1/clientes?select=id,empresa,nombre_comercial'),
  ]);
  const vivos = new Set(proyectos.filter((p) => !['cerrado', 'cancelado'].includes(String(p.estado || '').toLowerCase())).map((p) => String(p.id)));
  const r = datosResumen({ perfilId: quien.id, hoy, sesiones, tareas: tareas.filter((t) => vivos.has(String(t.proyecto_id))), internas, proyectos, equipo, clientes });
  const nombre = quien.nombre || (quien.email || '').split('@')[0];
  const ia = await escribirConIA(textoParaIA(r, nombre));
  const texto = ia.texto || resumenLocal(r, nombre);
  const fila = { perfil_id: quien.id, fecha: hoy, texto, datos: r.totales, modelo: ia.texto ? MODELO : 'local' };
  // Upsert por (perfil, fecha): si ya había uno hoy y se fuerza, se sustituye.
  await sb('/rest/v1/resumenes_dia?on_conflict=perfil_id,fecha', { method: 'POST', body: fila, headers: { Prefer: 'resolution=merge-duplicates' } });
  return json({ ok: true, texto, datos: r.totales, creado: new Date().toISOString(), cacheado: false, sinIA: !ia.texto, aviso: ia.error || null });
};

export const config = { path: '/api/resumen-dia' };
