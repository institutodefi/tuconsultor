// ════════════════════════════════════════════════════════════════════════════
// ÓRBITA → OUTLOOK · crea, mueve y cancela los eventos de las sesiones
//
// Se dispara de tres formas:
//   · Programada (netlify.toml), cada diez minutos: la red de seguridad.
//   · A mano desde Órbita: POST /api/outlook-empujar  { consultor_id }
//   · Para una sesión concreta: POST con { sesion_id }, justo después de
//     guardarla, para que el evento aparezca en el momento y no «en un rato».
//
// Ventana: de hace una semana a dentro de cuatro meses. Ni el pasado remoto
// —que ya nadie mira— ni un horizonte infinito que multiplicaría las llamadas.
//
// Qué NO hace: tocar eventos que no sean suyos. Solo escribe donde hay una
// sesión de Órbita detrás, y los reconoce por la propiedad extendida.
// ════════════════════════════════════════════════════════════════════════════

import { config, graph, sb, anotar, eventoDeSesion, buzonDe } from './outlook-lib.mjs';

const DIAS_ATRAS = 7;
const DIAS_ADELANTE = 120;
const TIPO_INTERNA = { gestion: 'Gestión y coordinación', proceso_interno: 'Proceso interno' };
const URL_ORBITA = 'https://consultify.tuconsultor.com/app/consultores/mi-agenda';

const dia = (desplazamiento) => {
  const d = new Date(); d.setDate(d.getDate() + desplazamiento);
  return d.toISOString().slice(0, 10);
};

/** Título y descripción de la sesión, con su proyecto y su cliente. */
async function contexto(sesiones) {
  const unicos = (xs) => [...new Set(xs.filter(Boolean))];
  const idsCT = unicos(sesiones.map((s) => s.cliente_tarea_id));
  const idsTI = unicos(sesiones.map((s) => s.tarea_interna_id));
  const CT = idsCT.length ? await sb(`cliente_tareas?id=in.(${idsCT.join(',')})&select=id,titulo,codigo,norma_id,proyecto_id,subproceso`) : [];
  const TI = idsTI.length ? await sb(`tareas_internas?id=in.(${idsTI.join(',')})&select=id,titulo,tipo,descripcion`) : [];
  const idsP = unicos(CT.map((t) => t.proyecto_id));
  const P = idsP.length ? await sb(`proyectos_cliente?id=in.(${idsP.join(',')})&select=id,nombre,codigo,cliente_id`) : [];
  const idsC = unicos(P.map((p) => p.cliente_id));
  const C = idsC.length ? await sb(`clientes?id=in.(${idsC.join(',')})&select=id,empresa`) : [];
  const idx = (arr) => Object.fromEntries(arr.map((x) => [String(x.id), x]));
  return { CT: idx(CT), TI: idx(TI), P: idx(P), C: idx(C) };
}

function textoDe(s, ctx) {
  const ct = ctx.CT[String(s.cliente_tarea_id)];
  const ti = ctx.TI[String(s.tarea_interna_id)];
  const proy = ct ? ctx.P[String(ct.proyecto_id)] : null;
  const cli = proy ? ctx.C[String(proy.cliente_id)] : null;
  let titulo; const desc = [];
  if (ct) {
    titulo = [cli?.empresa, ct.titulo || ct.subproceso].filter(Boolean).join(' · ') || 'Tarea de proyecto';
    desc.push(ct.codigo ? `Tarea ${ct.codigo}` : null, ct.norma_id ? `Norma ${ct.norma_id}` : null,
      proy ? `Proyecto ${proy.codigo || proy.nombre || ''}` : null);
  } else if (ti) {
    titulo = `${TIPO_INTERNA[ti.tipo] || 'Interna'} · ${ti.titulo || ''}`.trim();
    desc.push(ti.descripcion || null);
  } else titulo = 'Sesión';
  desc.push(s.notas || null, `${Number(s.horas) || 0} h`);
  return {
    titulo: (s.estado === 'hecha' ? '✓ ' : '') + titulo,
    descripcion: desc.filter(Boolean).join('<br />'),
    urlOrbita: URL_ORBITA,
  };
}

