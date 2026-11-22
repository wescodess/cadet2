# Isolate preview and staging authority

Canadian staging uses a regional Node/Nitro application and its own Canadian Convex authority, including auth, with private Canadian bytes/scanning and captured email. Each PR gets a disposable stack of the real application and backend; it never borrows staging's backend or credentials. Server-owned, default-off Convex flags restrict already-authorized capabilities, and deployment/rollback cannot revive legacy results or deferred planning.

This trades the convenience of global edge previews and a shared backend for provable environment, session and data isolation. Deployment regions cannot be changed in place; choosing or funding a provider and creating a region remain owner actions. The [decision record](../decisions/staging-topology-and-feature-gates.md) specifies the alternatives, conditional lowest-cost recommendation, owner checklist and activation evidence. Production is outside this decision.
