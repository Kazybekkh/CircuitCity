# Circuits as a City x

**Concept document for an educational, visual hardware platform that turns electronics into a living city simulation**
*Prepared for hackathon product exploration*

---

## Pitch

> Circuits as a City turns electronics into a living city simulation. Users can build a circuit or upload a schematic, and the platform converts power sources into power plants, wires into roads, loads into districts, and faults into visible blackouts or congestion. It makes hardware easier to learn, easier to explain, and much more memorable to demo.

---

## 1. Product Vision

Circuits as a City is a web-based simulation and learning platform that translates electronic circuits into a city metaphor. The goal is to make invisible electrical behaviour feel obvious, visual, and emotionally legible.

The product is aimed at beginners learning electronics, hobbyists debugging small circuits, and judges or audiences who need to understand a hardware idea in seconds rather than minutes.

The core experience is simple: place components or upload a schematic, generate a city, animate the flow, and let the system explain why some districts are stable while others fail.

---

## 2. Problem Being Solved

Electronics is hard to learn because most of the important behaviour is abstract. People see symbols, lines, and equations, but they do not naturally feel what is happening inside the system.

Traditional schematics are efficient for trained engineers, but they are intimidating for beginners and weak as a storytelling medium in demos. A resistor value or missing ground connection can look minor on paper yet cause a complete failure in practice.

This product solves that gap by turning a static circuit into a dynamic environment where bottlenecks, overload, under-voltage, and missing connections become instantly visible.

---

## 3. Core Metaphor & Component Mapping

The metaphor works because both circuits and cities are systems of flow, pressure, storage, routing, and failure. Instead of forcing users to think in symbols first, the interface lets them understand behaviour through movement, congestion, and blackouts.

> **Core idea:** A user can build a circuit, upload a schematic, or inspect a faulty design and watch it become a city where current is traffic, voltage is pressure, resistance is congestion, storage is buffering, and faults appear as visible blackouts or overloads.

| Circuit Concept | City Metaphor | Visual Behaviour | User Intuition |
|---|---|---|---|
| Battery / power supply | Power plant or generator | Injects energy into the map | The city has a source of life |
| Wire | Road or highway | Carries moving particles or vehicles | Energy needs a path |
| Current | Traffic flow | More flow means more moving cars | Busy paths indicate high demand |
| Voltage | Pressure / service level | Healthy districts glow strongly | A system needs enough push |
| Resistor | Narrow road / toll / bottleneck | Traffic slows and heat loss rises | Restriction controls flow |
| Capacitor | Reservoir / parking hub / backup station | Fills and discharges to smooth spikes | Storage stabilises the city |
| LED / lamp | Lit building / district | Turns on when supplied correctly | Output is easy to see |
| Motor | Factory / transport engine | Consumes more flow and stresses network | Loads have cost |
| Ground | Return network / city baseline | Routes flow home safely | Everything must reference a stable return |
| Short circuit | Crash path / catastrophic bypass | Rapid overload and red alerts | Energy took the wrong route |
| Open circuit | Broken road | District goes dark and isolated | The path is incomplete |

---

## 4. Core Product Experiences

### A. Sandbox Builder
Users drag components onto a canvas and wire them together. A live city view appears beside the schematic and updates in real time — as the circuit changes, districts light up, roads animate, and faults emerge visually.

### B. Learning Mode
Users receive guided lessons such as "power an LED safely" or "smooth a noisy supply with a capacitor." The system explains both the electronics rule and the city interpretation, with difficulty scaling from series circuits up to sensor and actuator examples.

### C. Debug Mode
Users are given a broken circuit and asked to identify the fault. The city reveals symptoms — blackouts, unstable districts, flicker, or overload — and the user learns diagnosis by connecting city symptoms to electrical causes.

### D. Challenge Mode
Users solve puzzles such as powering all districts with minimum parts, avoiding overload, or maintaining service while demand changes. Scores reward efficiency, stability, and correctness.

---

## 5. Schematic Upload Pipeline

The upload feature bridges serious hardware workflows with the playful city interface. Instead of drawing a circuit manually, a user can upload an existing schematic and have it translated into a city automatically.

**Supported input formats (MVP):**

| Input Type | How It's Used | MVP Feasibility |
|---|---|---|
| PNG / JPG screenshot | Upload an image of a drawn schematic | Good with AI vision + constrained parsing |
| PDF export | Upload a clean schematic page | Good if image rendering is extracted first |
| Structured netlist JSON | Machine-readable component and connection list | Best technical reliability |
| Simple form entry | Type components and connections manually | Fallback for demo reliability |

