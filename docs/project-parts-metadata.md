# Project Parts Metadata

## Part: app

- Role: Primary web application shell and UI layer
- Path: /Users/wesleyukadike/Desktop/cadet2
- Classification: web
- Notes: Uses Nuxt file-based routing and Vue SFCs under `app/`

## Part: integrated-server

- Role: Server-side API and orchestration layer inside the same codebase
- Path: /Users/wesleyukadike/Desktop/cadet2/server
- Classification: web-supporting (within same monolith)
- Notes: Hosts Nuxt server routes, admin APIs, scheduler endpoints, and provider integrations

## Part: convex

- Role: Realtime/app-data backend module inside the same repository
- Path: /Users/wesleyukadike/Desktop/cadet2/convex
- Classification: web-supporting (within same monolith)
- Notes: Contains Convex schema and function definitions used by the app
