// Versión y fecha de compilación, inyectadas por Vite (ver vite.config.js).
// Los `typeof` son por si el módulo se importa fuera del build, en una prueba.
export const VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
export const BUILD = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '—';
export const SELLO = `v${VERSION} · ${BUILD}`;
