
import { CopilotRuntime, createCopilotEndpoint } from "@copilotkit/runtime/v2";
import { HttpAgent } from "@ag-ui/client";
import { LangGraphHttpAgent } from "@copilotkit/runtime/langgraph";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const langGraphAgent = new LangGraphHttpAgent({
  url: process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8000",
});

const adkAgent = new HttpAgent({
  url: process.env.ADK_AGENT_URL || "http://localhost:8009",
});

const langGraphUrl = process.env.LANGGRAPH_DEPLOYMENT_URL || "http://localhost:8000";
const adkUrl = process.env.ADK_AGENT_URL || "http://localhost:8009";

const runtime = new CopilotRuntime({
  agents: {
    default: langGraphAgent,
    gemini: adkAgent,
  },
});

const copilotApp = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

async function isBackendAvailable(url: string) {
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const app = new Hono();

app.route("/", copilotApp);

app.get("/api/agent-status", async (c) => {
  const [defaultAvailable, geminiAvailable] = await Promise.all([
    isBackendAvailable(langGraphUrl),
    isBackendAvailable(adkUrl),
  ]);

  return c.json({
    default: {
      id: "default",
      label: "Mistral",
      url: langGraphUrl,
      available: defaultAvailable,
    },
    gemini: {
      id: "gemini",
      label: "Gemini",
      url: adkUrl,
      available: geminiAvailable,
    },
  });
});

serve({ fetch: app.fetch, port: 4002 }, () => {
  console.log("CopilotKit API server running at http://localhost:4002");
});
