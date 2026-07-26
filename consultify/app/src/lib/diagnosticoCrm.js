import { supabase, DEMO } from './supabase.js';

// ════════════════════════════════════════════════════════════════════════════
// DIAGNÓSTICO DE ESCRITURA DEL CRM
//
// Cuando "no deja crear" y el mensaje no basta, esto responde a las tres
// preguntas que importan, con la respuesta literal de Postgres:
//
//   1 · ¿Quién soy para la base de datos?  (auth.uid y mi fila en perfiles)
//   2 · ¿Me deja escribir?                (inserción de prueba, que se borra)
//   3 · ¿Está el esquema completo?         (columnas que la ficha necesita)
//
// La política de escritura de empresas/contactos (migración v48) exige una
// fila en `perfiles` con activo = true y un rol de la lista. Si `activo` es
// NULL —no false, NULL— la condición no se cumple y todo queda bloqueado sin
// más explicación. Es el fallo más habitual y aquí se ve de un vistazo.
// ════════════════════════════════════════════════════════════════════════════

const ROLES_QUE_ESCRIBEN = ['superadmin', 'admin', 'consultor', 'gestion'];

// Columnas que la ficha de empresa da por hechas (migraciones v48 + v56).
const COLUMNAS = {
  empresas: ['id', 'nombre', 'cif', 'nombre_comercial', 'es_cliente', 'es_proveedor',
    'estado_comercial', 'empresa_matriz_id', 'direccion', 'poblacion', 'cp', 'provincia',
    'pais', 'email', 'telefono', 'movil', 'web', 'vat_id', 'notas', 'holded_id',
    'holded_datos', 'holded_sincronizado_en', 'brevo_sincronizado_en'],
  contactos: ['id', 'nombre', 'apellidos', 'cargo', 'email', 'telefono',
    'consentimiento_marketing', 'brevo_id', 'notas'],
  empresa_contactos: ['id', 'empresa_id', 'contacto_id', 'rol', 'principal', 'cargo'],
  homologaciones: ['id', 'empresa_id', 'concepto', 'estado'],
  reglas_comerciales: ['id', 'nombre', 'tipo', 'activa', 'valor', 'unidad'],
};

const err = (e) => e ? { code: e.code || '', message: e.message || String(e), details: e.details || '', hint: e.hint || '' } : null;

