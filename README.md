# ReMeal MVP

Web-first MVP similar to Too Good To Go.

## Monorepo

- client: Next.js frontend (to be scaffolded next)
- server: Express + PostgreSQL backend

## Quick Start (backend)

1. Install Node.js (LTS) and npm.
2. Run `npm install` at the repo root (workspaces) or `cd server && npm install`.
3. Copy `server/.env.example` to `server/.env` and fill values.
4. Create PostgreSQL database and run schema in `server/src/db/schema.sql`.
5. Run backend: `npm run dev:server`.

