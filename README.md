# ⚔ Chronicles of Blood and Glory
### The Old World Campaign Manager

A narrative campaign manager for Warhammer: The Old World tabletop miniature wargames.
Track battles, write the story of your campaign, manage army lists, schedule games,
issue challenges, and keep standings — all from the browser.

---

## Live deployment

| Service | Role | URL |
|---------|------|-----|
| **Vercel** | Frontend (React SPA) | https://chronicles-of-the-old-world.vercel.app |
| **Render** | Backend (Kotlin/Ktor API) | https://chronicles-of-the-old-world.onrender.com |
| **MongoDB Atlas** | Database (M0 free tier) | Managed cloud cluster |

> **Cold starts** — Render's free tier spins down after 15 minutes of inactivity.
> The first request after a period of quiet may take 30–50 seconds while the
> backend wakes up. Subsequent requests are instant.

---

## Architecture

```
Browser
  │
  ├── Static assets served by Vercel CDN
  │
  └── API calls  →  /api/*  →  Vercel rewrite proxy
                                    │
                                    └──► Render (Ktor, port 8080)
                                              │
                                              └──► MongoDB Atlas (cloud)
```

`frontend/vercel.json` rewrites every `/api/*` request to the Render backend,
so the frontend never talks to Render directly in production — it always goes
through the same origin.

---

## Hosting setup

### MongoDB Atlas

1. Create a free account at https://cloud.mongodb.com
2. Build a free **M0** cluster (512 MB, shared)
3. Create a database user with **Read and Write** access
4. Under **Network Access**, allow `0.0.0.0/0` (required for Render)
5. Get the connection string: **Connect → Drivers → Node.js** and copy the URI
   - Replace `<password>` with your actual password
   - Add the database name before the query string:
     `mongodb+srv://user:pass@cluster.mongodb.net/warhammer_campaign?retryWrites=true&w=majority`

### Render

1. Create a free account at https://render.com
2. **New → Web Service** → connect your GitHub repo
3. Settings:
   - **Name**: `chronicles-of-the-old-world`
   - **Language**: Docker
   - **Branch**: `main`
   - **Root directory**: `backend`
   - **Region**: EU Central (or closest to your users)
   - **Instance type**: Free
4. Under **Environment Variables**, add:
   - `MONGODB_URI` — your Atlas connection string (with password and DB name)
   - `JWT_SECRET` — any long random string (e.g. output of `openssl rand -hex 32`)
5. Deploy. Render builds the Docker image and starts the service.

### Vercel

1. Create a free account at https://vercel.com
2. **Add New Project** → import your GitHub repo
3. Settings:
   - **Root directory**: `frontend`
   - **Framework preset**: Vite
4. No environment variables needed — the Render URL is baked into `vercel.json`
5. Deploy. Subsequent pushes to `main` auto-deploy both services.

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

Open three terminal windows.

**Terminal 1 — Database**
```bash
docker-compose up -d
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

The local frontend talks directly to `http://localhost:8080` (configured in
`src/api/client.ts` via Vite's dev proxy).

### Running backend tests

```bash
cd backend
./gradlew test
```

Tests use an embedded MongoDB instance (Flapdoodle) — no running database needed.

### Stopping

Kill backend and frontend with `Ctrl+C`, then:
```bash
docker-compose down
```

Data is stored in a Docker volume and persists between sessions.

---

## Features

| Tab | Description |
|-----|-------------|
| **Battle Reports** | Log games — players, result, VPs, scenario, images, narrative reports |
| **The Chronicle** | Campaign master entries: story beats, linked to specific battles |
| **Army Lists** | File muster rolls with faction, points, full list text, characters and units |
| **Players** | Enlist commanders, manage join requests, view player profiles |
| **Calendar** | Schedule upcoming games by date |
| **Challenge Board** | Issue and respond to personal challenges between commanders |

### Campaign types

- **Standard** — open play, with optional league or tournament sub-type
- **Path of Glory** — milestone-based progression with phase advancement
- **Battle March** — fixed points limit throughout

### Campaign lifecycle

Campaigns can be **finished** by the campaign master, making them fully read-only
(history preserved, no new data can be added). The master can **re-open** a
finished campaign at any time. Campaigns can also be **deleted**, which permanently
removes all associated data.

---

## Project layout

```
blood-and-glory/
├── backend/                        ← Kotlin + Ktor REST API
│   ├── Dockerfile                  ← used by Render
│   ├── build.gradle.kts
│   └── src/
│       ├── main/kotlin/com/campaign/
│       │   ├── Application.kt
│       │   ├── DatabaseFactory.kt
│       │   ├── model/              ← data classes
│       │   └── routes/             ← one file per resource
│       └── test/kotlin/com/campaign/
│           └── AppTest.kt          ← integration tests (embedded MongoDB)
├── frontend/                       ← React + TypeScript SPA (Vite)
│   ├── vercel.json                 ← Vercel rewrite config + SPA fallback
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── api/                    ← HTTP client + Cloudinary upload
│       ├── components/             ← one component per section
│       └── styles/                 ← global CSS (gothic dark theme)
└── sessions/                       ← development session notes
```
