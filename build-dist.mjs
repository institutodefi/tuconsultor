// Ensambla el dist único del monorepo:
//   dist/            ← web/ (sitio estático de www.tuconsultor.com)
//   dist/consultify/ ← consultify/dist SIN app (landing pública, blog, legal)
//   dist/app/        ← consultify/dist/app (la app React "Órbita", base /app/)
// consultify/dist lo produce `npm run build` de la app (vite + merge-static,
// que además inyecta las credenciales públicas de Supabase en el blog).
import { cpSync, rmSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');
const consDist = join(root, 'consultify', 'dist');

if (!existsSync(consDist)) { console.error('✗ Falta consultify/dist — ejecuta antes el build de la app'); process.exit(1); }
if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

// 1) Web estática a la raíz
cpSync(join(root, 'web'), dist, { recursive: true });
// 2) Consultify (sin /app) a /consultify
mkdirSync(join(dist, 'consultify'), { recursive: true });
for (const item of readdirSync(consDist)) {
  if (item === 'app') continue;
  cpSync(join(consDist, item), join(dist, 'consultify', item), { recursive: true });
}
// 3) La app a /app (compartida; el subdominio la sirve vía redirect por host)
cpSync(join(consDist, 'app'), join(dist, 'app'), { recursive: true });

// 4) Inyectar credenciales públicas de Supabase en el blog de tuconsultor
const SB_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SB_ANON = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
for (const rel of ['blog/index.html', 'blog/post.html']) {
  const f = join(dist, rel);
  if (existsSync(f)) {
    let htmlTxt = readFileSync(f, 'utf8');
    htmlTxt = htmlTxt.replaceAll('__SUPABASE_URL__', SB_URL).replaceAll('__SUPABASE_ANON_KEY__', SB_ANON);
    writeFileSync(f, htmlTxt);
  }
}
if (!SB_URL || !SB_ANON) console.warn('⚠ blog tuconsultor: faltan credenciales Supabase');
console.log('✓ dist único: web en raíz · blog inyectado · consultify en /consultify · app en /app');
