// ════════════════════════════════════════════════════════════════════════════
// PUBLICACIONES · volcado nocturno del calendario (v139)
// Cada noche a las 04:10 (UTC) lee web/data/calendario_publicacion.csv y
// calendario_reels.csv de la web publicada y los vuelca en `publicaciones`
// (upsert por id; lo ya publicado no se toca). Así, con hacer push del CSV,
// el calendario nuevo está en la base a la mañana siguiente sin cargar nada.
// ════════════════════════════════════════════════════════════════════════════
import { sincronizarDesdeWeb } from './publicaciones-lib.mjs';

export default async () => {
  const r = await sincronizarDesdeWeb();
  console.log('publicaciones-cron', JSON.stringify(r));
  return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '10 4 * * *' };
