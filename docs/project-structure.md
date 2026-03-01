# Project Structure

- Type: Monolith web application
- Root: /Users/wesleyukadike/Desktop/cadet2
- Architecture Shape: Single Nuxt-based codebase with integrated frontend, server API, and Convex backend modules
- Primary Runtime Boundary:
  - `app/` for pages, components, plugins, and client-facing utilities
  - `server/` for API endpoints, server utilities, auth config, and DB migrations
  - `convex/` for schema, queries/actions, and generated bindings
