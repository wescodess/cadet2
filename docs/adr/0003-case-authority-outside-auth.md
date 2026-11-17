---
status: accepted
---

# Keep Practice and Case authority outside the authentication component

Use the official Convex Better Auth component for authentication and application Convex tables for Practice membership, invitations, Case assignments, consent, licence verification and platform grants. Replace the alpha Nuxt auth wrapper with a narrow proxy to Convex-hosted auth; interactive data calls carry the actual user's JWT and check the live session and domain grants in Convex. This removes the SQL/plugin context mismatch behind the reproduced logout failure without adopting a second membership authority.

The organization plugin offers ready-made membership and invitation APIs, but would require an extended component schema and would still leave Case consent, retained records and signing authority to cadet2. Application-owned grants accept that implementation work in exchange for one transactional domain authority and explicit subscription revocation. Moving that authority after Cases and audit exist would require a meaningful migration; this separation is deliberate. A Practice administrator or cadet2 admin is not thereby a Case reader or signer.

See [Practice tenancy and authorization](../decisions/tenancy-and-authorization.md) for the permission matrix, supported package target, trusted-call contract and proof gates. ADR 0001 already records assessment evidence boundaries and ADR 0002 selects Convex as the system of record on their respective decision branches. This record approves no deployment, migration, spending or new region; integration proof and the existing owner activation gates remain required.
