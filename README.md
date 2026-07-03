# Wave-Link — Ocean Hazard Intelligence Platform

Wave-Link is a crowdsourced ocean-hazard reporting platform for India's coastline. Citizens report hazards (tsunamis, storm surges, high waves, coastal currents, abnormal sea behavior); every report is automatically analyzed for sentiment, named entities, and severity; and — because storms are exactly when cell towers go down — the platform includes an offline mesh-relay sync protocol so reports and messages can still reach the system once *any* device in the chain finds connectivity again.

Built for **TEKATHON 4.0 (2025)**, Smart India Hackathon 2025, Problem Statement **SIH25039**, for the Ministry of Earth Sciences (MoES) and INCOIS.

---

## Table of contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Quickstart (Docker)](#quickstart-docker)
- [Manual setup](#manual-setup)
- [Environment variables](#environment-variables)
- [API reference](#api-reference)
- [The mesh sync protocol](#the-mesh-sync-protocol)
- [AI models](#ai-models)
- [Running tests](#running-tests)
- [Project structure](#project-structure)
- [Known limitations & roadmap](#known-limitations--roadmap)
- [Credits](#credits)

---

## What it does

India's coastline is long, and real-time field reporting from citizens is exactly the signal that's missing between satellite/sensor data (which INCOIS already provides) and what's actually happening on the ground. Wave-Link lets:

- **Citizens** report a hazard with a hazard type, free-text description, and (optionally) GPS location, from a web dashboard.
- **The backend** immediately run sentiment analysis, named-entity recognition, and severity scoring on every report — no manual triage needed before it's visible.
- **Authorities** verify reports, watch a live map, and see aggregate analytics.
- **The mesh sync protocol** let reports and chat messages survive a connectivity outage: a device queues them locally, hands them off (device-to-device, on real hardware — see [limitations](#known-limitations--roadmap)) until one reaches the internet, and that device syncs the whole batch through a dedup + trust-scoring pipeline. The web app includes a **simulated offline mode** that demonstrates this exact protocol from a browser tab.

## Architecture

```
┌─────────────────────────┐        HTTP/JSON        ┌──────────────────────────────┐
│   frontend/ (React SPA)  │ ───────────────────────▶ │   app/ (FastAPI backend)     │
│                          │ ◀─────────────────────── │                              │
│  • Home / Map / Analytics│                          │  routers/  → reports, mesh,  │
│  • Report submission     │                          │             messages         │
│  • Mesh Network + Chat   │                          │  services/ → business logic  │
│  • Simulated offline mode│                          │  models.py → SQLAlchemy ORM  │
│    (localStorage queue)  │                          │  schemas.py → Pydantic I/O   │
└─────────────────────────┘                          │  services/hf_nlp.py →        │
                                                       │    sentiment + NER (HF)      │
                                                       │  services/ml_model.py →      │
                                                       │    severity (trained model   │
                                                       │    or rule-based fallback)   │
                                                       └───────────────┬──────────────┘
                                                                       │
                                                                SQLite / Postgres
```

Every write goes through the same shape regardless of source: `POST /reports` (a citizen typing directly) and `POST /mesh/sync` (a device flushing an offline queue) both end up running the identical AI pipeline and land in the same `reports` table — the only difference is `source` (`citizen` vs `mesh`) and whether relay provenance (`hop_count`, `relay_path`, `trust_score`) is populated.

## Features

- **Crowdsourced hazard reporting** with automatic AI analysis (sentiment, entities, severity) on submission.
- **Report verification** — authorities can mark a report `verified` (`PATCH /reports/{id}/verify`).
- **Live map** (Leaflet + OpenStreetMap, no API key required) with severity-colored markers.
- **Analytics dashboard** — real breakdowns by severity, hazard type, and source, computed from actual data (no fabricated numbers).
- **Mesh Network view** — relay node table (last seen, reports relayed, trust score) and mesh-vs-direct report stats.
- **Mesh Chat** — a broadcast message feed that rides the same relay/dedup/trust protocol as hazard reports.
- **Simulated offline mode** — a "Simulate Offline" toggle in the header queues reports/messages in `localStorage` and syncs them through the real `/mesh/sync` and `/mesh/messages/sync` endpoints when you go back online, demonstrating the actual sync protocol from a browser.
- **Rate limiting** on all write endpoints (in-memory sliding window, per client IP).
- **Pagination** (`limit`/`offset`) on report and message listings.
- **Error boundary** on the frontend — a crash anywhere in the component tree shows a recovery screen instead of a blank page.

## Tech stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI + Uvicorn |
| Database | SQLAlchemy ORM, SQLite by default (swap `DATABASE_URL` for Postgres) |
| AI / NLP | HuggingFace Transformers — DistilBERT (sentiment), BERT-large (NER), lazily loaded |
| Severity model | scikit-learn (TF-IDF + LogisticRegression) if trained, else a rule-based heuristic |
| Backend tests | pytest + FastAPI `TestClient` |
| Frontend framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Map | react-leaflet + Leaflet, OpenStreetMap tiles |
| Icons | lucide-react |
| Frontend tests | Vitest |
| Containerization | Docker + Docker Compose |

## Quickstart (Docker)

The fastest way to run the whole stack:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (interactive docs at http://localhost:8000/docs)

**Heads up on first run**: the backend image installs `torch` + `transformers`, so the first build is large and can take several minutes. Separately, the sentiment/NER models are lazily downloaded on the *first real request* the backend handles (not at container startup), so the very first `POST /reports` after a fresh container will be noticeably slower than every one after it — that's expected, not a bug.

The SQLite database lives in a named Docker volume (`wave_link_db`), so your data survives `docker compose down` / restarts (use `docker compose down -v` to actually wipe it).

## Manual setup

### Backend

```bash
python3 -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env              # optional — sane defaults work without it
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# edit .env.local if your backend isn't on http://localhost:8000
npm run dev
```

Then open the URL Vite prints (typically http://localhost:5173).

## Environment variables

**Backend** (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./wave_link.db` | SQLAlchemy connection string. Point at Postgres for production. |
| `SEVERITY_MODEL_PATH` | `./data/severity_model.joblib` | Path to a trained severity classifier (see `app/ml/train.py`). Optional — falls back to the rule-based heuristic automatically if the file doesn't exist. |
| `RATE_LIMIT_MAX_REQUESTS` | `30` | Max write requests (POST/PATCH/PUT/DELETE) per client IP per window. |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate limit window length, in seconds. |

**Frontend** (see `frontend/.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL the frontend calls for the backend API. |

## API reference

Interactive Swagger docs are always available at `/docs` on a running backend (e.g. http://localhost:8000/docs). Summary:

### Reports

| Method & path | Body / query | Description |
|---|---|---|
| `POST /reports` | `{text, hazard_type?, latitude?, longitude?, client_uuid?}` | Create a report directly. Runs sentiment/NER/severity synchronously. `409` if `client_uuid` already exists. |
| `GET /reports` | `?severity=&hazard_type=&limit=100&offset=0` | List reports, newest first. |
| `GET /reports/stats` | — | `{total_reports, by_severity, by_hazard_type, by_source}`. |
| `GET /reports/{id}` | — | Fetch one report. `404` if missing. |
| `PATCH /reports/{id}/verify` | — | Mark a report `verified: true`. `404` if missing. **No auth** — see [limitations](#known-limitations--roadmap). |

### Messages (mesh chat)

| Method & path | Body / query | Description |
|---|---|---|
| `POST /messages` | `{text, sender_name?, client_uuid?}` | Post a chat message directly (no AI analysis — chat isn't a hazard report). |
| `GET /messages` | `?limit=100&offset=0` | List messages, newest first. |

### Mesh sync protocol

| Method & path | Body | Description |
|---|---|---|
| `POST /mesh/sync` | `{device_id, reports: [{client_uuid, text, hazard_type?, latitude?, longitude?, relay_path, hop_count}]}` | Batch-ingest reports a device collected while offline. Dedupes by `client_uuid`, computes `trust_score` from `hop_count`, runs the AI pipeline, upserts the relaying `MeshNode`. |
| `POST /mesh/messages/sync` | `{device_id, messages: [{client_uuid, text, sender_name?, relay_path, hop_count}]}` | Same idea, for chat messages. |
| `GET /mesh/nodes` | — | List known relay devices: `{device_id, last_seen, reports_relayed, trust_score}`. |
| `GET /mesh/status` | — | `{active_nodes, total_nodes, mesh_reports, direct_reports, avg_hop_count}`. |

### Misc

| Method & path | Description |
|---|---|
| `GET /` | Liveness message. |
| `GET /health` | `{"status": "ok"}` — used by the Docker healthcheck. |
| `POST /analyze/` | Raw sentiment + NER on arbitrary text, no persistence. Kept for backward compatibility; prefer `POST /reports` for anything that should appear on the dashboard. |

## The mesh sync protocol

This is the backend half of offline peer-to-peer relay. The picture it models:

1. A phone loses connectivity during a storm. It keeps queuing hazard reports/messages locally instead of failing to submit.
2. Nearby phones relay those items device-to-device — **that radio transport (Bluetooth/LoRa/Wi-Fi Direct) is on-device and outside this backend's reach**; see [limitations](#known-limitations--roadmap).
3. Whichever device eventually reaches the internet calls `POST /mesh/sync` / `POST /mesh/messages/sync` with everything it's carrying.
4. The backend:
   - **Dedupes** by client-generated `client_uuid` — re-syncing the same batch twice is a safe no-op.
   - **Scores trust** by hop count: `trust_score = 1.0 × 0.85^hop_count`. Longer relay chains are more likely to have been tampered with or garbled, so trust decays with distance from the origin.
   - **Tracks relay devices** in `MeshNode` — `trust_score` there is a running average of every trust score that device has relayed, so a node that consistently relays long/low-trust chains trends down over time.
   - **Preserves provenance** — `origin_device_id` and `relay_path` (the full hop chain) are stored on every mesh-sourced row.

The frontend's "Simulate Offline" toggle drives this exact protocol from a browser tab (queues in `localStorage`, syncs via the real endpoints with `hop_count: 0` since no actual relay occurred) — it's a demonstration of the protocol, not a claim that browsers can do real device-to-device mesh networking.

## AI models

Every report and every text field run through three separate models/heuristics, in this order, on every `POST /reports` and every item inside `POST /mesh/sync`. All names below are pinned explicitly in `app/services/hf_nlp.py` (`SENTIMENT_MODEL`, `NER_MODEL` constants) — not left to whatever a library update happens to default to.

### 1. Sentiment analysis

| | |
|---|---|
| Model | [`distilbert/distilbert-base-uncased-finetuned-sst-2-english`](https://huggingface.co/distilbert/distilbert-base-uncased-finetuned-sst-2-english) |
| Type | DistilBERT (66M params), fine-tuned on SST-2 |
| Size | ~268 MB |
| Output | `POSITIVE` / `NEGATIVE` + confidence score (0–1) |
| Used for | `Report.sentiment_label`, `Report.sentiment_score`, and as an input signal to severity scoring |

### 2. Named entity recognition (NER)

| | |
|---|---|
| Model | [`dbmdz/bert-large-cased-finetuned-conll03-english`](https://huggingface.co/dbmdz/bert-large-cased-finetuned-conll03-english) |
| Type | BERT-large (334M params), fine-tuned on CoNLL-03 |
| Size | ~1.3 GB |
| Output | Entities grouped by type — `PER` (person), `LOC` (location), `ORG` (organization), `MISC` — each with a confidence score and character span |
| Used for | `Report.ner_entities` (stored as a JSON string) |

Both pipelines are built with `transformers.pipeline(...)` in `app/services/hf_nlp.py`, **lazily loaded and cached** (`@lru_cache`) — they only download/initialize on the first real request a process handles, not at import time or app startup. That's deliberate: it means running the test suite never needs network access (tests monkeypatch `analyze_text` entirely — see `tests/conftest.py`), but it does mean the *first* `POST /reports` after a fresh process start is slow (downloading ~1.5 GB combined, then loading weights) while every request after that is fast. See [Quickstart](#quickstart-docker) for how this shows up with Docker specifically.

### 3. Severity classification

Two possible paths, chosen automatically by `app/services/ml_model.py`:

- **Trained model** (used if `SEVERITY_MODEL_PATH` — default `./data/severity_model.joblib` — exists): a **scikit-learn** pipeline, **TF-IDF vectorizer + LogisticRegression**, trained by `app/ml/train.py` on verified, labeled reports pulled from the database. This file does not exist in a fresh checkout — there's no labeled data yet — so this path is currently theoretical until the platform has ≥20 verified reports and someone runs `python -m app.ml.train`.
- **Rule-based fallback** (what actually runs today, in `app/services/hf_nlp.py`'s `score_severity()`):

  ```
  weight = hazard_type base weight:
    tsunami=5, storm-surge=4, high-waves=3, swell-surge=3,
    coastal-current=2, abnormal-sea=2, (unset)=1

  + 2   if the text contains any of: evacuate, trapped, drowning, collapsed,
        emergency, flooding, deaths, casualties, missing

  + sentiment_score (0–1)   if the AI detected NEGATIVE sentiment

  then:  weight ≥ 5 → "high"   |   weight ≥ 3 → "medium"   |   else → "low"
  ```

  This is a heuristic, not a model — it does **not** parse intensity language ("very high waves" scores identically to "high waves"), and severity is mostly driven by the hazard type category the citizen picked, not deep text understanding. Worth knowing before treating `severity_label` as more precise than it is.

## Running tests

**Backend** (17 tests — reports, mesh sync, chat, verification, pagination, rate limiting):

```bash
pytest
```

**Frontend** (18 tests — formatting utilities, offline queue logic):

```bash
cd frontend
npm run test
```

## Project structure

```
app/
  main.py              FastAPI app, middleware, router registration
  db.py                SQLAlchemy engine/session setup
  models.py             Report, MeshNode, MeshMessage ORM models
  schemas.py            Pydantic request/response schemas
  middleware/
    rate_limit.py        In-memory sliding-window rate limiter
  routers/
    reports.py, mesh.py, messages.py   HTTP route definitions
  services/
    reports.py, messages.py, mesh.py   Business logic
    hf_nlp.py             Sentiment/NER + rule-based severity heuristic
    ml_model.py           Trained severity classifier loader (with fallback)
  ml/
    train.py              Offline script to train the severity classifier
tests/                  pytest suite
frontend/
  src/
    App.tsx               Header, nav, tab routing, offline toggle
    api.ts                Typed fetch wrappers for every backend endpoint
    types.ts               Shared TypeScript types (mirrors app/schemas.py)
    context/OfflineContext.tsx   Simulated offline queue + sync state
    components/            One component per tab, plus ErrorBoundary
    lib/                   Pure helper functions (formatting, offline queue) + tests
data/                   Trained severity model lives here if present
Dockerfile, frontend/Dockerfile, docker-compose.yml   Container setup
```

## Known limitations & roadmap

Stated plainly, not hidden:

- **No authentication.** No endpoint requires a login — `PATCH /reports/{id}/verify` is callable by anyone, same as everything else. Adding real auth (accounts, sessions, role-based access for "authority" vs "citizen") is a substantially larger feature than anything else in this list and hasn't been built yet.
- **Rate limiting is in-memory, single-process.** Fine for one backend instance; a multi-worker or multi-instance deployment would need a shared store (e.g. Redis) instead.
- **No real device-to-device mesh radio relay.** This repo implements and demonstrates the *sync protocol* (dedup, hop-trust decay, relay provenance). Actual Bluetooth/LoRa/Wi-Fi Direct transport between phones would need a native Android/iOS app — a separate, much larger project.
- **Social media monitoring is not implemented.** The original concept included AI-powered Twitter/Instagram/Facebook monitoring for early hazard detection; it's not wired up. The Analytics tab is explicit about this rather than showing fabricated numbers.
- **Severity scoring is a simple heuristic until a model is trained.** See [AI models](#ai-models).
- **SQLite by default.** Fine for a demo; swap `DATABASE_URL` for Postgres before any real concurrent-write production use.

## Credits

Built by **Team Catalyst** for **TEKATHON 4.0 — 2025**, Smart India Hackathon 2025, Problem Statement **SIH25039**, for the Ministry of Earth Sciences (MoES) and the Indian National Centre for Ocean Information Services (INCOIS).
