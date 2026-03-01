# Component Inventory

## UI Primitive Library

- The repo includes a large shared primitive library under `app/components/ui/`.
- The current inventory contains approximately **60** primitive groups.
- Representative groups:
  - form and input controls
  - navigation primitives
  - overlays and dialogs
  - table and data display components
  - calendar/date selection primitives
  - layout/support components

## Structural Pattern

- One folder per component primitive
- PascalCase Vue component files
- Local `index.ts` export barrel in each primitive folder
- Tailwind utility classes are applied inside each component implementation

## Feature-Level UI

- Route-level screens currently contain most feature composition directly inside `app/pages/*`.
- The project is already standardized on the shadcn + Reka UI stack.
