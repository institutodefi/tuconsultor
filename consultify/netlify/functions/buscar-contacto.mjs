// ════════════════════════════════════════════════════════════════════════════
// BUSCAR UN CONTACTO EN LINKEDIN / LA WEB · /api/buscar-contacto (v140)
//
// El equipo escribe un nombre y una empresa (o pega la URL de LinkedIn) y la
// IA busca en fuentes públicas la información profesional: cargo, empresa,
// perfil de LinkedIn, ciudad. Devuelve una PROPUESTA: nada entra en el CRM
// hasta que alguien la revisa y pulsa guardar.
//
// Límites, y no son de adorno:
//   · Solo datos profesionales públicos (cargo, empresa, perfil). Nunca
//     teléfono personal, dirección particular ni nada de la vida privada.
//   · Quien queda registrado por esta vía lleva origen «ia-web» y la fuente,
//     porque hay que informarle (art. 14 RGPD) en el primer contacto o antes
//     de un mes. La ficha lo recuerda hasta que se marque.
//   · No se accede a LinkedIn con cuenta ni se extraen perfiles de forma
//     masiva: es una búsqueda web normal, una persona cada vez.
// ════════════════════════════════════════════════════════════════════════════
import { limpiarFila, capitalizar } from '../../app/src/lib/capitalizar.js';

const env = (n) => process.env[n] || '';
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });
const MODELO = env('MODELO_CONTACTOS') || env('MODELO_DOCUMENTOS') || 'claude-sonnet-5';

async function quienLlama(req) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const key = env('SUPABASE_SERVICE_ROLE_KEY');
  const u = await fetch(`${env('SUPABASE_URL')}/auth/v1/user`, { headers: { apikey: env('SUPABASE_ANON_KEY') || key, Authorization: `Bearer ${token}` } });
  if (!u.ok) return null;
  const { id } = await u.json();
  const p = await fetch(`${env('SUPABASE_URL')}/rest/v1/perfiles?id=eq.${id}&select=id,rol,activo,nombre`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const perfil = p.ok ? (await p.json())?.[0] : null;
  if (!perfil || perfil.activo === false || !['superadmin', 'admin', 'gestion'].includes(perfil.rol)) return null;
  return perfil;
}

const INSTRUCCIONES = `Eres el asistente del CRM de TuConsultor (consultora española de sistemas de gestión ISO). Te piden localizar la información PROFESIONAL PÚBLICA de una persona para darla de alta como contacto de empresa.

Busca en la web (LinkedIn público, web de la empresa, notas de prensa, registros profesionales). Devuelve SOLO un JSON con esta forma, sin texto alrededor ni bloques de código:
{
  "encontrado": true|false,
  "confianza": "alta"|"media"|"baja",
  "nombre": "", "apellidos": "", "cargo": "", "empresa": "", "empresa_web": "",
  "linkedin_url": "", "ciudad": "", "email_publico": "",
  "resumen": "una o dos frases sobre su perfil profesional",
  "fuentes": ["url", "url"],
  "candidatos": [{"nombre": "", "cargo": "", "empresa": "", "linkedin_url": "", "ciudad": "", "afinidad": 0, "motivo": ""}]
}
Reglas:
- Solo datos profesionales: cargo, empresa, perfil público, ciudad de trabajo, correo profesional si la propia empresa lo publica. NUNCA teléfonos personales, direcciones particulares, datos de familia, salud, opiniones ni nada privado.
- "candidatos": HASTA 5 personas que podrían ser la buscada, ordenadas de más a menos probable, incluida la principal en primer lugar. "afinidad" es 0-100 según coincidan nombre, empresa, cargo y ciudad con lo pedido; "motivo" dice en una frase por qué (p. ej. «mismo nombre y misma empresa» o «mismo nombre, otra empresa del sector»). Pon la más probable también en los campos principales.
- Si no encuentras nada fiable, "encontrado": false y explica en "resumen" qué has probado.
- "fuentes": las URL de donde sale cada dato. Sin fuente, no afirmes.
- Responde en español. Nombres con mayúsculas y minúsculas normales.`;

