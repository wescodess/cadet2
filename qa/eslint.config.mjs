import projectConfig from '../eslint.config.mjs'

export default [
  ...projectConfig,
  {
    files: ['acceptance/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
]
