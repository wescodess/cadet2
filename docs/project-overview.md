# Project Overview

## Purpose

This codebase is a Nuxt 4 application that serves two related purposes:

- demonstrate Better Auth + Convex integration with a protected task example
- build out a RAG administration and ingestion platform for Cloudflare AI Search-backed retrieval

## What Exists Today

- public landing, auth, tasks, AI Search playground, and admin pages
- server-side proxying and orchestration for AI Search queries
- admin-only source submission and ingestion control routes
- Convex schema and job scaffolding for source ingestion, approval, and sync tracking
- planning drafts for the RAG subsystem in `docs/`

## Current Product Shape

- **Mature enough to explore**
  - auth flow
  - protected Convex subscription demo
  - admin UI surfaces for RAG sources and ingestion
- **Still under active construction**
  - ingestion adapters and some RAG phases are scaffolded and documented, but not fully production-complete

## Repository Classification

- Type: single-repo web monolith
- Primary language: TypeScript
- Primary framework: Nuxt / Vue

## Recommended Entry Points For New Contributors

- Start with `docs/index.md`
- Then read `docs/architecture.md`
- Then read the RAG subsystem drafts if your work touches ingestion, retrieval, or answer generation