**Upload-to-city pipeline:**

1. **Ingest** — Accept image, PDF, or structured netlist. Normalise orientation, crop margins, improve contrast.
2. **Detect** — Use computer vision or LLM-vision to identify batteries, resistors, capacitors, LEDs, motors, switches, grounds, and labels.
3. **Infer connectivity** — Convert wires, junctions, and symbol endpoints into a graph of nodes and edges.
4. **Build circuit graph** — Represent the schematic as a structured model with components, pins, connections, values, and supply relationships.
5. **Run rule checks** — Detect open circuits, missing resistors before LEDs, floating grounds, direct supply shorts, impossible polarity, disconnected loads.
6. **Generate city** — Map each component or subnet to city objects: power plants, roads, districts, reservoirs, industrial buildings.
7. **Simulate and animate** — Run a simplified electrical simulation or rule-based flow engine, then animate healthy and unhealthy paths.
8. **Explain** — Show schematic and city side by side. Let users click a district or road to see which circuit element it represents.

**Example:** A user uploads a battery–resistor–LED schematic. The parser identifies one source, one resistor, one LED, and one complete loop. The city generates with one power plant, one controlled road, and one lit district. Remove the resistor, and the district flashes red — the system explains the road is feeding the district unsafely.

---

## 6. Technical Architecture

### Frontend

| Tool | Role |
|---|---|
| Next.js + TypeScript | App framework, routing, SSR |
| React | Component-based UI |
| PixiJS | 2D city canvas rendering and animation |
| React Flow | Drag-and-drop schematic builder |
| Tailwind CSS | Styling and layout |
| Zustand | Lightweight global state (circuit graph, simulation state) |

### Backend

| Tool | Role |
|---|---|
| Node.js + Express | REST API — handles project saves, upload jobs, user sessions |
| Python (FastAPI) | Parsing microservice — schematic image processing and graph construction |
| OpenCV + networkx | Image normalisation, symbol detection, connectivity inference |

### Data

| Tool | Role |
|---|---|
| **MongoDB Atlas** | Primary database — stores circuit documents, simulation snapshots, lesson progress, fault history. Document model is a natural fit since every circuit has a different graph structure |
| MongoDB Atlas Vector Search | Future: semantic search over saved circuits and lessons |

### AI & Challenge Tracks

| Tool | Role |
|---|---|
| **Gemini API (Vision)** | Parses uploaded schematic images — detects components, labels, and wires |
| **Gemini API (Text)** | Generates plain-English fault diagnosis, lesson content, and city commentary |
| **ElevenLabs** | Voices the city narrator in real time — speaks what's happening as the simulation runs (e.g. "District 3 is overloading — the resistor is missing from this path") |

### Infrastructure

| Tool | Role |
|---|---|
| Vercel | Frontend deployment |
| Railway / Render | Backend and parsing service hosting |
| Cloudinary | Schematic image storage |

---

### Challenge Track Integration Details

**MongoDB** — Every circuit is stored as a flexible document containing its component list, connection graph, simulation state, and fault history. No two circuits have the same shape, so MongoDB's schema-free model avoids the rigid table constraints of SQL. Atlas also enables fast project retrieval and future vector-based search over saved circuits.

**Gemini API** — Powers two critical flows: the vision model parses uploaded schematic images to extract components and wiring, and the text model generates all natural-language content — fault explanations, lesson steps, challenge hints, and city commentary — tied directly to the live simulation state.

**ElevenLabs** — Adds a voiced narrator layer to the city simulation. As districts light up, roads congest, or faults trigger, ElevenLabs converts Gemini's generated commentary into speech in real time. This makes the demo feel alive, improves accessibility, and gives the product a distinctive personality during the presentation.

---

## 7. Simulation Model (MVP)

The MVP does not need full professional-grade analog simulation. A lightweight rule engine is sufficient for compelling demos:

- Complete path detection
- Current-limiting logic for LEDs
- Basic capacitor smoothing behaviour
- Overload warnings for direct shorts
- Disconnected-zone detection for open circuits

This keeps the product understandable and stable while leaving room for future SPICE-backed accuracy.

---

## 8. User Interface Layout

