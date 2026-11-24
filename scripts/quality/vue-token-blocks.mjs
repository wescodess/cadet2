function blockFormat(tag, attrs, file) {
  const language = attrs.match(/lang=(["'])(.*?)\1/)?.[2]
  if (tag === 'template') return ['pug', 'jade'].includes(language) ? 'pug' : 'html'
  if (tag === 'style')
    return ['scss', 'sass'].includes(language) ? 'scss' : language === 'less' ? 'less' : 'css'
  const format = {
    ts: 'typescript',
    typescript: 'typescript',
    js: 'javascript',
    javascript: 'javascript',
    jsx: 'jsx',
    tsx: 'tsx',
    mts: 'mts',
    cts: 'cts',
    mjs: 'mjs',
    cjs: 'cjs',
  }[language ?? 'js']
  if (!format) throw new Error(`Unsupported Vue script language in the token census: ${file}`)
  return format
}
function tagBounds(lower, tag, from) {
  const start = lower.indexOf(`<${tag}`, from)
  if (start === -1 || /[a-z]/.test(lower[start + tag.length + 1] ?? '')) return
  const opening = lower.indexOf('>', start)
  if (opening === -1) return
  const end = lower.indexOf(`</${tag}>`, opening + 1)
  if (end !== -1) return { start, opening, end, next: end + tag.length + 3 }
}
function tagBlocks(text, lower, tag, file) {
  const blocks = []
  let bounds = tagBounds(lower, tag, 0)
  while (bounds) {
    const { start, opening, end, next } = bounds
    blocks.push({
      start,
      end: next,
      format: blockFormat(tag, lower.slice(start + tag.length + 1, opening + 1), file),
      text: text.slice(opening + 1, end),
      lineOffset: text.slice(0, opening + 1).split('\n').length - 1,
    })
    bounds = tagBounds(lower, tag, next)
  }
  return blocks
}
export function vueTokenBlocks(text, file) {
  // Match jscpd 5.4.3's first-closing-tag boundaries, including nested templates.
  const lower = text.replace(/[A-Z]/g, (letter) => letter.toLowerCase())
  const blocks = ['template', 'script', 'style'].flatMap((tag) => tagBlocks(text, lower, tag, file))
  const selected = []
  for (const block of blocks.sort((a, b) => a.start - b.start)) {
    if (!selected.some((parent) => block.start >= parent.start && block.start < parent.end))
      selected.push(block)
  }
  return selected.length ? selected : [{ format: 'html', text, lineOffset: 0 }]
}
