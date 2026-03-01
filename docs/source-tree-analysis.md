# Source Tree Analysis

```text
cadet2/
├── app/                         # Nuxt application layer
│   ├── app.vue                  # Root app shell
│   ├── assets/css/              # Tailwind entry stylesheet
│   ├── components/ui/           # Shared UI primitive library (~60 groups)
│   ├── lib/                     # Shared client-facing utilities
│   ├── pages/                   # Route-level screens
│   ├── plugins/                 # Runtime client plugins
│   └── auth.config.ts           # Client-side auth integration
├── server/                      # Nuxt server API and backend helpers
│   ├── api/                     # HTTP route handlers
│   ├── utils/                   # Provider clients and orchestration helpers
│   ├── db/migrations/           # Drizzle SQL migrations
│   └── auth.config.ts           # Server-side auth config
├── convex/                      # Convex app data and jobs
│   ├── schema.ts                # Domain schema
│   ├── tasks.ts                 # Demo query
│   ├── ragSources.ts            # Source queries and mutations
│   ├── ragSourcesInternal.ts    # Internal admin mutations
│   ├── ragIngestionInternal.ts  # Batch orchestration
│   └── _generated/              # Generated Convex bindings
├── docs/                        # Planning drafts + generated brownfield docs
├── public/                      # Static assets
├── _bmad/                       # BMAD workflow assets
├── _bmad-output/                # BMAD generated outputs
├── package.json                 # Root manifest
├── nuxt.config.ts               # Main runtime config
├── components.json              # shadcn generation config
└── tsconfig.json                # TypeScript root config
```

## Notes

- The application is one repository and one runtime unit, even though responsibilities are split across `app/`, `server/`, and `convex/`.
- `server/` and `convex/` are supporting boundaries inside the same product, not separate deployable packages.