- **Left panel** — Original schematic or drag-and-drop builder
- **Centre panel** — Generated city with animated roads, districts, alerts, and labels
- **Right panel** — Explanation drawer showing what each city object means in circuit terms
- **Bottom panel** — Warnings, event timeline, and educational hints
- **Top controls** — Switch between Learn, Build, Upload, Debug, and Challenge modes

---

## 9. AI Features

AI makes the upload feature practical by parsing messy schematic images, but it should not replace the product's core logic. Useful AI features include:

- Schematic explanation and fault diagnosis
- Lesson generation
- Converting text prompts into small circuit exercises
- Natural-language commentary (e.g. "why is this district flickering?")

---

## 10. MVP Scope

- Support 5–7 core components: battery, wire, resistor, LED, capacitor, switch, ground
- Allow manual circuit entry or upload of a clean schematic image
- Translate to a 2D city (not 3D) to keep the build realistic
- Animate flow, blackout, overload, and successful district powering
- Include one guided lesson and one broken-circuit debug example
- Side-by-side schematic and city view with click-to-highlight mapping

---

## 11. Demo Script

1. Show a normal schematic — explain that most beginners find it abstract
2. Upload the schematic and generate the city live
3. Highlight: battery → power plant, resistor → bottleneck road, LED → lit district
4. Swap to a faulty version with the resistor removed
5. Regenerate — show overload, flashing, and warning explanations
6. Close with the vision: *every circuit becomes something you can feel*

---

## 12. Why This Idea Is Strong

- Memorable one-line pitch judges will instantly understand
- Visual enough to explain itself without a technical background
- Solves a genuine pain point in hardware and electronics education
- Grows naturally into a serious product with curriculum, debugging tools, and maker integrations
- Fits a hardware and robotics identity while remaining accessible to non-experts

---

## 13. Future Extensions

- Transistors, op-amps, sensors, and microcontrollers
- KiCad / EasyEDA integration via netlist exports
- Collaborative classrooms, challenge leaderboards, and lesson packs
- Robot subsystem support — a sensor network or motor controller becomes a specialised city district
- Reverse mode: start from a city, learn how it maps back into a schematic

---

## 14. Roadmap

### Phase 0 — Hackathon Build (Hours 0–24)

#### Team Division (3 people)

---

**Person 1 — City Renderer & Frontend Lead**
*PixiJS, React, Zustand, Tailwind, UI layout, demo*

This person is responsible for everything the judges and audience will see and feel. They own the visual heart of the product — the animated city — and are the single decision-maker on how the interface looks and behaves. They scaffold the project at the start, define the shared circuit graph TypeScript type that the whole team builds to, and spend the bulk of the hackathon building and animating the PixiJS city canvas. They are not responsible for the logic of what the simulation decides — that comes from Person 2 via Zustand — but they are responsible for translating that state into compelling visuals: roads that pulse with traffic, districts that light up or go dark, overload alerts that flash red. In the final hours they own the demo entirely — scripting it, rehearsing it, and making sure the product looks polished and confident when it counts most. This role suits someone with strong frontend instincts, a good eye for visual feedback, and the ability to make things feel alive under pressure.

| Hours | Task |
|---|---|
| 0–2 | Scaffold Next.js + Tailwind, set up project repo, define shared circuit graph TypeScript type |
| 2–5 | Build static PixiJS city renderer — draw power plant, roads, and districts from hardcoded data |
| 5–9 | Wire city renderer to live circuit graph via Zustand — city updates as circuit changes |
| 9–13 | Animate city states — flowing traffic, blackout, flicker, overload, successful power |
| 13–17 | Side-by-side layout — schematic panel + city panel, click-to-highlight mapping |
| 17–21 | UI polish — mode switcher (Build/Upload/Debug), warning banners, ElevenLabs audio playback wired in |
| 21–24 | Demo prep — hardcoded lesson walkthrough, broken-circuit example, final visual polish |

---

**Person 2 — Schematic Builder, Simulation Engine & Backend**
*React Flow, rule-based simulation logic, Node.js + Express, MongoDB Atlas*

This person builds the two most technically demanding layers of the product: the interactive schematic builder that lets users construct circuits by hand, and the simulation engine that decides what those circuits actually do. They are the logic backbone of the team. The schematic builder (built with React Flow) produces a live circuit graph that feeds into Zustand; the simulation engine reads that graph and outputs a simulation state that drives Person 1's city animations. Getting this right is critical — if the simulation behaves incorrectly or inconsistently, the city will look wrong and the demo will fall apart. Alongside this, Person 2 also owns the Node.js backend and MongoDB integration, ensuring that circuits can be saved and reloaded, and that the backend is ready to receive parsed data from Person 3's pipeline. This role suits someone who is comfortable with both frontend logic and backend API work, and who can think clearly about data structures and edge cases under time pressure.

