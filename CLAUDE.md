# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Setup

```bash
npm install
cp .env.example .env.local          # set DATABASE_URL, JWT_SECRET, MASTER_KEY, HMAC_SECRET
npx prisma generate                  # must run after install
npx prisma migrate dev               # creates tables
npx prisma db seed                   # creates roles, security levels + test users
npm run dev
```

`MASTER_KEY` and `HMAC_SECRET` are each 32 random bytes in hex (64 chars). Generate with:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Default credentials after seed (login is by **username**, not email): `admin / Admin1234!` (TOP_SECRET), `gestor / Gestor1234!` (CONFIDENCIAL), `analista / Analista1234!` (NORMAL).

## Commands

```bash
npm run dev           # dev server (Turbopack)
npm run build         # production build
npm run lint          # ESLint
npm test              # Vitest unit tests (crypto, auth, audit)

npx prisma migrate dev --name <name>  # new migration
npx prisma db push                    # push schema without migration file
npx prisma studio                     # visual DB browser
```

After any migration, apply the audit-log immutability rules with `npm run db:harden` (runs `prisma/immutability.sql`, which is idempotent) — Prisma cannot emit SQL `RULE`s. `npm run db:setup` chains generate → migrate → harden → seed for a clean environment.

## Architecture

**Runtime split — the most important constraint in this codebase.**

The app runs two distinct JavaScript runtimes:

- **Edge Runtime** — `src/middleware.ts` only. Cannot use any Node.js module (`jsonwebtoken`, `bcryptjs`, `next/headers`, `fs`, `crypto`, etc.). JWT is verified here using the Web Crypto API (`crypto.subtle`).
- **Node.js Runtime** — all API Route Handlers (`src/app/api/**`) and Server Components. These can use `jsonwebtoken`, `bcryptjs`, Prisma, and the Node.js standard library.

`src/lib/constants.ts` holds the `TOKEN_COOKIE` constant so both runtimes can share it without cross-importing. If you need to add auth logic, put Edge-safe code in `middleware.ts` directly and Node.js logic in `src/lib/auth.ts`.

**Route groups:**

```
src/app/
  page.tsx                    → redirects / → /login or /dashboard
  (auth)/login/page.tsx       → login form (client component, no DB)
  (dashboard)/layout.tsx      → server component: verifies session + fetches user, renders Sidebar
  (dashboard)/dashboard/      → stats + activity feed
  (dashboard)/boveda/         → vault module (files + folders)
  (dashboard)/usuarios/       → user management (ADMIN only)
  (dashboard)/informacion/    → static info docs
```

**Login is two-step with mandatory facial MFA.** Step 1 `POST /api/auth/login` validates username+password and, on success, issues a short-lived `boveda_preauth` cookie (JWT scope `mfa`, 5 min) — **not** the session. Step 2 is facial: `POST /api/auth/mfa/enroll` (first login, captures + stores the face) or `POST /api/auth/mfa/verify` (returning users). Only these issue the real session via `issueSession()` in `src/lib/session.ts`. Face recognition uses `face-api.js` in the browser (`src/components/auth/FaceCapture.tsx`, models in `public/models/`); the 128-d descriptor is sent to the server, which compares by Euclidean distance (`src/lib/face.ts`, threshold 0.55). Descriptors are stored AES-encrypted in `biometria.descriptor_cifrado`; every attempt logs an `EventoMFA`. The MFA routes are in `PUBLIC_ROUTES` (they run on preauth, not session). Liveness detection is out of scope.

Session auth in server components/route handlers always goes through `getSessionFromCookies()` in `src/lib/auth.ts`, which reads the `boveda_token` httpOnly cookie and calls `jwt.verify()`. The JWT payload carries `sub`, `usuario` (nombre_usuario), `rol`, `rol_nivel`, and `nivel` (clearance).

The middleware injects `x-user-id`, `x-user-name`, `x-user-role`, `x-user-role-nivel`, and `x-user-nivel` headers for downstream handlers.

