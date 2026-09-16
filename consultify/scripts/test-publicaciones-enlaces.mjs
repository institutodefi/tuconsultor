// node scripts/test-publicaciones-enlaces.mjs · la publicación del día de /enlaces/
import { consultaEnlaces } from '../netlify/functions/publicaciones-lib.mjs';
const t = [];
const q = consultaEnlaces('2026-09-16');
// El fallo de v279ao: sin tope superior, las 40 filas eran del futuro (el
// calendario llega a 2027) y la lista salía vacía siempre.
t.push(q.includes('fecha=lte.2026-09-16'));
t.push(q.includes('fecha=gte.2026-09-06'));
t.push(q.includes('red=eq.instagram') && q.includes('order=fecha.desc,hora.desc') && q.includes('limit=40'));
// La ventana se cuenta desde el día pedido, no desde hoy.
t.push(consultaEnlaces('2026-01-03').includes('fecha=gte.2025-12-24'));
t.push(consultaEnlaces('2026-09-16', 3, 5).includes('fecha=gte.2026-09-13') && consultaEnlaces('2026-09-16', 3, 5).includes('limit=5'));
console.log(t.every(Boolean) ? `OK · ${t.length} comprobaciones` : `FALLO · ${t.map((x, i) => (x ? '' : i)).filter((x) => x !== '').join(',')}`);
process.exit(t.every(Boolean) ? 0 : 1);