| Hours | Task |
|---|---|
| 0–2 | Set up React Flow canvas + Node.js + Express API + MongoDB Atlas in parallel — define circuit document schema |
| 2–6 | Build drag-and-drop schematic builder — place and connect components, live circuit graph output |
| 6–10 | Write rule-based simulation engine — path detection, LED current limiting, overload, open circuit |
| 10–14 | Connect simulation engine to Zustand — circuit graph in, simulation state out, city reacts |
| 14–17 | Build project save/load endpoints — store circuit graph, simulation state, and fault history in MongoDB |
| 17–20 | Debug mode — load a broken circuit, simulate faults, surface symptoms visually |
| 20–24 | Integration testing, edge cases, session persistence, deployment to Railway |

---

**Person 3 — AI, Parsing & Voice**
*Python FastAPI, Gemini Vision + Text, OpenCV, networkx, ElevenLabs, Vercel deployment*

This person owns everything AI-powered in the product, and is responsible for the two features that make it stand out from a standard circuit simulator: the ability to upload a schematic image and have it become a city, and the voiced narrator that explains what the city is doing in real time. They build a Python FastAPI microservice that accepts a schematic image, normalises it with OpenCV, passes it to Gemini Vision for component and wiring detection, and converts the result into a circuit graph that the rest of the stack can consume. In parallel, they integrate Gemini Text to generate live, context-aware commentary from the simulation state — explanations like "District 3 is dark because the LED has no current-limiting resistor" — and pipe that commentary into ElevenLabs to produce a voiced audio stream that plays in the frontend. This person also handles the final Vercel deployment. The role suits someone comfortable working in Python, confident prompting LLM APIs, and able to iterate quickly on AI output quality — because the Gemini Vision parsing will need prompt tuning to be reliable under demo conditions.

| Hours | Task |
|---|---|
| 0–2 | Set up Python FastAPI parsing microservice, connect to Node backend, configure API keys (Gemini, ElevenLabs) |
| 2–6 | Build image ingestion pipeline — accept PNG/JPG upload, normalise orientation and contrast with OpenCV |
| 6–10 | Integrate Gemini Vision — prompt to extract components, labels, and wiring from schematic image |
| 10–14 | Convert Gemini output into circuit graph — nodes, edges, component types, estimated values |
| 14–18 | Integrate Gemini Text — generate fault diagnosis and live city commentary from simulation state |
| 18–21 | Integrate ElevenLabs — convert Gemini commentary to voiced audio stream, return to frontend |
| 21–24 | End-to-end upload test (image in → city out → narrator speaks), deploy frontend to Vercel |

---

#### Integration Checkpoints

| Hour | Sync Point |
|---|---|
| 2 | Shared circuit graph type agreed and committed — everyone builds to the same model |
| 10 | Person 1 + 2 — simulation engine drives city animation live |
| 14 | Person 2 + 3 — upload pipeline returns circuit graph from schematic image |
| 18 | Full stack — drag-and-drop → city, upload → city, Gemini commentary → ElevenLabs voice |
| 22 | Feature freeze, full demo run-through, critical bugs only |

### Phase 1 — Post-Hackathon MVP (Weeks 1–4)

Stabilise the parsing pipeline, improve Gemini symbol detection accuracy, add the Learning and Debug modes fully, and support PDF schematic uploads. Deploy to Vercel + Railway with a public URL.

### Phase 2 — Public Beta (Months 1–3)

Add user accounts (auth via Clerk or Supabase Auth), saved project library, Challenge mode with scoring, and a basic lesson pack covering the 10 most common beginner circuits. Integrate ElevenLabs voice selection so users can pick their narrator.

### Phase 3 — Growth (Months 3–6)

Collaborative classroom mode, teacher dashboards, KiCad netlist import, leaderboards, and expanded component support (transistors, op-amps, sensors). Explore MongoDB Atlas Vector Search for semantically similar circuit suggestions.

### Phase 4 — Platform (Months 6–12)

Curriculum partnerships with universities and coding bootcamps, API access for third-party integrations, robot subsystem mapping (servo controllers, sensor networks as city districts), and a reverse mode where users design a city and see the equivalent schematic.
