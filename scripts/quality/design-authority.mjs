import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function designAuthority(root = process.cwd()) {
  const expected = {
    'docs/design/system/tokens.css':
      'acc25cac68559c71f669972364760ed5e62f529003bf8e2888d0db2b8e331f69',
    'docs/design/system/tokens.json':
      '086751bb520eb659e1fb137c7507f715a611d752bcccfe6ce64aa35feadecc49',
  }
  for (const [file, hash] of Object.entries(expected)) {
    const bytes = readFileSync(resolve(root, file))
    if (createHash('sha256').update(bytes).digest('hex') !== hash)
      throw new Error(`${file}: approved token authority changed; restore the approved bytes`)
  }
  return readFileSync(resolve(root, 'docs/design/system/tokens.css'), 'utf8')
}
