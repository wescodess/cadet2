import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function designAuthority(root = process.cwd()) {
  const expected = {
    'docs/design/system/tokens.css':
      'bd309a16d78c9fb2b57a757dbe8fa7e3f7de268c20656273e1ddb1c85363d5e0',
    'docs/design/system/tokens.json':
      '35ab9564dc6a7e51f86ed79561cb4f53c08e73666e38faa1c0cd5dc457dc4bca',
  }
  for (const [file, hash] of Object.entries(expected)) {
    const bytes = readFileSync(resolve(root, file))
    if (createHash('sha256').update(bytes).digest('hex') !== hash)
      throw new Error(`${file}: approved token authority changed; restore the approved bytes`)
  }
  return readFileSync(resolve(root, 'docs/design/system/tokens.css'), 'utf8')
}
