// node scripts/test-anexo-planes.mjs · el Anexo I de un plan sale de la base y
// una oferta de implantación no habla de mensualidad. (v145)
//
// El fallo: `catalogoAnexo.js` tenía once normas y ninguna era un plan, así que
// una oferta de Plan de Diversidad salía con el Anexo I vacío —precio sin
// trabajo— y con la cláusula de «pasa al modelo de mantenimiento», que en un
// plan no existe.
import { montarDocumento, tareasPorBloque } from '../app/src/lib/documentoOferta.js';
import { condiciones, clausulas, tipoDeAlcance } from '../app/src/lib/contenidoOferta.js';

const t = [];
const KICK = { proceso: 'PO2 GESTIÓN DEL PROYECTO', subproceso: 'S0 PO2 COORDINACIÓN Y KICKOFF', titulo: 'Coordinación y kickoff del proyecto', orden: 0 };
const vivo = [
  { norma_id: 'diversidad', modelo: 'Implantación', ...KICK },
  { norma_id: 'diversidad', modelo: 'Implantación', proceso: '1. Compromiso de la organización', subproceso: 'Decisión y comunicación del compromiso', orden: 1 },
  { norma_id: 'diversidad', modelo: 'Implantación', proceso: '3. Diagnóstico', subproceso: 'Planificación', orden: 3 },
  { norma_id: 'diversidad', modelo: 'Implantación', proceso: '3. Diagnóstico', subproceso: 'Recogida de información', orden: 4 },
  { norma_id: 'diversidad', modelo: 'Implantación', proceso: '6. Evaluación', subproceso: 'Análisis de los resultados', orden: 16 },
  { norma_id: '9001', modelo: 'Implantación', ...KICK },
  { norma_id: '9001', modelo: 'Implantación', proceso: 'PE1 PLANIFICACIÓN ESTRATÉGICA', subproceso: 'S1 PE1 GESTIÓN DEL CONTEXTO', orden: 1 },
];
const base = { normas: ['diversidad'], modelo: 'Implantación', meses: 6, complejidad: 'media', sedes: 1, empresa: 'Cliente, S.L.', contacto: 'Ana', ref: 'OFE-2026-000', canal: 'interno', fecha_emision: '2026-09-16', fecha_inicio: '2026-10-01' };

// 1 · sin catálogo vivo el plan no tenía anexo: ese era el fallo
t.push(tareasPorBloque(['diversidad'], 'Implantación').length === 0);
// 2 · con el catálogo de la base, el plan trae sus fases agrupadas
const doc = montarDocumento({ ...base, catalogo: vivo });
t.push(doc.anexo.length === 4 && doc.anexo.every((g) => g.bloque && g.subs.length));
// 3 · el kickoff de la v144 aparece en el anexo
t.push(doc.anexo.some((g) => g.subs.some((s) => /kickoff/i.test(s))));
// 4 · el diagnóstico agrupa sus dos subprocesos sin repetir bloque
t.push(doc.anexo.filter((g) => g.bloque === '3. Diagnóstico').length === 1
  && doc.anexo.find((g) => g.bloque === '3. Diagnóstico').subs.length === 2);
// 5 · el respaldo estático es POR NORMA: una oferta mixta no pierde al huérfano
const mixta = tareasPorBloque(['diversidad', '9001'], 'Implantación', vivo.filter((f) => f.norma_id === 'diversidad'));
t.push(mixta.some((g) => g.bloque === '3. Diagnóstico') && mixta.length > 4);
// 6 · el modelo Auditoría son jornadas: no lleva anexo de implantación
t.push(tareasPorBloque(['9001'], 'Auditoría', vivo).length === 0);

// 7 · un plan es alcance «plan» y no arrastra modelo de mantenimiento
const r = doc.r;
t.push(tipoDeAlcance(r) === 'plan' && r.tipo === 'proyecto');
// 8 · aunque alguien guarde un mantenimiento, en un plan no se escribe
const conMant = montarDocumento({ ...base, catalogo: vivo, modelo_mantenimiento: 'Implicación' });
t.push(!condiciones(conMant.r).some((c) => /modelo de mantenimiento/i.test(c)));
// 9 · en un sistema sí se escribe: la cláusula no se ha perdido, se ha acotado
const sistema = montarDocumento({ ...base, normas: ['9001'], catalogo: vivo, modelo_mantenimiento: 'Implicación' });
t.push(condiciones(sistema.r).some((c) => /modelo de mantenimiento Implicación/.test(c)));
// 10 · un plan no se certifica: no hay tasas de certificación que excluir
t.push(condiciones(r).some((c) => /gastos de desplazamiento/.test(c) && !/entidad de certificación/.test(c))
  && condiciones(sistema.r).some((c) => /entidad de certificación/.test(c)));
// 11 · la cláusula 2 de una implantación no promete horas al mes
const cl2 = clausulas(r)[1];
t.push(/horas de proyecto/.test(cl2[0]) && /No hay cuota mensual/.test(cl2[1]) && !/horas al mes/.test(cl2[1]));
// 12 · en un modelo recurrente sigue diciendo horas al mes, que es lo correcto
const rec = montarDocumento({ ...base, normas: ['9001'], modelo: 'Implicación', meses: 12, catalogo: vivo });
t.push(/horas al mes/.test(clausulas(rec.r)[1][0]));

console.log(t.every(Boolean) ? `OK · ${t.length} comprobaciones` : `FALLO · ${t.map((x, i) => (x ? '' : i + 1)).filter(Boolean).join(',')}`);
process.exit(t.every(Boolean) ? 0 : 1);
