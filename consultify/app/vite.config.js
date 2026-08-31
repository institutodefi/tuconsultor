import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync('./package.json', 'utf8'));

// Qué versión está corriendo, dentro del propio bundle.
//
// Sin esto no había forma de saber si un fallo venía de código ya corregido o
// de código nuevo: se ha perdido tiempo arreglando dos veces cosas que ya
// estaban arregladas pero sin desplegar. Ahora la versión sale en el informe de
// errores y en el pie de la aplicación.
export default defineConfig({
  base: '/app/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BUILD__: JSON.stringify(new Date().toISOString().slice(0, 16).replace('T', ' ')),
  },
  build: { outDir: 'dist', emptyOutDir: true },
});
