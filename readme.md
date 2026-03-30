# AI Voice Assistant MVP

This project is an MVP backend for handling inbound Telnyx calls and transferring them to a Vapi SIP destination.

## Current scope

- Receive Telnyx call webhooks.
- Receive Vapi call webhooks.
- Answer inbound calls.
- Transfer eligible calls to Vapi SIP URI.
- Keep architecture simple and modular for upcoming DB-backed call/order flows.

## Tech stack

- Node.js + Express (TypeScript)
- Telnyx SDK
- Prisma (schema + migrations prepared)
- dotenv

## Project structure

```text
src/
  server.ts
  modules/
    calls/
      telnyx-webhook.controller.ts
      vapi-webhook.controller.ts
      call.service.ts
      handlers/
        call-actions.handler.ts
        call-transfer.handler.ts
  integrations/
    telnyx/
      telnyx.client.ts
    vapi/
      vapi.client.ts
      vapi.utils.ts
prisma/
  schema.prisma
  migrations/
```

## Architecture

- `modules` = what the system does (domain logic).
- `integrations` = external providers/SDK wrappers.
- `controller -> service -> handlers` flow inside a module.
- Integration clients are created in `integrations/*`, not in controller files.

AI assistant coding conventions live in `.github/copilot-instructions.md`.

## Runtime flow (Telnyx webhook)

Endpoint:

```text
POST /webhooks/telnyx
POST /webhooks/vapi
```

Flow:

1. Controller immediately responds `200 OK`.
2. Service parses event and routes by `event_type`.
3. For inbound non-Vapi call legs:
4. `call.initiated` -> answer call.
5. `call.answered` -> transfer to Vapi SIP URI.
6. `Vapi webhook` -> update tracked call status/duration using call control ID from metadata or SIP headers.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and fill values.

3. Run dev server:

```bash
npm run dev
```

Server listens on:

```text
http://localhost:3000
```

## Environment variables

Required now:

- `TELNYX_API_KEY`
- `TELNYX_PUBLIC_KEY`
- `VAPI_SIP_URI`
- `DATABASE_URL`

Read from:

- `.env` at runtime (loaded by `src/config/env.ts`)

## Environment usage rules

- Use `env` from `src/config/env.ts` for all runtime config reads.
- Do not use `process.env` directly outside `src/config/env.ts`.
- Keep `dotenv/config` import only in `src/config/env.ts`.
- For any new variable, update all of:
- `src/config/env.ts` (add validation via `requireEnv` when required)
- `.env.example`
- this README section
- Prefer required variables by default; only keep optional variables when there is a clear fallback behavior.

## Local webhook test

Use `telnyx-webhook.http` and `vapi-webhook.http` or send:

```http
POST http://localhost:3000/webhooks/telnyx
Content-Type: application/json
```

```http
POST http://localhost:3000/webhooks/vapi
Content-Type: application/json
```

## Notes and limitations

- Telnyx webhook signature verification is implemented in middleware and enforced before event handling.
- Vapi webhook signature verification is not implemented yet.
- Event payload parsing is currently permissive (`any`) and should be tightened with explicit types/validation.
- No automated tests yet.
