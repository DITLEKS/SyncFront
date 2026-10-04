import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Границы слоёв (см. docs/architecture.md, раздел «Правила зависимостей»):
// domain ← lib ← api ← features ← pages ← app. Стрелка — «может импортировать».
// ui (shadcn) и lib — общие технические слои без знания о предметной области.
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules', 'src/api/openapi.d.ts'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      boundaries,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['tsconfig.app.json', 'tsconfig.node.json'],
          noWarnOnMultipleProjects: true,
        },
      },
      'boundaries/include': ['src/**/*'],
      'boundaries/ignore': ['**/*.css'],
      'boundaries/elements': [
        { type: 'test', pattern: 'src/test/**', mode: 'full' },
        { type: 'test', pattern: 'src/**/*.test.{ts,tsx}', mode: 'full' },
        { type: 'app', pattern: 'src/app/**', mode: 'full' },
        { type: 'main', pattern: 'src/main.tsx', mode: 'full' },
        { type: 'main', pattern: 'src/vite-env.d.ts', mode: 'full' },
        { type: 'pages', pattern: 'src/pages/**', mode: 'full' },
        { type: 'feature', pattern: 'src/features/*', capture: ['name'] },
        { type: 'domain', pattern: 'src/domain/**', mode: 'full' },
        { type: 'api', pattern: 'src/api/**', mode: 'full' },
        { type: 'ui', pattern: 'src/components/ui/**', mode: 'full' },
        { type: 'lib', pattern: 'src/lib/**', mode: 'full' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': 'allow-with-description' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-confusing-void-expression': 'off',

      'boundaries/no-unknown': 'error',
      'boundaries/no-unknown-files': 'error',
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain'] },
            { from: 'lib', allow: ['lib', 'domain'] },
            { from: 'ui', allow: ['ui', 'lib'] },
            { from: 'api', allow: ['api', 'lib', 'domain'] },
            // Чужая фича доступна, но только через её index.ts (см. entry-point ниже).
            { from: 'feature', allow: ['api', 'lib', 'domain', 'ui', 'feature'] },
            { from: 'pages', allow: ['pages', 'feature', 'ui', 'lib', 'domain'] },
            { from: 'app', allow: ['app', 'pages', 'feature', 'api', 'ui', 'lib', 'domain'] },
            { from: 'main', allow: ['app'] },
            { from: 'test', allow: ['*'] },
          ],
        },
      ],
      // Снаружи фичи доступен только её index.ts; внутренние импорты фичи правило не трогает.
      'boundaries/entry-point': [
        'error',
        {
          default: 'disallow',
          rules: [
            { target: ['feature'], allow: 'index.ts' },
            { target: ['app', 'pages', 'domain', 'api', 'ui', 'lib', 'test', 'main'], allow: '**' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Тесты лежат рядом с кодом фичи и могут импортировать её внутренности.
      'boundaries/entry-point': 'off',
    },
  },
  prettier,
);
