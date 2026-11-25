import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { repoPath } from './css-source'
import { approvedTwoPixelGlyphs, strokeGuard, type Overlay } from './icon-stroke-guard'

const report = strokeGuard()

const uiProbe = 'app/components/ui/stroke-probe/StrokeProbe.vue'
const uiHelper = 'app/components/ui/stroke-probe/stroke-probe.ts'
const specimenProbe = 'app/specimen/StrokeProbe.vue'
const relayProbe = 'app/components/relay/StrokeProbe.vue'
const libProbe = 'app/lib/stroke-probe.ts'
const legacyProbe = 'app/components/admin/StrokeProbe.vue'

const probeImports = [
  `import { Check as ProbeIcon } from 'lucide-vue-next'`,
  `import { interfaceIconStroke } from '@/lib/relay/icons'`,
]
const buttonImport = `import { Button } from '~/components/ui/button'`

function sfc(template: string, ...script: string[]) {
  return `<script setup lang="ts">\n${script.join('\n')}\n</script>\n\n<template>\n  ${template}\n</template>\n`
}

const probe = (template: string, ...script: string[]) => sfc(template, ...probeImports, ...script)

function rendersInSlot(component: string, source: string) {
  return sfc(
    `<Button><${component} /></Button>`,
    buttonImport,
    `import ${component} from '${source}'`,
  )
}

interface Regression {
  name: string
  origin: string
  files: Overlay
  file: string
  construct: string
}

const checkbox = 'app/components/ui/checkbox/Checkbox.vue'

