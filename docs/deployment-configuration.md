# Deployment Configuration

## Deployment Signals Found

- `nuxt.config.ts` defines the application runtime shape.
- `@nuxthub/core` is enabled with `hub.db = 'postgresql'`.
- Runtime provider configuration is environment-driven.

## Not Found in Repository

- No Dockerfile
- No `docker-compose` manifest
- No Kubernetes manifests
- No Terraform/Pulumi/CDK files
- No CI pipeline definitions under `.github/workflows/` or equivalent

## Operational Meaning

- Deployment appears to rely on Nuxt build artifacts and environment-backed configuration rather than checked-in infrastructure manifests.
- Any release process for this repo is likely handled outside the repository or has not been committed yet.
