// node scripts/test-perfil-linkedin.mjs · lectura de etiquetas OG y filtro de URL
import { meta, urlPerfil } from '../netlify/functions/perfil-linkedin.mjs';
const html = `<html><head><meta property="og:title" content="Marta Ferrer - Directora General - Grupo Andes | LinkedIn"/>
<meta content="Experiencia: Grupo Andes &middot; Ubicaci&#243;n: Madrid" property="og:description">
<meta property='og:image' content='https://media.licdn.com/dms/image/v2/abc/profile-displayphoto?e=1&amp;v=beta'></head></html>`;
const t = [];
t.push(meta(html, 'og:title') === 'Marta Ferrer - Directora General - Grupo Andes | LinkedIn');
t.push(meta(html, 'og:description').includes('Ubicación: Madrid'));
t.push(meta(html, 'og:image') === 'https://media.licdn.com/dms/image/v2/abc/profile-displayphoto?e=1&v=beta');
t.push(urlPerfil('es.linkedin.com/in/marta-ferrer?trk=x') === 'https://es.linkedin.com/in/marta-ferrer/');
t.push(urlPerfil('https://www.linkedin.com/company/tuconsultor/') === '');
t.push(urlPerfil('') === '');
console.log(t.every(Boolean) ? `OK · ${t.length} comprobaciones` : `FALLO · ${t.map((x, i) => (x ? '' : i)).filter((x) => x !== '').join(',')}`);
process.exit(t.every(Boolean) ? 0 : 1);
