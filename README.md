# Catat

Personal notes/finance tracker app built with Next.js and Convex (self-hosted).

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Radix UI |
| Backend | Convex (self-hosted via Docker) |
| Auth | `@auth/core` via Convex Auth |
| Charts | Recharts |
| PWA | Serwist |

---

## Prerequisites

- **Node.js** v18+
- **Docker** (for Convex backend)
- **npm** v9+

---

## Run Locally

### 1. Install dependencies

```bash
npm install
```

### 2. Start the Convex backend

```bash
docker compose up -d
```

This starts two services:
- **backend** — Convex database + functions engine at `http://127.0.0.1:3210`
- **dashboard** — Convex admin UI at `http://127.0.0.1:6791`

Wait until backend is healthy (auto-checked by Docker). Verify:

```bash
curl http://127.0.0.1:3210/version
```

### 3. Configure environment variables

Create `.env.local` with these values for local development:

| Variable | Value | Purpose |
|---|---|---|
| `CONVEX_SELF_HOSTED_URL` | `http://127.0.0.1:3210` | Convex server-side SDK URL |
| `NEXT_PUBLIC_CONVEX_URL` | `http://127.0.0.1:3210` | Convex client-side SDK URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | `http://127.0.0.1:3211` | Convex HTTP actions (site proxy) |
| `CONVEX_SELF_HOSTED_ADMIN_KEY` | (pre-set) | Admin key for self-hosted Convex |
| `AUTH_SECRET` | (pre-set) | Auth session signing secret |

Example:

```bash
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_URL=http://127.0.0.1:3210
NEXT_PUBLIC_CONVEX_SITE_URL=http://127.0.0.1:3211
CONVEX_SELF_HOSTED_ADMIN_KEY=your-admin-key
AUTH_SECRET=your-auth-secret
```

`CONVEX_SELF_HOSTED_ADMIN_KEY` is needed when you want `convex deploy` to run during a production build. If it is not set, the app build will still succeed and will skip the Convex deploy step.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build Locally

### Production build

```bash
npm run build
```

This does two things:
- runs `convex deploy` if `CONVEX_SELF_HOSTED_ADMIN_KEY` is set
- runs `next build`

If you only want to compile the Next.js app locally, leaving `CONVEX_SELF_HOSTED_ADMIN_KEY` unset is fine.

### Run the production server

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

---

## Other Commands

```bash
npm run build    # Production build
npm start        # Start production server (after build)
npm run lint     # ESLint
```

---

## Convex Dashboard

Manage tables, functions, logs, and schema at:

```
http://127.0.0.1:6791
```

Set deployment URL to `http://127.0.0.1:3210` if prompted.

---

## Notes

- This uses **Next.js 16** which has breaking changes from earlier versions. Check `node_modules/next/dist/docs/` before modifying Next.js-specific code.
- Convex data persists in a Docker volume (`data`). To reset: `docker compose down -v`.