/** Empuja las sesiones de una persona. Devuelve el recuento. */
async function empujarPersona(perfil, { sesionId } = {}) {
  const buzon = buzonDe(perfil);
  const cuenta = { creados: 0, actualizados: 0, borrados: 0, errores: 0 };
  if (!buzon) return cuenta;

  const filtro = sesionId
    ? `id=eq.${sesionId}`
    : `consultor_id=eq.${perfil.id}&fecha=gte.${dia(-DIAS_ATRAS)}&fecha=lte.${dia(DIAS_ADELANTE)}`;
  const sesiones = await sb(`tarea_sesiones?${filtro}&select=*&order=fecha,hora_inicio`) || [];
  if (!sesiones.length) return cuenta;
  const ctx = await contexto(sesiones);

  for (const s of sesiones) {
    try {
      // Anulada: si tenía evento, se borra; si no, no hay nada que hacer.
      if (s.estado === 'anulada') {
        if (s.outlook_event_id) {
          await graph(`/users/${encodeURIComponent(buzon)}/events/${s.outlook_event_id}`, { method: 'DELETE' });
          await sb(`tarea_sesiones?id=eq.${s.id}`, {
            method: 'PATCH', prefer: 'return=minimal',
            body: { outlook_event_id: null, outlook_change_key: null, outlook_estado: null, outlook_sincronizado: new Date().toISOString() },
          });
          cuenta.borrados += 1;
          await anotar({ direccion: 'a_outlook', sesion_id: s.id, consultor_id: perfil.id, accion: 'borrar', resultado: 'ok' });
        }
        continue;
      }

      const cuerpo = eventoDeSesion(s, textoDe(s, ctx));

      // Ya sincronizada y sin cambios desde entonces: no se toca. Cada PATCH
      // inútil genera un aviso de vuelta que luego hay que descartar.
      if (s.outlook_event_id && s.outlook_sincronizado && new Date(s.actualizado) <= new Date(s.outlook_sincronizado)) continue;

      const r = s.outlook_event_id
        ? await graph(`/users/${encodeURIComponent(buzon)}/events/${s.outlook_event_id}`, { method: 'PATCH', body: cuerpo })
        : await graph(`/users/${encodeURIComponent(buzon)}/events`, { method: 'POST', body: cuerpo });

      // El evento ya no existe allí (alguien lo borró de verdad): se recrea.
      if (!r.ok && r.status === 404 && s.outlook_event_id) {
        const nuevo = await graph(`/users/${encodeURIComponent(buzon)}/events`, { method: 'POST', body: cuerpo });
        if (nuevo.ok) {
          await sb(`tarea_sesiones?id=eq.${s.id}`, {
            method: 'PATCH', prefer: 'return=minimal',
            body: { outlook_event_id: nuevo.datos.id, outlook_change_key: nuevo.datos.changeKey, outlook_estado: 'ok', outlook_sincronizado: new Date().toISOString() },
          });
          cuenta.creados += 1;
          continue;
        }
      }

      if (!r.ok) {
        cuenta.errores += 1;
        await sb(`tarea_sesiones?id=eq.${s.id}`, { method: 'PATCH', prefer: 'return=minimal', body: { outlook_estado: 'error' } });
        await anotar({ direccion: 'a_outlook', sesion_id: s.id, consultor_id: perfil.id, accion: s.outlook_event_id ? 'actualizar' : 'crear', resultado: 'error', detalle: `${r.status} ${JSON.stringify(r.datos || {}).slice(0, 300)}` });
        continue;
      }

      await sb(`tarea_sesiones?id=eq.${s.id}`, {
        method: 'PATCH', prefer: 'return=minimal',
        body: {
          outlook_event_id: r.datos?.id || s.outlook_event_id,
          // El changeKey es el antídoto contra el bucle: cuando vuelva el aviso
          // de esta misma escritura, coincidirá y se ignorará.
          outlook_change_key: r.datos?.changeKey || null,
          outlook_estado: 'ok',
          outlook_sincronizado: new Date().toISOString(),
        },
      });
      if (s.outlook_event_id) cuenta.actualizados += 1; else cuenta.creados += 1;
    } catch (e) {
      cuenta.errores += 1;
      await anotar({ direccion: 'a_outlook', sesion_id: s.id, consultor_id: perfil.id, accion: 'empujar', resultado: 'error', detalle: String(e.message).slice(0, 300) });
    }
  }
  return cuenta;
}

export default async (req) => {
  const c = config();
  if (!c.listo) return Response.json({ ok: false, error: 'Outlook sin configurar' }, { status: 503 });

  let peticion = {};
  if (req.method === 'POST') { try { peticion = await req.json(); } catch { /* programada */ } }

  // A quién le toca: uno o todos los que lo tengan activado.
  let perfiles;
  if (peticion.sesion_id) {
    const [s] = await sb(`tarea_sesiones?id=eq.${peticion.sesion_id}&select=consultor_id`) || [];
    if (!s?.consultor_id) return Response.json({ ok: true, nota: 'sesión sin consultor' });
    perfiles = await sb(`perfiles?id=eq.${s.consultor_id}&outlook_sync=is.true&select=id,email,outlook_upn`) || [];
  } else if (peticion.consultor_id) {
    perfiles = await sb(`perfiles?id=eq.${peticion.consultor_id}&outlook_sync=is.true&select=id,email,outlook_upn`) || [];
  } else {
    perfiles = await sb('perfiles?outlook_sync=is.true&activo=is.true&select=id,email,outlook_upn') || [];
  }

  const total = { creados: 0, actualizados: 0, borrados: 0, errores: 0 };
  for (const p of perfiles) {
    const r = await empujarPersona(p, { sesionId: peticion.sesion_id });
    for (const k of Object.keys(total)) total[k] += r[k];
  }
  return Response.json({ ok: true, personas: perfiles.length, ...total });
};
