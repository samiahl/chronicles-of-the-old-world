# ⚔ Chronicles of Blood and Glory
### The Old World Campaign Manager

A narrative campaign manager for Warhammer: The Old World tabletop miniature wargames.
Multi-user, multi-campaign — register an account, found a campaign or request to join
one, log battles, track army growth, schedule games, and write the saga of your
warband. All from the browser.

---

## Live deployment

| Service | Role | URL |
|---------|------|-----|
| **Azure Static Web Apps** | Frontend (React SPA) | https://chronicles-of-the-old-world.com |
| **Azure Container Apps** | Backend (Kotlin/Ktor API) | `chronicles-of-the-old-world-be.*.azurecontainerapps.io` |
| **Azure Cosmos DB for MongoDB (vCore)** | Database | Managed cloud cluster |
| **Cloudinary** | Image hosting (avatars, battle photos) | Direct browser uploads |
| **Cloudflare** | DNS + domain registrar | `chronicles-of-the-old-world.com` |
| **Application Insights** | Backend telemetry | Azure-managed |
| **cron-job.org** | Keep-alive pings every 10 min | Two redundant jobs (EU + NA) |

> **Cold starts** — The Container App scales to zero when idle. The first request
> after a quiet period may take 20–40 seconds to wake the container. The cron-job.org
> pings keep it warm during the day.

---

## Architecture

```
Browser
  │
  ├── Static assets  →  Azure Static Web Apps CDN (chronicles-of-the-old-world.com)
  │
  ├── Image uploads  →  Cloudinary (direct from browser)
  │
  └── API calls      →  Azure Container Apps (HTTPS, custom subdomain)
                            │
                            ├──► Cosmos DB for MongoDB vCore  (data)
                            └──► Application Insights         (telemetry)
```

The frontend reads `VITE_API_URL` at build time and points API calls directly at the
Container Apps URL — no rewrite proxy. CORS on the backend is locked down to the
production domain plus `localhost:5173` for development.

---

## Deployment

Both services deploy automatically on push to `main` via GitHub Actions:

| Workflow | Trigger | Action |
|---|---|---|
| `.github/workflows/deploy-backend.yml` | changes under `backend/**` | Builds Docker image, pushes to `ghcr.io`, updates Container App |
| `.github/workflows/deploy-frontend.yml` | changes under `frontend/**` | Builds Vite app with `VITE_API_URL`, uploads to Static Web Apps |

### Required GitHub Secrets

| Name | Purpose |
|------|---------|
| `AZURE_CREDENTIALS` | Service principal JSON for the deploy workflows |
| `AZURE_RESOURCE_GROUP` | Target resource group |
| `AZURE_CONTAINER_APP_NAME` | Name of the backend Container App |
| `GHCR_PAT` | GitHub PAT with `read:packages` + `write:packages` |
| `MONGODB_URI` | Cosmos DB connection string (URL-encoded password) |
| `JWT_SECRET` | Symmetric secret for signing JWTs |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights ingestion string |
| `VITE_API_URL` | Public backend URL, baked into frontend build |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Static Web Apps deployment token |

The same three runtime secrets (`MONGODB_URI`, `JWT_SECRET`, `APPLICATIONINSIGHTS_CONNECTION_STRING`)
are also configured on the Container App itself as `secretref:` env vars.

---

## Local development

### Requirements

| Tool | Version |
|------|---------|
| Docker | any recent |
| Java (JDK) | 17+ |
| Node.js | 18+ |

> Gradle does **not** need to be installed globally — the project uses a wrapper
> (`./gradlew`) that downloads the correct version automatically.

### First-time setup

```bash
cd frontend
npm install
cd ..
```

### Running locally

Three terminals.

**Terminal 1 — Database**
```bash
docker-compose up -d mongodb
```

**Terminal 2 — Backend**
```bash
cd backend
./gradlew run
```
> First run downloads dependencies — may take a minute. Ready when you see `Application started`.

**Terminal 3 — Frontend**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**.

