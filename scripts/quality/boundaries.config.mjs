export default {
  forbidden: [
    { name: 'no-cycles', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'client-entry',
      severity: 'error',
      from: { path: '^app/' },
      to: { path: '^(server|convex)/', pathNot: '^convex/_generated/' },
    },
    {
      name: 'shared-entry',
      severity: 'error',
      from: { path: '^shared/' },
      to: { path: '^(app|server|convex)/' },
    },
    {
      name: 'server-entry',
      severity: 'error',
      from: { path: '^(server|convex)/' },
      to: { path: '^app/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules|convex/_generated' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.vue', '.json'],
    },
  },
}
