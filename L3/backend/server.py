from __future__ import annotations

import csv
from collections import defaultdict
from datetime import datetime
import warnings
from pathlib import Path
from typing import Any

warnings.filterwarnings("ignore")

from ag_ui_langgraph import add_langgraph_fastapi_endpoint
from copilotkit import CopilotKitMiddleware, LangGraphAGUIAgent
from fastapi import FastAPI
from langchain.agents import create_agent
from langchain_mistralai import ChatMistralAI
from langchain.tools import tool
from langgraph.checkpoint.memory import MemorySaver

_LESSON_ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = _LESSON_ROOT / "db.csv"

_SYSTEM_PROMPT = (
    "You are a helpful assistant for a demo app with a few available UI tools. "
    "When a user asks for charts based on the lesson dataset, always call query_data first to fetch all CSV rows. "
    "When a user asks for a P&L, profit and loss, or income statement, always call get_income_statement and use that structured result instead of doing the math yourself. "
    "For P&L, profit and loss, and income statement requests, render the answer through the incomeStatement frontend tool and do not produce markdown tables, pseudo-tables, image summaries, or alternate freeform chart descriptions. "
    "After calling incomeStatement, keep any additional assistant text to one short sentence at most. "
    "Prefer using a matching frontend tool when it would present the answer clearly. "
    "Use pieChart for category distributions "
    "and incomeStatement for profit and loss requests "
    "and flightCard for a single flight summary when relevant. "
    "Tool arguments must match the provided schema exactly."
)


class IncomeStatementBuilder:
    """Parses db.csv and assembles the structured income statement dict.

    Results are cached after the first build so the CSV is only read once
    per server session. Pass a different csv_path to use alternate data
    (e.g. in tests).
    """

    def __init__(self, csv_path: Path) -> None:
        self.csv_path = csv_path
        self._cache: dict[str, Any] | None = None

    def build(self) -> dict[str, Any]:
        if self._cache is None:
            self._cache = self._build()
        return self._cache

    def invalidate(self) -> None:
        """Clear the cache so the next call to build() re-reads the CSV."""
        self._cache = None

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _format_period(period_key: str) -> str:
        return datetime.strptime(period_key, "%Y-%m").strftime("%b %Y")

    @staticmethod
    def _quarter_label(period_keys: list[str]) -> str:
        if not period_keys:
            return "Total"
        last_period = datetime.strptime(period_keys[-1], "%Y-%m")
        quarter = ((last_period.month - 1) // 3) + 1
        return f"Q{quarter} {last_period.year} Total"

    def _read_csv(self) -> defaultdict:
        monthly_totals: defaultdict = defaultdict(lambda: {
            "income": defaultdict(float),
            "expense": defaultdict(float),
        })
        with self.csv_path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                period_key = row["date"][:7]
                line_type = row["type"].strip().lower()
                subcategory = row["subcategory"].strip()
                monthly_totals[period_key][line_type][subcategory] += float(row["amount"])
        return monthly_totals

    @staticmethod
    def _build_lines(
        monthly_totals: defaultdict,
        period_keys: list[str],
        line_type: str,
        labels: list[str],
    ) -> list[dict[str, Any]]:
        lines = []
        for label in labels:
            values = [
                round(monthly_totals[pk][line_type].get(label, 0.0), 2)
                for pk in period_keys
            ]
            lines.append({"label": label, "values": values + [round(sum(values), 2)]})
        return lines

    def _build(self) -> dict[str, Any]:
        monthly_totals = self._read_csv()
        period_keys = sorted(monthly_totals.keys())
        period_labels = [self._format_period(pk) for pk in period_keys]
        quarter_label = self._quarter_label(period_keys)

        revenue_labels = sorted({
            label
            for period in monthly_totals.values()
            for label in period["income"].keys()
        })
        expense_labels = sorted({
            label
            for period in monthly_totals.values()
            for label in period["expense"].keys()
        })

        revenue_lines = self._build_lines(monthly_totals, period_keys, "income", revenue_labels)
        expense_lines = self._build_lines(monthly_totals, period_keys, "expense", expense_labels)

        revenue_total = [
            round(sum(monthly_totals[pk]["income"].values()), 2)
            for pk in period_keys
        ]
        expense_total = [
            round(sum(monthly_totals[pk]["expense"].values()), 2)
            for pk in period_keys
        ]
        net_income = [
            round(revenue_total[i] - expense_total[i], 2)
            for i in range(len(period_keys))
        ]
        summary_chart = [
            {
                "label": period_labels[i],
                "revenue": revenue_total[i],
                "expenses": expense_total[i],
                "netIncome": net_income[i],
            }
            for i in range(len(period_keys))
        ]

        return {
            "title": "Income Statement",
            "description": "Monthly profit and loss view for the dataset, including quarter totals.",
            "periods": period_labels + [quarter_label],
            "revenueLines": revenue_lines,
            "expenseLines": expense_lines,
            "revenueTotal": revenue_total + [round(sum(revenue_total), 2)],
            "expenseTotal": expense_total + [round(sum(expense_total), 2)],
            "netIncome": net_income + [round(sum(net_income), 2)],
            "summaryChart": summary_chart,
        }


class Lesson3Backend:
    """Wires the LangGraph agent, CopilotKit middleware, and FastAPI server."""

    def __init__(
        self,
        csv_path: Path = CSV_PATH,
        port: int = 8003,
        model: str = "mistral-large-latest",
    ) -> None:
        self.port = port
        self.model = model
        self._builder = IncomeStatementBuilder(csv_path)
        self._app: FastAPI | None = None

    def build_app(self) -> FastAPI:
        """Build and return the FastAPI app without starting the server.

        Used by main.py for terminal mode (uvicorn.run) and by start() for
        notebook mode (helper.start_server background thread).
        """
        self._app = FastAPI()

        @self._app.get("/health")
        def health() -> dict[str, str]:
            return {"status": "ok", "agent": "lesson3_charts_agent"}

        agent = LangGraphAGUIAgent(
            name="lesson3_charts_agent",
            description="Lesson 3 controlled generative UI agent",
            graph=self._build_graph(),
        )
        add_langgraph_fastapi_endpoint(app=self._app, agent=agent, path="/")
        return self._app

    def start(self) -> None:
        from helper import start_server
        start_server(self.build_app(), self.port)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _make_tools(self) -> list:
        builder = self._builder

        @tool
        def query_data(query: str) -> list[dict[str, Any]]:
            """Query the lesson dataset. Always call before showing a chart or graph."""
            with builder.csv_path.open(newline="", encoding="utf-8") as f:
                return list(csv.DictReader(f))

        @tool
        def get_income_statement() -> dict[str, Any]:
            """Return a deterministic income statement for the lesson dataset."""
            return builder.build()

        return [query_data, get_income_statement]

    def _build_graph(self):
        return create_agent(
            model=ChatMistralAI(model=self.model),
            tools=self._make_tools(),
            middleware=[CopilotKitMiddleware()],
            checkpointer=MemorySaver(),
            system_prompt=_SYSTEM_PROMPT,
        )


# ---------------------------------------------------------------------------
# Entry point (kept for backward compatibility with existing run commands)
# ---------------------------------------------------------------------------

def start_backend(port: int = 8003) -> None:
    Lesson3Backend(port=port).start()
