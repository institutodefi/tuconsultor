// ════════════════════════════════════════════════════════════════════════════
// COPIA DE SEGURIDAD PROGRAMADA · cada 10 minutos
//
// Exporta las tablas del CRM a Supabase Storage en JSON comprimido. Es la
// SEGUNDA línea de defensa, no la primera: para recuperar un borrado accidental
// sirve mucho mejor el PITR de Supabase (ver supabase/COPIAS-DE-SEGURIDAD.md).
// Esto cubre el escenario que el PITR no cubre: que el problema esté en
// Supabase, o que alguien con acceso legítimo destruya datos y haya que volver
// a un momento concreto teniendo el fichero fuera de la plataforma.
//
// Lo que hace:
//   1 · lee las tablas con la clave de servicio (se salta la RLS a propósito:
//       una copia parcial no es una copia)
//   2 · si NADA ha cambiado desde la última, no escribe: 144 copias diarias
//       idénticas solo gastan almacenamiento
//   3 · guarda como JSON + gzip en el bucket `copias`
//   4 · rota: conserva todas las de las últimas 48 h y una diaria más allá
//
// Requiere en Netlify:
//   SUPABASE_URL              (ya está)
//   SUPABASE_SERVICE_ROLE_KEY (clave de servicio, NO la anon)
// Y en Supabase, un bucket privado llamado `copias`.
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const TABLAS = [
  'perfiles', 'empresas', 'contactos', 'empresa_contactos', 'homologaciones',
  'clientes', 'miembros_cliente', 'proyectos', 'tareas', 'ofertas', 'presupuestos',
  'leads', 'reglas_comerciales', 'sistemas', 'versiones',
  'accesibilidad_criterios', 'accesibilidad_conformidad',
];

// El registro de accesos se copia aparte y sin límite de filas: es el que más
// crece y el que más importa conservar íntegro para una auditoría.
const TABLAS_REGISTRO = ['registro_accesos'];

const BUCKET = 'copias';
const HORAS_TODAS = 48;          // por debajo de esto se conservan todas
const DIAS_DIARIAS = 90;         // por encima, una al día durante 90 días

export default async function handler() {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) {
    return respuesta(500, { ok: false, error: 'Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.' });
  }

  const sb = createClient(url, clave, { auth: { persistSession: false } });
  const inicio = Date.now();
  const volcado = { generado: new Date().toISOString(), tablas: {} };
  const fallos = [];

  for (const t of [...TABLAS, ...TABLAS_REGISTRO]) {
    try {
      // Paginado: hay tablas que superan el límite por defecto de PostgREST.
      const filas = [];
      const paso = 1000;
      for (let desde = 0; ; desde += paso) {
        const { data, error } = await sb.from(t).select('*').range(desde, desde + paso - 1);
        if (error) throw error;
        filas.push(...(data || []));
        if (!data || data.length < paso) break;
        if (filas.length > 200000) break;        // tope de seguridad
      }
      volcado.tablas[t] = filas;
    } catch (e) {
      // Una tabla que aún no existe no debe tumbar la copia entera.
      fallos.push(`${t}: ${e?.message || e}`);
    }
  }

  const cuerpo = JSON.stringify(volcado);
  const huella = createHash('sha256')
    .update(JSON.stringify(volcado.tablas))     // sin la marca de tiempo
    .digest('hex');

  // ── ¿Ha cambiado algo? ──
  try {
    const { data: ultima } = await sb.storage.from(BUCKET).download('ultima-huella.txt');
    if (ultima) {
      const anterior = (await ultima.text()).trim();
      if (anterior === huella) {
        return respuesta(200, {
          ok: true, sin_cambios: true,
          mensaje: 'Nada ha cambiado desde la copia anterior: no se escribe.',
          filas: contar(volcado), ms: Date.now() - inicio, fallos,
        });
      }
    }
  } catch (e) { /* primera ejecución: no hay huella previa */ }

  const ahora = new Date();
  const nombre = `${ahora.toISOString().replace(/[:.]/g, '-')}.json.gz`;
  const comprimido = gzipSync(Buffer.from(cuerpo, 'utf8'));

  const { error: eSubida } = await sb.storage.from(BUCKET)
    .upload(nombre, comprimido, { contentType: 'application/gzip', upsert: false });
  if (eSubida) return respuesta(500, { ok: false, error: `No se pudo subir: ${eSubida.message}` });

  await sb.storage.from(BUCKET)
    .upload('ultima-huella.txt', Buffer.from(huella), { contentType: 'text/plain', upsert: true });

  const rotadas = await rotar(sb);

  return respuesta(200, {
    ok: true, fichero: nombre,
    bytes: comprimido.length, bytes_sin_comprimir: cuerpo.length,
    filas: contar(volcado), eliminadas: rotadas, fallos,
    ms: Date.now() - inicio,
  });
}

function contar(v) {
  const r = {};
  let total = 0;
  for (const [t, filas] of Object.entries(v.tablas)) { r[t] = filas.length; total += filas.length; }
  return { total, por_tabla: r };
}

/**
 * Rotación: todas las de las últimas 48 h, después una por día hasta 90 días.
 * Sin esto, 144 copias diarias llenan el bucket en un mes.
 */
async function rotar(sb) {
  const { data, error } = await sb.storage.from(BUCKET).list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
  if (error || !data) return 0;

  const ahora = Date.now();
  const porDia = new Map();
  const aBorrar = [];

  for (const f of data) {
    if (!f.name.endsWith('.json.gz')) continue;
    const iso = f.name.replace('.json.gz', '').replace(/-(\d{2})-(\d{2})-(\d{3})Z$/, ':$1:$2.$3Z');
    const t = Date.parse(iso);
    if (Number.isNaN(t)) continue;

    const horas = (ahora - t) / 36e5;
    if (horas <= HORAS_TODAS) continue;                 // reciente: se queda
    if (horas / 24 > DIAS_DIARIAS) { aBorrar.push(f.name); continue; }

    const dia = iso.slice(0, 10);
    if (porDia.has(dia)) aBorrar.push(f.name);          // ya hay una de ese día
    else porDia.set(dia, f.name);
  }

  if (!aBorrar.length) return 0;
  await sb.storage.from(BUCKET).remove(aBorrar);
  return aBorrar.length;
}

function respuesta(estado, cuerpo) {
  return new Response(JSON.stringify(cuerpo, null, 2), {
    status: estado, headers: { 'Content-Type': 'application/json' },
  });
}

// Cada 10 minutos. Netlify usa la sintaxis cron estándar en UTC.
export const config = { schedule: '*/10 * * * *' };
