import js from '@eslint/js';
import globals from 'globals';

// ════════════════════════════════════════════════════════════════════════════
// ESLint · solo lo que compila bien y revienta en producción
//
// esbuild no comprueba si una variable existe: `<Guard ok={verEconomico}>` con
// `verEconomico` sin declarar compila sin una queja y falla al abrir esa
// pantalla. Han pasado tres veces (EquipoProyecto, candidatas, verEconomico).
//
// Intenté cazarlo con expresiones regulares y salieron 128 falsos positivos, que
// es lo mismo que no tener detector: nadie lee una lista así. Esto lo resuelve
// un linter de verdad, que entiende el ámbito de cada variable.
//
// La configuración es DELIBERADAMENTE corta. No es un linter de estilo: no
// avisa de comillas ni de sangrías. Solo de lo que rompe la aplicación en
// manos del cliente.
// ════════════════════════════════════════════════════════════════════════════

export default [
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
        // Inyectadas por Vite en tiempo de compilación.
        __APP_VERSION__: 'readonly',
        __APP_BUILD__: 'readonly',
      },
    },
    // Los comentarios `eslint-disable-next-line react-hooks/exhaustive-deps`
    // repartidos por el código apuntan a un plugin que no está instalado. Se
    // declara la regla como desactivada para que no fallen: instalar el plugin
    // entero por eso solo añadiría ruido de dependencias.
    plugins: {
      'react-hooks': { rules: { 'exhaustive-deps': { create: () => ({}) } } },
    },
    rules: {
      'react-hooks/exhaustive-deps': 'off',
      // ── El que importa ──
      // Variable o componente usado sin declarar ni importar.
      'no-undef': 'error',

      // Otros que también pasan la compilación:
      'no-const-assign': 'error',        // reasignar una const
      'no-dupe-keys': 'error',           // dos claves iguales en un objeto
      'no-dupe-args': 'error',
      'no-unreachable': 'error',         // código tras un return
      'no-self-assign': 'error',
      'no-cond-assign': 'error',         // `if (x = 1)` en vez de `==`
      'use-isnan': 'error',
      'valid-typeof': 'error',

      // Aviso, no error: una variable sin usar no rompe nada, pero suele ser
      // el rastro de un cambio a medias.
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        args: 'none',                    // los parámetros no usados son normales
      }],
    },
  },
  {
    // JSX usa los componentes importados; sin esto, `no-unused-vars` marcaría
    // como no usado todo lo que solo aparece dentro de etiquetas.
    files: ['src/**/*.jsx'],
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
];