export default async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido' }, 405);
  const clave = env('ANTHROPIC_API_KEY');
  if (!clave) return json({ ok: false, error: 'Falta ANTHROPIC_API_KEY en Netlify.' }, 500);
  const quien = await quienLlama(req);
  if (!quien) return json({ ok: false, error: 'Solo administración y gestión pueden buscar contactos.' }, 401);
  let body = {};
  try { body = await req.json(); } catch { body = {}; }
  const nombre = String(body.nombre || '').trim();
  const empresa = String(body.empresa || '').trim();
  const url = String(body.linkedin_url || '').trim();
  const pista = String(body.pista || '').trim();
  if (!nombre && !url) return json({ ok: false, error: 'Escribe al menos el nombre de la persona o la URL de su perfil.' }, 400);

  const peticion = [nombre && `Persona: ${nombre}`, empresa && `Empresa (probable): ${empresa}`, url && `URL de LinkedIn: ${url}`, pista && `Pistas: ${pista}`].filter(Boolean).join('\n');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': clave, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODELO, max_tokens: 1500, system: INSTRUCCIONES,
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
      messages: [{ role: 'user', content: peticion }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    return json({ ok: false, error: `La IA no respondió (${r.status}). ${t.slice(0, 200)}` }, 502);
  }
  const j = await r.json();
  const texto = (j.content || []).filter((x) => x.type === 'text').map((x) => x.text).join('\n');
  const limpio = texto.replace(/```json|```/g, '').trim();
  const m = limpio.match(/\{[\s\S]*\}/);
  let datos = null;
  try { datos = JSON.parse(m ? m[0] : limpio); } catch { datos = null; }
  if (!datos) return json({ ok: false, error: 'La IA no devolvió una propuesta legible.', texto: limpio.slice(0, 600) }, 502);

  // Lo que se propone entra ya con la forma de la base (mayúsculas, correo…).
  const p = limpiarFila('contactos', { nombre: datos.nombre || '', apellidos: datos.apellidos || '', cargo: datos.cargo || '', email: datos.email_publico || '' });
  const propuesta = {
    encontrado: datos.encontrado !== false, confianza: datos.confianza || 'media',
    nombre: p.nombre || '', apellidos: p.apellidos || '', cargo: p.cargo || '', email: p.email || '',
    empresa: capitalizar(datos.empresa || '') || '', empresa_web: datos.empresa_web || '', ciudad: capitalizar(datos.ciudad || '') || '',
    linkedin_url: /^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(datos.linkedin_url || '') ? datos.linkedin_url : (url || ''),
    resumen: String(datos.resumen || '').slice(0, 600),
    fuentes: Array.isArray(datos.fuentes) ? datos.fuentes.filter((f) => /^https?:\/\//.test(String(f))).slice(0, 6) : [],
    candidatos: (Array.isArray(datos.candidatos) ? datos.candidatos : []).filter((c) => c && c.nombre).slice(0, 5).map((c) => ({
      nombre: capitalizar(c.nombre || '') || '', cargo: capitalizar(c.cargo || '') || '', empresa: capitalizar(c.empresa || '') || '', ciudad: capitalizar(c.ciudad || '') || '',
      linkedin_url: /^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(c.linkedin_url || '') ? c.linkedin_url : '',
      afinidad: Math.max(0, Math.min(100, Number(c.afinidad) || 0)), motivo: String(c.motivo || '').slice(0, 200),
    })).sort((a, b) => b.afinidad - a.afinidad),
    fuente_datos: `Búsqueda IA en fuentes públicas (${new Date().toLocaleDateString('es-ES')}) por ${quien.nombre || 'equipo'}${Array.isArray(datos.fuentes) && datos.fuentes[0] ? `: ${datos.fuentes[0]}` : ''}`,
  };
  return json({ ok: true, propuesta, modelo: MODELO });
};

export const config = { path: '/api/buscar-contacto' };
