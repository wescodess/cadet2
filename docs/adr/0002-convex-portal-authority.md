---
status: accepted
---

# Convex is authoritative for portal domain data

The existing SQL/Convex split separates intake snapshots from runs and governance records from the state they describe, requiring coordination for writes, recovery and deletion. Put portal domain data, including pathway/rules administration and audit, in Convex and identity/auth in the official Better Auth Convex component, removing the ongoing application SQL store. This accepts migration, Nuxt integration work and backend lock-in in exchange for fewer continuing services and consistency boundaries; retaining SQL identities/constraints was a real alternative, but its current token bridge also needs replacement, and Cloudflare's default data services do not establish the settled Canadian boundary.

See the [system-of-record decision](../decisions/system-of-record.md) for the authority matrix, migration inventory, consistency contract and first proof seam. Auth integration/migration proof, paid-service activation and immutable region creation remain explicitly gated there; this ADR authorizes none of those actions. A failed integration gate requires an explicit decision revision before adopting the SQL-auth-only alternative. Production region selection remains outside the staging-pilot destination.
