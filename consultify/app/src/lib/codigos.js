// ════════════════════════════════════════════════════════════════════════════
// CODIFICACIÓN DE PROYECTOS
//
// Formato acordado:  CLIENTE(4) · AÑO(4) · SERVICIO(3) · NORMAS
//
//   ACAD-2026-IMP-9-14-27
//   └─┬─┘ └─┬┘ └┬┘ └───┬──┘
//     │     │   │      └── normas aplicables, por su número corto
//     │     │   └───────── servicio: IMP, APO, REL, IML, CMP
//     │     └───────────── año de inicio
//     └─────────────────── cuatro letras del cliente
//
// Todavía NO se usa: aquí queda la función lista y probada para cuando se
// active. Dejarla escrita evita que dentro de tres meses cada sitio invente su
// propio formato.
// ════════════════════════════════════════════════════════════════════════════

const SERVICIO = {
  'Implantación': 'IMP',
  'Apoyo': 'APO',
  'Relación': 'REL',
  'Implicación': 'IML',
  'Compromiso': 'CMP',
};

// Número corto de cada norma. Los planes y marcas no tienen número, así que
// llevan una abreviatura: un código con «igualdad» dentro no se lee.
const NORMA_CORTA = {
  '9001': '9', '14001': '14', '27001': '27', '45001': '45',
  '42001': '42', '56001': '56', '21001': '21', '9004': '9004',
  '93200': '932', '158101': '158', '66181': '661',
  'igualdad': 'IG', 'igualdad-seg': 'IGS',
  'diversidad': 'DV', 'diversidad-seg': 'DVS',
  'madridexcelente': 'ME',
};

/** Cuatro letras a partir del nombre del cliente, sin artículos ni acentos. */
export function siglaCliente(nombre) {
  const limpio = String(nombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(S\.?L\.?U?|S\.?A\.?|SLU|SCP|SCCL|AIE|UTE)\b/g, ' ')
    .replace(/\b(DE|DEL|LA|LAS|EL|LOS|Y|PARA|POR|CON|EN)\b/g, ' ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim();
  if (!limpio) return 'XXXX';

  const palabras = limpio.split(/\s+/).filter(Boolean);
  // Con varias palabras, la inicial de cada una: «Academia Axon» → ACAX.
  if (palabras.length >= 4) return palabras.slice(0, 4).map((p) => p[0]).join('');
  if (palabras.length >= 2) {
    const s = palabras.map((p) => p.slice(0, 2)).join('');
    return (s + 'XXXX').slice(0, 4);
  }
  return (palabras[0] + 'XXXX').slice(0, 4);
}

/** Código completo del proyecto. */
export function codigoProyecto({ cliente, anio, modelo, normas = [] }) {
  const partes = [
    siglaCliente(cliente),
    String(anio || new Date().getFullYear()),
    SERVICIO[modelo] || 'XXX',
  ];
  const ns = normas.map((n) => NORMA_CORTA[n] || String(n).slice(0, 3).toUpperCase()).filter(Boolean);
  if (ns.length) partes.push(ns.join('-'));
  return partes.join('-');
}