const regressions: Regression[] = [
  {
    name: 'another file named StateGlyph draws a non-approved stroke',
    origin: 'R6-F2 basename exemption',
    files: {
      [specimenProbe]: sfc(
        '<R6StateGlyph />',
        `import R6StateGlyph from '~/components/relay/r6/StateGlyph.vue'`,
      ),
      'app/components/relay/r6/StateGlyph.vue': sfc(
        '<Check :stroke-width="7" />',
        `import { Check } from 'lucide-vue-next'`,
      ),
    },
    file: 'app/components/relay/r6/StateGlyph.vue',
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a dynamic strokeWidth bind argument overrides the shared binding',
    origin: 'R5-F1 dynamic-camel-override',
    files: {
      [uiProbe]: probe(
        '<ProbeIcon :stroke-width="interfaceIconStroke" :[strokeProp]="2" />',
        `const strokeProp = 'strokeWidth'`,
      ),
    },
    file: uiProbe,
    construct: 'dynamic bind argument',
  },
  {
    name: 'a template v-for shadows interfaceIconStroke while the import is also used',
    origin: 'R5-F1 shadow-used-import',
    files: {
      [uiProbe]: probe(
        '<span :data-stroke="interfaceIconStroke"><template v-for="interfaceIconStroke in [2]" :key="interfaceIconStroke"><ProbeIcon :stroke-width="interfaceIconStroke" /></template></span>',
      ),
    },
    file: uiProbe,
    construct: 'uses interfaceIconStroke outside',
  },
  {
    name: 'a slot scope shadows interfaceIconStroke',
    origin: 'R5-F1 template-local shadowing',
    files: {
      [uiProbe]: probe(
        '<Checkbox v-slot="{ interfaceIconStroke }"><ProbeIcon :stroke-width="interfaceIconStroke" /></Checkbox>',
        `import { Checkbox } from '../checkbox'`,
      ),
    },
    file: uiProbe,
    construct: 'uses interfaceIconStroke outside',
  },
  {
    name: 'script declares its own interfaceIconStroke',
    origin: 'R5-F1 script-local shadowing',
    files: {
      [uiProbe]: probe(
        '<ProbeIcon :stroke-width="interfaceIconStroke" />',
        'const widths = [2].map((interfaceIconStroke) => interfaceIconStroke)',
        'void widths',
      ),
    },
    file: uiProbe,
    construct: 'interfaceIconStroke in script',
  },
  {
    name: 'absolute-stroke-width competes with the shared binding',
    origin: 'R5-F1 competing stroke attribute',
    files: {
      [uiProbe]: probe('<ProbeIcon :stroke-width="interfaceIconStroke" absolute-stroke-width />'),
    },
    file: uiProbe,
    construct: 'competing stroke attribute',
  },
  {
    name: 'a stroke-width utility class competes with the shared binding',
    origin: 'R5-F1 competing stroke attribute',
    files: {
      [uiProbe]: probe('<ProbeIcon :stroke-width="interfaceIconStroke" class="stroke-2" />'),
    },
    file: uiProbe,
    construct: 'sets a stroke width',
  },
  {
    name: 'a style binding competes with the shared binding',
    origin: 'R5-F1 competing stroke attribute',
    files: {
      [uiProbe]: probe(
        '<ProbeIcon :stroke-width="interfaceIconStroke" :style="{ strokeWidth: 2 }" />',
      ),
    },
    file: uiProbe,
    construct: 'competing stroke attribute',
  },
  {
    name: 'a primitive host class overrides the stroke of the icons in its slot',
    origin: 'R5-F1 competing stroke attribute',
    files: {
      [specimenProbe]: sfc(
        '<Button class="[&_svg]:stroke-2"><ProbeIcon :stroke-width="interfaceIconStroke" /></Button>',
        ...probeImports,
        buttonImport,
      ),
    },
    file: specimenProbe,
    construct: 'sets a stroke width',
  },
  {
    name: 'a <style> block sets stroke-width',
    origin: 'R5-F1 competing stroke attribute',
    files: {
      [uiProbe]: `${probe('<ProbeIcon :stroke-width="interfaceIconStroke" />')}\n<style>\nsvg { stroke-width: 2; }\n</style>\n`,
    },
    file: uiProbe,
    construct: 'a <style> block sets a stroke width',
  },
  {
    name: 'a specimen passes a namespace-imported icon into a Button slot',
    origin: 'R5-F2 namespace-consumer',
    files: {
      [specimenProbe]: sfc(
        '<Button><Icons.Check /></Button>',
        `import * as Icons from 'lucide-vue-next'`,
        buttonImport,
      ),
    },
    file: specimenProbe,
    construct: 'whole module',
  },
  {
    name: 'a specimen passes a local h(Check) helper into a Button slot',
    origin: 'R5-F2 helper-consumer',
    files: {
      [specimenProbe]: sfc(
        '<Button><RenderIcon /></Button>',
        `import { h } from 'vue'`,
        `import { Check } from 'lucide-vue-next'`,
        buttonImport,
        'const RenderIcon = () => h(Check)',
      ),
    },
    file: specimenProbe,
    construct: 'in script',
  },
  {
    name: 'a specimen passes a render helper imported from a .ts file into a Button slot',
    origin: 'R5-F2 ts-local-helper',
    files: {
      [libProbe]: `import { h } from 'vue'\nimport { Check } from 'lucide-vue-next'\n\nexport const RenderIcon = () => h(Check)\n`,
      [specimenProbe]: sfc(
        '<Button><RenderIcon /></Button>',
        buttonImport,
        `import { RenderIcon } from '~/lib/stroke-probe'`,
      ),
    },
    file: libProbe,
    construct: 'outside a .vue template',
  },
  {
    name: 'a specimen renders Button through <component :is> with a bare icon child',
    origin: 'R5-F2 dynamic-host-consumer',
    files: {
      [specimenProbe]: sfc(
        '<component :is="Button"><ProbeIcon /></component>',
        `import { Check as ProbeIcon } from 'lucide-vue-next'`,
        buttonImport,
      ),
    },
    file: specimenProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a specimen hosts icons in a primitive chosen at run time',
    origin: 'R5-F2 unresolvable primitive host',
    files: {
      [specimenProbe]: sfc(
        `<component :is="framed ? Button : 'div'"><ProbeIcon :stroke-width="interfaceIconStroke" /></component>`,
        ...probeImports,
        buttonImport,
        'const framed = true',
      ),
    },
    file: specimenProbe,
    construct: 'primitive Button as a value',
  },
  {
    name: 'a specimen resolves a component by name',
    origin: 'R5-F2 unresolvable component',
    files: {
      [specimenProbe]: sfc(
        '<component :is="host"><ProbeIcon :stroke-width="interfaceIconStroke" /></component>',
        ...probeImports,
        `import { resolveComponent } from 'vue'`,
        `const host = resolveComponent('Button')`,
      ),
    },
    file: specimenProbe,
    construct: 'resolveComponent',
  },
  {
    name: 'a specimen passes an icon re-exported from a .ts file into a Button slot',
    origin: 'R5-F2 .ts helper',
    files: {
      [libProbe]: `export { Check } from 'lucide-vue-next'\n`,
      [specimenProbe]: sfc(
        '<Button><Check /></Button>',
        buttonImport,
        `import { Check } from '~/lib/stroke-probe'`,
      ),
    },
    file: specimenProbe,
    construct: 'cannot be resolved',
  },
  {
    name: 'a primitive renders an icon re-exported from a .ts file outside app/components/ui',
    origin: 'R5-F2 .ts helper',
    files: {
      [libProbe]: `export { Check } from 'lucide-vue-next'\n`,
      [uiProbe]: sfc('<Check />', `import { Check } from '@/lib/stroke-probe'`),
    },
    file: libProbe,
    construct: 'outside a .vue template',
  },
  {
    name: 'a relay component the specimens render draws an icon at a literal 2 px',
    origin: 'fail closed: relay components in scope',
    files: {
      [relayProbe]: sfc(
        '<ProbeIcon :stroke-width="2" />',
        `import { Check as ProbeIcon } from 'lucide-vue-next'`,
      ),
      [specimenProbe]: sfc('<Probe />', `import Probe from '~/components/relay/StrokeProbe.vue'`),
    },
    file: relayProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'an aliased Lucide import renders bare',
    origin: 'R5 alias-bare',
    files: { [uiProbe]: probe('<ProbeIcon />') },
    file: uiProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a bare icon sits in a primitive slot fallback',
    origin: 'R5 default-slot-bare',
    files: { [uiProbe]: probe('<slot><ProbeIcon /></slot>') },
    file: uiProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a v-bind object can override the stroke',
    origin: 'R5 spread-override',
    files: {
      [uiProbe]: probe(
        '<ProbeIcon :stroke-width="interfaceIconStroke" v-bind="attrs" />',
        'const attrs = { strokeWidth: 2 }',
      ),
    },
    file: uiProbe,
    construct: 'spreads v-bind',
  },
  {
    name: 'a Lucide icon renders through <component :is> without a binding',
    origin: 'R5 dynamic-direct-bare',
    files: { [uiProbe]: probe('<component :is="ProbeIcon" />') },
    file: uiProbe,
    construct: 'as a value',
  },
  {
    name: 'a Lucide icon renders through <component :is>, even with the binding',
    origin: 'R5 dynamic-direct-good, now outside the positive rule',
    files: {
      [uiProbe]: probe('<component :is="ProbeIcon" :stroke-width="interfaceIconStroke" />'),
    },
    file: uiProbe,
    construct: 'as a value',
  },
  {
    name: 'a template v-for shadows interfaceIconStroke',
    origin: 'R5 shadow-v-for',
    files: {
      [uiProbe]: probe(
        '<template v-for="interfaceIconStroke in [2]" :key="interfaceIconStroke"><ProbeIcon :stroke-width="interfaceIconStroke" /></template>',
      ),
    },
    file: uiProbe,
    construct: 'uses interfaceIconStroke outside',
  },
  {
    name: 'a dynamic stroke-width bind argument overrides the shared binding',
    origin: 'R5 dynamic-attribute-override',
    files: {
      [uiProbe]: probe(
        '<ProbeIcon :stroke-width="interfaceIconStroke" :[strokeProp]="2" />',
        `const strokeProp = 'stroke-width'`,
      ),
    },
    file: uiProbe,
    construct: 'dynamic bind argument',
  },
  {
    name: 'an inline style overrides the stroke',
    origin: 'R5 inline-style-override',
    files: {
      [uiProbe]: probe('<ProbeIcon :stroke-width="interfaceIconStroke" style="stroke-width: 2" />'),
    },
    file: uiProbe,
    construct: 'competing stroke attribute',
  },
  {
    name: 'a primitive .ts helper renders Lucide through h()',
    origin: 'R5 ts-render-helper',
    files: {
      [uiHelper]: `import { h } from 'vue'\nimport { Check } from 'lucide-vue-next'\n\nexport const draw = () => h(Check)\n`,
    },
    file: uiHelper,
    construct: 'outside a .vue template',
  },
  {
    name: 'a primitive imports Lucide as a namespace',
    origin: 'R5 namespace-primitive',
    files: { [uiProbe]: sfc('<Icons.Check />', `import * as Icons from 'lucide-vue-next'`) },
    file: uiProbe,
    construct: 'whole module',
  },
  {
    name: 'a specimen passes a relay component with a bare icon into a Button slot',
    origin: 'R5 relay-slot-consumer',
    files: {
      [relayProbe]: probe('<ProbeIcon />'),
      [specimenProbe]: rendersInSlot('Inner', '~/components/relay/StrokeProbe.vue'),
    },
    file: relayProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a primitive drops its binding',
    origin: 'round 4 mutation',
    files: {
      [checkbox]: readFileSync(repoPath(checkbox), 'utf8').replace(
        ' :stroke-width="interfaceIconStroke"',
        '',
      ),
    },
    file: checkbox,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a new primitive file renders a bare Lucide icon',
    origin: 'round 4 mutation',
    files: { [uiProbe]: sfc('<Check />', `import { Check } from 'lucide-vue-next'`) },
    file: uiProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
  {
    name: 'a specimen passes a bare icon into a primitive slot',
    origin: 'round 4 mutation',
    files: {
      [specimenProbe]: sfc(
        '<Button><Check /></Button>',
        `import { Check } from 'lucide-vue-next'`,
        buttonImport,
      ),
    },
    file: specimenProbe,
    construct: 'has no :stroke-width="interfaceIconStroke"',
  },
]

const controls: { name: string; files: Overlay }[] = [
  {
    name: 'an inline type-only Lucide import in a TypeScript helper',
    files: {
      [specimenProbe]: sfc('<span>{{ mark }}</span>', `import { mark } from '~/lib/stroke-probe'`),
      [libProbe]: `import { type LucideProps } from 'lucide-vue-next'\nexport type MarkProps = LucideProps\nexport const mark = 'mark'\n`,
    },
  },
  {
    name: 'an aliased Lucide import with the shared binding',
    files: { [uiProbe]: probe('<ProbeIcon :stroke-width="interfaceIconStroke" />') },
  },
  {
    name: 'a bound icon beside an unrelated h() call',
    files: {
      [uiProbe]: probe(
        '<div><ProbeIcon :stroke-width="interfaceIconStroke" />{{ auxiliary.type }}</div>',
        `import { h } from 'vue'`,
        `const auxiliary = h('span', 'label')`,
      ),
    },
  },
  {
    name: 'a specimen passing a bound icon into a Button slot',
    files: {
      [specimenProbe]: sfc(
        '<Button><ProbeIcon :stroke-width="interfaceIconStroke" /></Button>',
        ...probeImports,
        buttonImport,
      ),
    },
  },
  {
    name: 'a legacy screen outside the adopted roots passing a bare icon into a Button slot',
    files: {
      [legacyProbe]: sfc(
        '<Button><Check /></Button>',
        `import { Check } from 'lucide-vue-next'`,
        buttonImport,
      ),
    },
  },
]

function problemsFor(files: Overlay, file: string) {
  const { primitiveProblems, consumerProblems } = strokeGuard(files)
  return [...primitiveProblems, ...consumerProblems].filter((problem) => problem.startsWith(file))
}

describe('every Lucide icon a shared primitive renders takes the shared interface stroke', () => {
  it('finds the Lucide icons in the primitives it guards', () => {
    expect(report.iconCount).toBeGreaterThan(0)
  })

  it('binds interfaceIconStroke on every Lucide icon in app/components/ui', () => {
    expect(report.primitiveProblems).toEqual([])
  })

  it('binds interfaceIconStroke on every Lucide icon in the adopted roots and the components they reach', () => {
    expect(report.consumers.length).toBeGreaterThan(0)
    expect(report.consumerProblems).toEqual([])
  })

  it('exempts only the named 2 px state glyphs, and only where the adopted roots reach them', () => {
    expect(report.exemptionsUsed).toEqual([...approvedTwoPixelGlyphs.keys()].sort())
    for (const file of approvedTwoPixelGlyphs.keys())
      expect(readFileSync(repoPath(file), 'utf8')).toMatch(/:stroke-width="2"/)
  })
})

describe('the stroke guard fails closed on any Lucide use it cannot positively verify', () => {
  it.each(regressions)('fails when $name ($origin)', ({ files, file, construct }) => {
    const problems = problemsFor(files, file)
    expect(problems, `no problem names ${file}`).not.toEqual([])
    expect(problems.join('\n')).toContain(construct)
  })

  it.each(controls)('passes $name', ({ files }) => {
    const { primitiveProblems, consumerProblems } = strokeGuard(files)
    expect([...primitiveProblems, ...consumerProblems]).toEqual([])
  })
})
