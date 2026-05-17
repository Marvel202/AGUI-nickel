# Lesson 3 — Controlled Generative UI

A financial data chat assistant that renders structured UI components — income statement, pie chart, flight card — driven by a LangGraph agent with deterministic data aggregation from a CSV file.

## Architecture

```
╔══════════════════════════════════════╗  ← FRONTEND
║  React + Vite          Port 3003     ║
║  CopilotKit Provider                 ║
║  Registered components:              ║
║    incomeStatement · pieChart        ║
║    flightCard · showMyName           ║
╠══════════════════════════════════════╣
║  RUNTIME LAYER         Port 4003     ║
║  CopilotRuntime (Hono / Node)        ║
║  LangGraphHttpAgent → backend        ║
╠══════════════════════════════════════╣
║  BACKEND               Port 8003     ║
║  FastAPI + uvicorn                   ║
║  LangGraphAGUIAgent                  ║
║  Mistral via LangChain               ║
║  Tools: query_data · get_income_statement
╠══════════════════════════════════════╣
║  DATA                                ║
║  db.csv  (revenue & expense rows)    ║
╚══════════════════════════════════════╝
```

## Prerequisites

- Python 3.11+
- Node.js 22+
- A Mistral API key

## Setup

### 1. API key

Copy `.env.example` to `.env` and fill in your key:

```bash
cp .env.example .env
# edit .env → MISTRAL_API_KEY=sk-...
```

### 2. Python dependencies

```bash
source .venv/bin/activate
pip install -r ../requirements.txt
```

> The `.venv` is an isolated uv environment (Python 3.11.13) inside `L3/`. Create it once with:
> ```bash
> uv venv --python 3.11 && uv pip install -r ../requirements.txt
> ```

### 3. Frontend dependencies

```bash
cd frontend
npm install
```

## Run (terminal workflow)

Open two terminals from the `L3/` directory.

**Terminal 1 — Backend:**

```bash
source .venv/bin/activate
python main.py
```

Starts the FastAPI backend on `http://localhost:8003`.
Verify: `curl http://localhost:8003/health`

**Terminal 2 — Frontend:**

```bash
cd frontend
npm run dev -- --port 3003
```

Starts the React app + CopilotKit runtime.
Open `http://localhost:3003`.

## Run (notebook workflow)

```bash
source .venv/bin/activate
jupyter notebook
```

Open `L3.ipynb` and run cells in order. Ports: frontend `3003`, runtime `4003`, backend `8003`.

## What you can ask

| Prompt | Component rendered |
|---|---|
| "Show me the income statement" | Income statement table + bar charts + AI insight |
| "Pie chart of revenue by category" | Pie chart |
| "Show my name" | Name card |

## Ports

| Service | Port |
|---|---|
| Frontend (Vite) | 3003 |
| CopilotKit runtime (Hono) | 4003 |
| Backend (FastAPI) | 8003 |

## Common issues

**Port already in use** — `main.py` kills any existing process on 8003 at startup. For the frontend, stop the previous `npm run dev` process first.

**Blank page** — confirm all three services are running (backend 8003, runtime 4003, frontend 3003).

**MISTRAL_API_KEY not set** — `main.py` exits immediately with a clear message if the key is missing from `.env`.
