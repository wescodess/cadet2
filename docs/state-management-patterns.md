# State Management Patterns

## Current State Model

- The application does **not** use a global store such as Pinia or Vuex.
- State is managed with Vue Composition API primitives:
  - `ref`
  - `reactive`
  - `computed`
- State is generally kept local to pages and plugins.

## Key Runtime State Sources

- **Session/Auth**
  - `useUserSession()` is the primary auth/session source
- **Convex Realtime Data**
  - `useConvex()` and generated API bindings are used for live updates
  - The tasks screen uses `convex.onUpdate(...)` for subscription-driven refreshes
- **Plugin-Level Coordination**
  - `app/plugins/convex-auth.client.ts` bridges Better Auth session state into the Convex client auth state

## Practical Implications

- Shared behavior is pushed into composables/plugins rather than centralized stores.
- Feature pages own their own loading, error, filter, and form state.
