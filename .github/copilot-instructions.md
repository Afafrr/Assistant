# Copilot Instructions

## Purpose
Project-level guidance for AI coding assistants working in this repository.

## Architecture Conventions
- Keep repository and service responsibilities separate:
- Repositories handle data access and database-specific concerns.
- Services handle workflow and business orchestration.
- Keep integrations in `src/integrations/*` and do not instantiate provider SDK clients in controllers.

## Prisma Error Handling
- Prisma error code detection is centralized in `src/lib/prisma-errors.ts`.
- Repositories should use shared helpers from `src/lib/prisma-errors.ts` instead of inlining Prisma error code checks.
- Treat duplicate webhook persistence events as idempotent outcomes when the unique key already exists.
- Re-throw unknown or non-idempotent database errors.

## Webhook Reliability
- Webhook handlers should be idempotent for duplicate deliveries.
- Avoid failing normal retry scenarios caused by duplicate unique keys.
- Preserve call flow continuity for expected duplicate events.
