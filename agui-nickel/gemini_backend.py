from __future__ import annotations

import os
import subprocess as _sp
import sys
import time
import warnings
from pathlib import Path

import uvicorn
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from fastapi import FastAPI
from google.adk.agents import LlmAgent

warnings.filterwarnings("ignore")

HOST = "0.0.0.0"
PORT = 8009
MODEL = "gemini-2.5-flash"


def _kill_port(port: int) -> None:
    """Kill any process currently listening on *port*."""
    try:
        result = _sp.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True)
        for pid in result.stdout.strip().split():
            if pid:
                print(f"⚠ Found existing process (PID {pid}) on port {port} — killing it")
                os.kill(int(pid), 9)
        if result.stdout.strip():
            time.sleep(0.5)
    except Exception:
        pass


def _ensure_google_api_key() -> None:
    if os.environ.get("GOOGLE_API_KEY"):
        os.environ.setdefault("GEMINI_API_KEY", os.environ["GOOGLE_API_KEY"])
        return

    app_dir = Path(__file__).resolve().parent
    if str(app_dir) not in sys.path:
        sys.path.insert(0, str(app_dir))

    from helper import get_gemini_api_key

    api_key = get_gemini_api_key()
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not found. Add it to agui-nickel/.env before starting Gemini.")

    os.environ["GOOGLE_API_KEY"] = api_key
    os.environ.setdefault("GEMINI_API_KEY", api_key)


def build_app() -> FastAPI:
    _ensure_google_api_key()

    gemini_agent = LlmAgent(
        name="assistant",
        model=MODEL,
        instruction="Be helpful and fun!",
    )

    adk_agent = ADKAgent(
        adk_agent=gemini_agent,
        app_name="demo_app",
        user_id="demo_user",
        session_timeout_seconds=3600,
        use_in_memory_services=True,
    )

    app = FastAPI()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "agent": "gemini", "model": MODEL}

    add_adk_fastapi_endpoint(app, adk_agent, path="/")
    return app


app = build_app()


def main() -> None:
    _kill_port(PORT)
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()