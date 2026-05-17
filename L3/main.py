from __future__ import annotations

import os
import subprocess
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

import uvicorn

HOST = "0.0.0.0"
PORT = 8003

_APP_DIR = Path(__file__).resolve().parent
if str(_APP_DIR) not in sys.path:
    sys.path.insert(0, str(_APP_DIR))


def _kill_port(port: int) -> None:
    try:
        result = subprocess.run(["lsof", "-ti", f":{port}"], capture_output=True, text=True)
        for pid in result.stdout.strip().split():
            if pid:
                print(f"⚠  Found existing process (PID {pid}) on port {port} — killing it")
                os.kill(int(pid), 9)
        if result.stdout.strip():
            time.sleep(0.5)
    except Exception:
        pass


def _ensure_api_key() -> None:
    if os.environ.get("MISTRAL_API_KEY"):
        return
    from helper import get_mistral_api_key
    key = get_mistral_api_key()
    if not key:
        sys.exit("✗  MISTRAL_API_KEY not set — add it to L3/.env and retry.")
    os.environ["MISTRAL_API_KEY"] = key
    print("✓  Mistral API key loaded")


_ensure_api_key()

from backend.server import Lesson3Backend

_backend = Lesson3Backend(port=PORT)
app = _backend.build_app()


def main() -> None:
    _kill_port(PORT)
    print(f"\n✓  Backend ready — http://localhost:{PORT}")
    print(f"   /health  →  {{\"status\": \"ok\"}}")
    print(f"\n   Next: open a second terminal and run:")
    print(f"     cd L3/frontend && npm run dev -- --port 3003")
    print(f"\n   Then open http://localhost:3003\n")
    uvicorn.run(app, host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
