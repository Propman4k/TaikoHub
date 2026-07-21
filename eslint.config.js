// ESLint 9 flat config — Vite-React-Standard + Komplexitaets-Waechter.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules', 'server/node_modules', 'coverage'] },
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, __BUILD_TIME__: 'readonly' },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Komponenten/Konstanten in JSX: Grossbuchstaben-Vars nicht als unused werten.
      // _args erlaubt (z.B. Express-Error-Middleware braucht Aritaet 4).
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      complexity: ['warn', 10],
      'max-depth': ['warn', 4],
    },
  },
  {
    files: ['src/**/*.jsx'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      // Klassische Hook-Regeln. Die v7-Compiler-Regeln (set-state-in-effect,
      // refs) schlagen bei Fetch-on-Mount und Handler-Fabriken falsch an.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
]