**Role hierarchy is numeric, by `Rol.nivel_numerico`** (roles are now a DB table, not an enum): Administrador (3) > Gestor (2) > Analista/Lector (1). Use `tieneNivelRol(nivelActual, nivelRequerido)` and the `NIVEL_ROL` constants in `src/lib/auth.ts`.

**Security model (`src/lib/access.ts`):** access to a file requires three barriers — active user, clearance (`Usuario.nivel ≥ Archivo.nivel`, Bell-LaPadula "no read up"), and need-to-know (a `NecesidadSaber` row for the user + the file's project). Admins (role level ≥ 3) bypass need-to-know but never the clearance barrier. `puedeAccederArchivo()` / `proyectosVisibles()` are the entry points; every download/view/delete handler must call them.

**File storage & encryption (`src/lib/crypto.ts`):** uploads are encrypted with a per-file AES-256-GCM key, written as `storage/vault/<uuid>.enc` (outside `public/`, never statically served). The per-file key is wrapped with `MASTER_KEY` (envelope encryption) and stored in `gestion_claves.clave_cifrada`. `archivos.hash_original` holds the SHA-256 of the plaintext and is re-verified on every download.

**Audit log (`src/lib/audit.ts`):** every mutating action calls `registrarEvento()`, which appends an **immutable, hash-chained** row to `logs_acceso_inmutable` (`firma_digital = HMAC(hash_anterior || fields)`). `verifyChain()` detects tampering. SQL rules block UPDATE/DELETE. Never write to this table directly.

**API response shape:** all routes return `{ ok: boolean, data?: T, error?: string }`. Paginated routes return `data: { items, total, page, limit, pages }`.

## Design System

Custom Tailwind tokens (see `tailwind.config.ts`):

| Token group | Purpose |
|---|---|
| `sidebar.*` | Dark navy sidebar (`bg: #0F172A`) |
| `surface.*` | Page bg (`#F8FAFC`), card (`#FFF`), border (`#E2E8F0`) |
| `brand.*` | Indigo scale, `brand-50` (`#EEF2FF`) is the vault page background |
| `status.*` | active/inactive/pending/danger/info — used for badges |

Utility classes defined in `globals.css`: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-dark`, `.card`, `.card-hover`, `.input`, `.badge-*`, `.sidebar-item`, `.table-header-cell`, `.table-cell`, `.table-row`.

## Vault module (boveda)

`BovedaView` is a client component that receives data as props from the server page (which already filters by need-to-know via `proyectosVisibles`). Its layout has:
- Left column (300 px): two white cards — navigation ("Mi Unidad") and `StorageStats`
- Right area: "Proyectos" grid (compartments, with a clearance badge) and "Archivos" section with `DocumentTable`

`DocumentTable` handles sorting, filtering, and pagination entirely client-side from the `archivos` prop. Files have no `extension` column — derive it from `nombre_archivo` with `extOf()` (in `src/lib/utils.ts`). `ruta_cifrada` is **never** sent to the client.

API routes: `/api/archivos`, `/api/proyectos`, `/api/usuarios`, `/api/roles`, `/api/clasificaciones`.

## Database

Prisma schema models: `Rol`, `ClasificacionSeguridad`, `Usuario`, `Proyecto`, `NecesidadSaber`, `Archivo`, `GestionClave`, `LogAcceso`, `Biometria`, `EventoMFA`. `Biometria` and `EventoMFA` are structure-only (no business logic yet).
Raw SQL equivalent (incl. the immutability `RULE`s) lives in `prisma/schema.sql` for reference.
Always run `npx prisma generate` after changing `prisma/schema.prisma`.

## Tests

Vitest, in `tests/`. `tests/setup.ts` injects deterministic `MASTER_KEY`/`HMAC_SECRET`/`JWT_SECRET`. Covers `crypto` (roundtrip, tamper detection, envelope), `auth` (bcrypt, role hierarchy), and `audit` (chain signing). Pure, DB-free — keep new unit tests that way so CI needs no database.
