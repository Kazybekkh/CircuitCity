# Circuits as a City

Circuits as a City is an educational web platform that translates electronic circuit diagrams into an animated city simulation. Users can draw or upload a circuit schematic, and the platform renders a living city where each component maps to a city element — batteries become power stations, resistors become traffic lights, LEDs become streetlights, and current flow becomes the movement of vehicles through roads. A Gemini-powered AI narrates the circuit behaviour in plain English, and ElevenLabs converts that commentary into spoken audio.

---

## Monorepo Structure

```
circuits-as-a-city/
├── frontend/          # Next.js 14 app (React, Tailwind, Zustand, React Flow, PixiJS)
├── backend/           # Node.js + Express REST API (TypeScript, Mongoose)
├── shared/            # Shared TypeScript types used by both services
└── README.md
```

---

## Setup Instructions

### Prerequisites

- Node.js 18+
- npm 9+
- A MongoDB Atlas cluster (or local MongoDB instance)

### 1. Clone the repository

```bash
git clone <repo-url>
cd circuits-as-a-city
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

### 3. Backend

```bash
cd backend
cp .env.example .env
# Edit .env — fill in MONGODB_URI, GEMINI_API_KEY, ELEVENLABS_API_KEY
npm install
npm run dev
# Runs on http://localhost:3001
```

### Environment variables

| Variable           | Service  | Description                              |
|--------------------|----------|------------------------------------------|
| `PORT`             | backend  | HTTP port (default 3001)                 |
| `MONGODB_URI`      | backend  | MongoDB Atlas connection string          |
| `GEMINI_API_KEY`   | backend  | Google Gemini API key                    |
| `ELEVENLABS_API_KEY` | backend | ElevenLabs text-to-speech API key       |

---

## Developer Branches

Three feature branches are ready for parallel development:

### `feature/city-renderer` — Person 1: PixiJS City Animation & UI

**Owns:**
- `frontend/components/CityView.tsx` — animated PixiJS city canvas
- City entity rendering (power stations, roads, buildings, vehicles)
- Animation loop, day/night cycle, fault visualisations
- Overall UI polish and responsive layout

### `feature/simulation-engine` — Person 2: React Flow Builder, Simulation Logic & MongoDB

**Owns:**
- `frontend/components/SchematicBuilder.tsx` — React Flow drag-and-drop schematic editor
- `backend/routes/simulate.ts` — circuit simulation algorithm (Kirchhoff's laws, fault detection)
- `backend/routes/projects.ts` — MongoDB CRUD for saving/loading circuit projects
- Zustand state wiring between schematic builder and city view

### `feature/ai-pipeline` — Person 3: Python Parsing Service, Gemini Vision + Text, ElevenLabs

**Owns:**
- `backend/routes/upload.ts` — image ingestion and Gemini Vision parsing to CircuitGraph
- `backend/routes/narrate.ts` — ElevenLabs TTS from Gemini-generated commentary
- `frontend/components/ExplanationPanel.tsx` — commentary display and audio playback
- Optional Python microservice for advanced image pre-processing

---

## API Reference

| Method | Endpoint            | Description                              |
|--------|---------------------|------------------------------------------|
| GET    | `/api/health`       | Health check                             |
| GET    | `/api/projects`     | List all saved circuit projects          |
| POST   | `/api/projects`     | Save a new circuit project               |
| GET    | `/api/projects/:id` | Fetch a project by ID                    |
| DELETE | `/api/projects/:id` | Delete a project                         |
| POST   | `/api/simulate`     | Run simulation on a CircuitGraph         |
| POST   | `/api/upload`       | Parse a circuit image → CircuitGraph     |
| POST   | `/api/narrate`      | Generate audio URL from commentary text  |
