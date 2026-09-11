// Pruebas de netlify/functions/brevo-contacto.mjs (v138): a qué lista va cada contacto.
// Ejecutar: node scripts/test-brevo-contacto.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const F = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'consultify', 'netlify', 'functions') + '/';
const { subirContactoBrevo, LISTA_PENDIENTES, LISTA_CONFIRMADOS } = await import(F + 'brevo-contacto.mjs');
let fallos = 0;
const ok = (c, m) => { console.log(`${c ? '✓' : '✗ FALLO'} ${m}`); if (!c) fallos++; };

// fetch simulado: guarda lo que se envía a Brevo y responde 204.
let enviado = null; let estado = 204;
globalThis.fetch = async (url, opts) => { enviado = { url, body: JSON.parse(opts.body) }; return { ok: estado < 300, status: estado, json: async () => ({ message: 'simulado' }) }; };

{
  const r = await subirContactoBrevo({ email: 'Ana@Empresa.es', nombre: 'Ana', apellidos: 'Tobarra', consentimiento_marketing: true, rgpd_aceptado: true, rgpd_fecha: '2026-09-11T10:00:00Z' }, { apiKey: 'k', empresa: 'ISABIAL' });
  ok(r.ok && r.lista === LISTA_CONFIRMADOS, 'con comunicaciones → lista de confirmados (#9)');
  ok(enviado.body.email === 'ana@empresa.es', 'correo en minúsculas');
  ok(enviado.body.listIds[0] === LISTA_CONFIRMADOS && enviado.body.unlinkListIds[0] === LISTA_PENDIENTES, 'entra en #9 y sale de #7');
  ok(enviado.body.attributes.DOI_PENDIENTE === false && enviado.body.attributes.CONSENT_MARKETING === true && enviado.body.attributes.CONSENT_RGPD === true, 'atributos de consentimiento');
  ok(enviado.body.attributes.EMPRESA === 'ISABIAL' && enviado.body.attributes.FECHA_CONSENT === '2026-09-11', 'empresa y fecha');
}
{
  const r = await subirContactoBrevo({ email: 'luis@x.es', nombre: 'Luis', rgpd_aceptado: true }, { apiKey: 'k' });
  ok(r.ok && r.lista === LISTA_PENDIENTES, 'solo datos (sin comunicaciones) → pendientes (#7), nada comercial');
  ok(enviado.body.unlinkListIds[0] === LISTA_CONFIRMADOS, 'y sale de confirmados si estaba');
}
{
  const r = await subirContactoBrevo({ nombre: 'Sin correo' }, { apiKey: 'k' });
  ok(!r.ok && /correo/.test(r.motivo), 'sin correo no se sube');
  const r2 = await subirContactoBrevo({ email: 'a@b.es' }, { apiKey: '' });
  ok(!r2.ok && /BREVO_API_KEY/.test(r2.motivo), 'sin clave se dice por qué');
  estado = 400;
  const r3 = await subirContactoBrevo({ email: 'a@b.es' }, { apiKey: 'k' });
  ok(!r3.ok && /400/.test(r3.motivo) && /simulado/.test(r3.motivo), 'error de Brevo con su mensaje');
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo correcto');
process.exit(fallos ? 1 : 0);
