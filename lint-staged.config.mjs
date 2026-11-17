export default {
  '*.{js,mjs,cjs,ts,vue,json,jsonc,css,html,md,yml,yaml}': 'node scripts/quality/format.mjs',
  '*.{js,mjs,cjs,ts,vue}': 'node scripts/quality/lint.mjs',
}