In dev, `VITE_API_URL` is undefined, so `frontend/src/api/client.ts` falls back to
`/api`, and Vite's dev proxy forwards `/api/*` to `http://localhost:8080`.

### Multi-user testing locally

To simulate two players on one machine, run a second Vite instance on a different port:

```bash
npm run dev -- --port 5174
```

Use a different browser (or browser profile) for each port so the JWT in
`localStorage` stays separate.

### Running backend tests

```bash
cd backend
./gradlew test
```

Tests use an embedded MongoDB instance (Flapdoodle) — no running database needed.

### Stopping

`Ctrl+C` the backend and frontend, then:
```bash
docker-compose down
```

Data persists in a Docker volume across sessions.

---

## Features

### Authentication & users

- Register / log in with username + password (BCrypt hashed)
- JWT-based auth, token kept in `localStorage`
- User profiles with avatar uploads to Cloudinary
- Edit username, change password, delete account
- Same user can participate in multiple campaigns

### Multi-campaign model

- Found a new campaign as **campaign master** (creator)
- Request to join existing campaigns; master approves/rejects requests
- Leave a campaign (removes your player and army lists from it)
- Edit campaign details (master only)
- Finish a campaign (read-only, history preserved) or re-open it
- Delete a campaign (master only, permanent)

### In-campaign tabs

| Tab | Description |
|-----|-------------|
| **Battle Reports** | Log games — players, result, VPs, scenario, images, narrative reports. Optionally link to a scheduled game from the calendar. |
| **The Chronicle** | Campaign master's narrative entries; can link to specific battles |
| **Army Lists** | File muster rolls — faction, points, full list text, characters with XP, units with XP |
| **Players** | View commanders with their avatars, manage join requests, view per-player profiles |
| **Calendar** | Schedule upcoming games by date; only participants can delete a scheduled game |
| **Challenge Board** | Issue and respond to personal challenges between commanders |

### Campaign types

- **Standard** — open play, with optional league or tournament sub-type
- **Path of Glory** — milestone-based progression. Set starting points and an optional
  Milestone Increment to auto-fill cumulative points per milestone row.
- **Battle March** — fixed points limit throughout

---

## Project layout

```
blood-and-glory/
├── .github/workflows/
│   ├── deploy-backend.yml          ← builds image, deploys to Container Apps
│   └── deploy-frontend.yml         ← builds Vite app, deploys to Static Web Apps
├── backend/                        ← Kotlin + Ktor REST API
│   ├── Dockerfile                  ← multi-stage build + App Insights Java agent
│   ├── build.gradle.kts
│   └── src/
│       ├── main/kotlin/com/campaign/
│       │   ├── Application.kt      ← Ktor setup, JWT auth, CORS
│       │   ├── DatabaseFactory.kt
│       │   ├── model/              ← data classes (User, Campaign, Battle, …)
│       │   └── routes/             ← one file per resource
│       │       ├── AuthRoutes.kt
│       │       ├── CampaignRoutes.kt
│       │       ├── PlayerRoutes.kt
│       │       ├── BattleRoutes.kt
│       │       ├── ArmyListRoutes.kt
│       │       ├── NarrativeRoutes.kt
│       │       ├── CalendarRoutes.kt
│       │       ├── ChallengeRoutes.kt
│       │       ├── ScoreboardRoutes.kt
│       │       ├── UserRoutes.kt
│       │       └── Routing.kt      ← /health + route wiring
│       └── test/kotlin/com/campaign/
│           └── AppTest.kt          ← integration tests (embedded MongoDB)
├── frontend/                       ← React + TypeScript SPA (Vite)
│   ├── staticwebapp.config.json    ← SPA routing fallback for Azure Static Web Apps
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── api/                    ← HTTP client + Cloudinary upload
│       ├── components/             ← one component per section
│       ├── types/                  ← shared TypeScript types
│       └── styles/                 ← global CSS (gothic dark theme)
└── docker-compose.yml              ← local MongoDB + optional backend container
```
