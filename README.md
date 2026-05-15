# AGUI-nickel

This repository contains a Lesson 2 Generative UI demo built with:

- FastAPI for the Python backend
- LangGraph and CopilotKit for the agent bridge
- Mistral via LangChain for the chat model
- Vite and React for the frontend

The project currently centers on the `agui-nickel` application directory.

## Project Structure

```text
GenUI/
├── agui-nickel/
│   ├── aguitest.ipynb    # Notebook workflow
│   ├── main.py           # Terminal-only backend entrypoint
│   ├── helper.py         # Notebook and local helper utilities
│   └── frontend/         # React + Vite + CopilotKit frontend
├── genui/                # Python virtual environment
├── requirements.txt      # Python dependencies
└── README.md
```

## Architecture

```text
╔════════════════════════════════════╗   ←  FRONTEND
║  React App          Port 3002      ║
║  CopilotKit Provider               ║
║  CopilotChat Component             ║
╠════════════════════════════════════╣
║  RUNTIME LAYER      Port 4002      ║
║  CopilotRuntime (Hono Server)      ║
║  Agent Registry:                   ║
║  - default -> LangGraph agent      ║
║  - gemini  -> ADK agent            ║
║  AG-UI Connectors                  ║
╠════════════════════════════════════╣
║  AG-UI PROTOCOL                    ║
║  Open • Lightweight • Event-based  ║
║  (Frontend ↔ Agent communication)  ║
╠════════════════════════════════════╣
║  LANGCHAIN AGENT    Port 8000      ║
║  FastAPI                           ║
║  LangGraphAGUIAgent + Middleware   ║
║  Mistral via LangChain             ║
╠════════════════════════════════════╣
║  GOOGLE ADK AGENT   Port 8009      ║
║  FastAPI                           ║
║  ADKAgent + Gemini                 ║
║  Optional second backend           ║
╚════════════════════════════════════╝
```

## Prerequisites

- Python 3.13
- Node.js 22+
- npm
- A Mistral API key

Optional:

- A Google API key if you want to work on the notebook bonus section
- Jupyter if you want to run the notebook workflow

## Environment Variables

Create a file at `agui-nickel/.env`:

```env
MISTRAL_API_KEY=your_mistral_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

`GOOGLE_API_KEY` is only needed for the notebook bonus section.

## Install Dependencies

### Python

Use the existing virtual environment in `genui`:

```bash
source genui/bin/activate
./genui/bin/python -m pip install -r requirements.txt
```

### Frontend

```bash
cd agui-nickel/frontend
npm install
```

## Run Options

You should use one workflow at a time.

- Notebook workflow: run the lesson from `agui-nickel/aguitest.ipynb`
- Terminal-only workflow: run `agui-nickel/main.py` and `agui-nickel/frontend`

Do not run both workflows at the same time, or you will get port conflicts.

## Notebook Workflow

Start Jupyter:

```bash
source genui/bin/activate
jupyter notebook
```

Then open `agui-nickel/aguitest.ipynb` and run the lesson cells in order.

Expected lesson ports:

- Frontend: `3002`
- CopilotKit runtime: `4002`
- Backend: `8002`

Open the app at:

```text
http://localhost:3002
```

## Terminal-Only Workflow

Use this when you do not want to run the notebook.

### Terminal 1: Backend

```bash
cd agui-nickel
source ../genui/bin/activate
python main.py
```

This starts the backend on:

```text
http://localhost:8000
```

### Terminal 2: Frontend and Runtime

```bash
cd agui-nickel/frontend
LANGGRAPH_DEPLOYMENT_URL=http://localhost:8000 npm run dev -- --port 3002
```

This starts:

- Frontend on `3002`
- CopilotKit runtime on `4002`

Open the app at:

```text
http://localhost:3002
```

## Current Model Configuration

The current non-bonus backend is configured for:

- Provider: Mistral
- Model: `mistral-large-latest`

The frontend currently targets the default LangGraph-backed agent, not the bonus Gemini agent.

## Common Issues

### Port already in use

If you see errors for `3002`, `4002`, `8000`, or `8002`, another copy of the app is already running.

This usually happens when:

- You started the notebook workflow and then tried the terminal workflow
- You ran `npm run dev` more than once

Use only one workflow at a time.

### Blank screen on port 3002

If the frontend is running but the page is blank, first hard refresh the browser.

If the issue returns, confirm that:

- the frontend is running on `3002`
- the runtime is running on `4002`
- the backend is running on `8000` for terminal mode or `8002` for notebook mode

## Stop the App

For terminal-only mode, press `Ctrl+C` in both running terminals.

For notebook mode, stop the running cells or restart the notebook kernel.