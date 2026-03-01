# Project Documentation Index

## Project Overview

- **Type:** monolith web application
- **Primary Language:** TypeScript
- **Architecture:** integrated full-stack Nuxt monolith

## Quick Reference

- **Tech Stack:** Nuxt 4, Vue 3, TypeScript, Tailwind CSS 4, Better Auth, Convex, NuxtHub PostgreSQL
- **Primary Entry Points:** `app/app.vue`, `app/pages/*`, `server/api/*`, `convex/schema.ts`
- **Focus Area:** RAG administration, ingestion orchestration, and AI Search proxying

## Generated Documentation

- [Project Overview](./project-overview.md)
- [Architecture](./architecture.md)
- [Project Structure](./project-structure.md)
- [Project Parts Metadata](./project-parts-metadata.md)
- [Existing Documentation Inventory](./existing-documentation-inventory.md)
- [Technology Stack](./technology-stack.md)
- [Architecture Patterns](./architecture-patterns.md)
- [API Contracts](./api-contracts.md)
- [Data Models](./data-models.md)
- [State Management Patterns](./state-management-patterns.md)
- [Component Inventory](./component-inventory.md)
- [Comprehensive Analysis](./comprehensive-analysis.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Critical Folders Summary](./critical-folders-summary.md)
- [Development Guide](./development-guide.md)
- [Development Instructions](./development-instructions.md)
- [Deployment Guide](./deployment-guide.md)
- [Deployment Configuration](./deployment-configuration.md)
- [Contribution Guide](./contribution-guide.md)
- [Observed Contribution Guidelines](./contribution-guidelines.md)
- [Supporting Documentation](./supporting-documentation.md)

## Existing Planning Documentation

- [Docs Overview](./README.md)
- [RAG V1 Architecture](./rag-v1-architecture.md)
- [RAG V1 Data Model](./rag-v1-data-model.md)
- [RAG V1 API Contracts](./rag-v1-api-contracts.md)
- [RAG V1 Jobs and Retries](./rag-v1-jobs-and-retries.md)
- [RAG V1 Implementation Plan](./rag-v1-implementation-plan.md)
- [RAG V1 Phase 0 Checklist](./rag-v1-phase-0-checklist.md)
- [RAG V1 Phase 0 API Contract Deltas](./rag-v1-phase-0-api-contract-deltas.md)
- [RAG V1 Phase 1 Notes](./rag-v1-phase-1-notes.md)
- [YouTube Transcript Architecture](./youtube-transcript-architecture.md)

## Getting Started

1. Read [Project Overview](./project-overview.md) for the product-level summary.
2. Read [Architecture](./architecture.md) for system boundaries and implementation constraints.
3. Use [API Contracts](./api-contracts.md) and [Data Models](./data-models.md) before changing server or Convex behavior.
4. Use [Component Inventory](./component-inventory.md) and [Source Tree Analysis](./source-tree-analysis.md) before making UI or structural changes.
5. If your work touches the RAG pipeline, read the existing `rag-v1-*` and transcript planning documents alongside the generated brownfield docs.

## AI-Assisted Development Guidance

- Use this file as the primary brownfield entry point for future AI planning and implementation workflows.
- Pair it with `docs/architecture.md` and the subsystem drafts relevant to your change area.
