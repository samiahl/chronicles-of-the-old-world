# ⚔ Chronicles of Blood and Glory
### The Old World Campaign Manager

A local narrative campaign manager for Warhammer tabletop miniature wargames.
Track battles, write the story of your campaign, manage army lists, and keep
a scoreboard — all from a browser running on your own machine.

---

## Requirements

| Tool | Version | Install |
|------|---------|---------|
| Docker | any recent | https://docs.docker.com/get-docker/ |
| Java (JDK) | 21 | `brew install openjdk@21` |
| Node.js | 18+ | https://nodejs.org |

> Gradle does **not** need to be installed globally — the project includes a
> Gradle wrapper (`./gradlew`) that downloads the right version automatically.

---

## First-time setup

```bash
# Install frontend dependencies (only needed once)
cd frontend
npm install
cd ..
```

---

## Starting the app

You need three things running: the database, the backend, and the frontend.
Open three terminal windows.

**Terminal 1 — Database (MongoDB)**
```bash
cd /path/to/omat
docker-compose up -d
```

**Terminal 2 — Backend (Kotlin/Ktor API)**
```bash
cd /path/to/omat/backend
./gradlew run
```
> The first run downloads dependencies and may take a minute or two.
> You'll see `Application started` when it's ready.

**Terminal 3 — Frontend (React)**
```bash
cd /path/to/omat/frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Using the app

### Players
Go to the **Players** tab to enlist everyone taking part in the campaign.
Enter a commander name and their faction (e.g. Empire, Chaos, Orcs & Goblins).
Players must be added before battles can be logged.

### Logging a battle
Go to the **Battle Reports** tab and click **+ Log Battle**.

Fill in:
- **Date** of the game
- **Scenario** (optional — e.g. "Watchtower", "Blood and Glory")
- **Points size** (optional — e.g. 2000)
- **Player 1** and **Player 2** from the dropdowns
- **Result** — who won, or if it was a draw
- **Victory Points** scored by each side (optional)
- **Battle Reports** — each player can write their own narrative account of
  the battle from their faction's perspective

### The Chronicle
Go to the **The Chronicle** tab to build the campaign's storyline.
Click **+ Add Entry** to write a narrative piece — this can be a GM/campaign
master summary, a piece of in-world fiction, or any other story beat.

Each entry can optionally be **linked to a specific battle**, which will show
a reference badge on the entry.

### Army Lists
Go to the **Army Lists** tab and click **+ Submit List** to file a muster roll.
Paste in your full army list. Lists are tied to a player and can have a name
(e.g. "Round 1 List") and points value.

Click **▸ View List** on any card to expand and read the full list.

### Scoreboard
The **Scoreboard** tab updates automatically as battles are logged.

| Column | Meaning |
|--------|---------|
| Points | Campaign points (Win=3, Draw=1, Loss=0) |
| GP | Games played |
| W / D / L | Wins, Draws, Losses |
| VP+ / VP− | Victory points scored for and against |

> Scoring rules are provisional and will be updated as the campaign defines them.

---

## Stopping the app

Kill the backend and frontend terminals with `Ctrl+C`, then stop MongoDB:

```bash
docker-compose down
```

Your data is stored in a Docker volume and will persist between sessions.

---

## Project layout

```
omat/
├── docker-compose.yml      ← MongoDB container definition
├── backend/                ← Kotlin + Ktor REST API (port 8080)
│   ├── gradlew             ← Gradle wrapper (no global Gradle needed)
│   ├── build.gradle.kts
│   └── src/main/kotlin/com/campaign/
│       ├── Application.kt
│       ├── DatabaseFactory.kt
│       ├── model/          ← data classes
│       └── routes/         ← one file per resource
└── frontend/               ← React + TypeScript SPA (port 5173)
    ├── package.json
    └── src/
        ├── App.tsx
        ├── api/            ← HTTP client
        ├── components/     ← one component per section
        └── styles/         ← global CSS (gothic dark theme)
```