export async function diagnosticarCrm() {
  if (DEMO) return { demo: true, conclusion: 'Modo demo: no hay base de datos que comprobar.' };
  if (!supabase) return { conclusion: 'La aplicación no está conectada a Supabase (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el despliegue).' };

  const r = { sesion: null, perfil: null, tablas: {}, conclusion: '', problemas: [] };

  // ── 1 · Quién soy ────────────────────────────────────────────────────────
  const { data: sesion } = await supabase.auth.getSession();
  const u = sesion?.session?.user || null;
  r.sesion = u ? { uid: u.id, email: u.email, rol_jwt: sesion.session?.user?.role || '' } : null;
  if (!u) {
    r.problemas.push('No hay sesión activa: sin `auth.uid()` toda escritura queda bloqueada. Vuelve a entrar.');
    r.conclusion = 'Sin sesión.';
    return r;
  }

  // ── 2 · Mi fila en perfiles ──────────────────────────────────────────────
  const { data: perfil, error: ePerfil } = await supabase
    .from('perfiles').select('id, rol, activo, nombre, email').eq('id', u.id).maybeSingle();
  r.perfil = { fila: perfil || null, error: err(ePerfil) };

  if (!perfil) {
    r.problemas.push('No existe tu fila en `perfiles`. La política de escritura del CRM la exige, así que ninguna alta puede funcionar.');
  } else {
    if (perfil.activo !== true) {
      r.problemas.push(perfil.activo === null
        ? 'Tu `perfiles.activo` es NULL. La política pide `and p.activo`, y NULL no es verdadero: bloquea igual que false.'
        : 'Tu `perfiles.activo` es false: la política de escritura te excluye.');
    }
    if (!ROLES_QUE_ESCRIBEN.includes(perfil.rol)) {
      r.problemas.push(`Tu rol es «${perfil.rol}» y la política v48 solo admite ${ROLES_QUE_ESCRIBEN.join(', ')}. Ojo: «director» NO está en esa lista aunque la interfaz le muestre los botones.`);
    }
  }

  // ── 3 · Prueba real de escritura, tabla por tabla ────────────────────────
  // Se inserta una fila reconocible y se borra a continuación. Si el borrado
  // fallara, se avisa para poder limpiarla a mano.
  const marca = `__diagnostico_${Date.now()}`;

  async function probar(tabla, fila) {
    const res = { lectura: null, escritura: null, borrado: null, columnasAusentes: [] };

    // Lectura
    const { error: eSel } = await supabase.from(tabla).select('id').limit(1);
    res.lectura = eSel ? { ok: false, ...err(eSel) } : { ok: true };

    // Columnas: se piden todas de golpe; PostgREST nombra la primera que falta.
    let faltan = [];
    let cols = COLUMNAS[tabla].slice();
    for (let i = 0; i < 30; i++) {
      const { error } = await supabase.from(tabla).select(cols.join(',')).limit(1);
      if (!error) break;
      const m = (error.message || '').match(/column ["']?([a-z_0-9.]+)["']? does not exist/i)
             || (error.message || '').match(/could not find the '([^']+)' column/i);
      if (!m) { faltan.push(`(no identificada) ${error.message}`); break; }
      const mala = m[1].split('.').pop();
      faltan.push(mala);
      cols = cols.filter((c) => c !== mala);
      if (!cols.length) break;
    }
    res.columnasAusentes = faltan;

    // Escritura
    const { data: creada, error: eIns } = await supabase.from(tabla).insert(fila).select('id').maybeSingle();
    if (eIns) {
      res.escritura = { ok: false, ...err(eIns) };
    } else {
      res.escritura = { ok: true, id: creada?.id || null, leidaDeVuelta: !!creada?.id };
      if (creada?.id) {
        const { error: eDel } = await supabase.from(tabla).delete().eq('id', creada.id);
        res.borrado = eDel ? { ok: false, ...err(eDel) } : { ok: true };
      } else {
        res.borrado = { ok: false, message: 'La fila se creó pero no se pudo leer de vuelta: la política de LECTURA no la devuelve. Habrá quedado una fila de prueba.' };
      }
    }
    return res;
  }

  r.tablas.empresas = await probar('empresas', {
    nombre: marca, cif: `X${String(Date.now()).slice(-8)}`, es_cliente: false, es_proveedor: false,
  });
  r.tablas.contactos = await probar('contactos', {
    nombre: marca, email: `${marca}@ejemplo.invalid`,
  });

  // ── 4 · Conclusión ───────────────────────────────────────────────────────
  for (const [t, x] of Object.entries(r.tablas)) {
    if (x.columnasAusentes.length) r.problemas.push(`A la tabla «${t}» le faltan columnas: ${x.columnasAusentes.join(', ')}. Ejecuta las migraciones v48 y v56 y recarga el esquema.`);
    if (x.escritura && !x.escritura.ok) {
      const c = x.escritura.code;
      const porRls = c === '42501' || /row-level security/i.test(x.escritura.message || '');
      r.problemas.push(porRls
        ? `«${t}»: la seguridad de fila rechaza la inserción (${c || 'RLS'}). Es la política, no los datos.`
        : `«${t}»: ${c ? c + ' · ' : ''}${x.escritura.message}`);
    }
    if (x.escritura?.ok && !x.escritura.leidaDeVuelta) {
      r.problemas.push(`«${t}»: se puede escribir pero no leer de vuelta. Las altas parecerían fallar aunque se guarden, porque el listado no las ve.`);
    }
  }

  const escribeTodo = Object.values(r.tablas).every((x) => x.escritura?.ok && x.escritura.leidaDeVuelta);
  r.conclusion = escribeTodo && !r.problemas.length
    ? 'Lectura y escritura correctas en empresas y contactos. El problema no está en la base de datos.'
    : (r.problemas[0] || 'Hay algo que no cuadra; revisa el detalle.');
  r.marca = marca;
  return r;
}

/** Informe en texto plano, para pegarlo tal cual. */
export function informeTexto(r) {
  if (!r) return '';
  const l = [];
  l.push('DIAGNÓSTICO CRM · ' + new Date().toISOString());
  l.push('Conclusión: ' + r.conclusion);
  if (r.sesion) l.push(`Sesión: ${r.sesion.email} · uid ${r.sesion.uid}`);
  if (r.perfil) l.push(`perfiles: ${r.perfil.fila ? `rol=${r.perfil.fila.rol} activo=${String(r.perfil.fila.activo)}` : 'SIN FILA'}${r.perfil.error ? ` · error ${r.perfil.error.code} ${r.perfil.error.message}` : ''}`);
  for (const [t, x] of Object.entries(r.tablas || {})) {
    l.push(`── ${t}`);
    l.push(`   lectura: ${x.lectura?.ok ? 'ok' : `${x.lectura?.code || ''} ${x.lectura?.message || ''}`}`);
    l.push(`   escritura: ${x.escritura?.ok ? (x.escritura.leidaDeVuelta ? 'ok' : 'creada pero NO legible') : `${x.escritura?.code || ''} ${x.escritura?.message || ''}`}`);
    if (x.columnasAusentes?.length) l.push(`   columnas ausentes: ${x.columnasAusentes.join(', ')}`);
  }
  if (r.problemas?.length) { l.push('── problemas'); r.problemas.forEach((p) => l.push('   · ' + p)); }
  return l.join('\n');
}
