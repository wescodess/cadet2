import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
import sonarjs from 'eslint-plugin-sonarjs'

const typedFiles = ['**/*.{ts,tsx,mts,cts,vue}']

export default [
  {
    ignores: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      '.data/**',
      '.cache/**',
      '.quality-output/**',
      '_bmad/**',
      '_bmad-output/**',
      '.agent/**',
      '.agents/**',
      '.claude/**',
      '.tmp-skills/**',
      'convex/_generated/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
  },
  ...tseslint.configs.strictTypeChecked.map((config) => ({ ...config, files: typedFiles })),
  ...vue.configs['flat/essential'],
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    files: ['convex/**/*.ts'],
    languageOptions: {
      parserOptions: { project: './convex/tsconfig.json' },
    },
  },
  {
    plugins: { sonarjs },
    rules: { 'sonarjs/cognitive-complexity': ['error', 15] },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
]
