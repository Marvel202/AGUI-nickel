
import { useEffect, useState } from "react";
import { CopilotChat } from "@copilotkit/react-core/v2";

type AgentId = "default" | "gemini";

type AgentOption = {
  id: AgentId;
  label: string;
  description: string;
  available: boolean;
};

const DEFAULT_AGENT_OPTIONS: Array<AgentOption> = [
  {
    id: "default",
    label: "Mistral",
    description: "LangGraph backend on localhost:8000",
    available: true,
  },
  {
    id: "gemini",
    label: "Gemini",
    description: "ADK backend on localhost:8009",
    available: false,
  },
];

export default function App() {
  const [agentId, setAgentId] = useState<AgentId>("default");
  const [agentOptions, setAgentOptions] = useState<Array<AgentOption>>(DEFAULT_AGENT_OPTIONS);
  const [statusMessage, setStatusMessage] = useState("Checking available backends...");
  const [statusVersion, setStatusVersion] = useState(0);
  const [chatVersion, setChatVersion] = useState(0);
  const [threadId, setThreadId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    let isActive = true;

    async function loadAgentStatus() {
      try {
        const response = await fetch("/api/agent-status", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Status request failed with ${response.status}`);
        }

        const status = await response.json();
        if (!isActive) {
          return;
        }

        const nextOptions: Array<AgentOption> = [
          {
            id: "default",
            label: "Mistral",
            description: `LangGraph backend on ${status.default.url.replace("http://", "")}`,
            available: Boolean(status.default.available),
          },
          {
            id: "gemini",
            label: "Gemini",
            description: `ADK backend on ${status.gemini.url.replace("http://", "")}`,
            available: Boolean(status.gemini.available),
          },
        ];

        setAgentOptions(nextOptions);

        if (!status.gemini.available && agentId === "gemini") {
          setAgentId("default");
        }

        if (!status.default.available) {
          setStatusMessage("The default Mistral backend is down. Start localhost:8000 first.");
          return;
        }

        setStatusMessage(
          status.gemini.available
            ? "Both Mistral and Gemini backends are available."
            : "Gemini is unavailable until an ADK backend is running on localhost:8009.",
        );
      } catch {
        if (!isActive) {
          return;
        }

        setAgentOptions(DEFAULT_AGENT_OPTIONS);
        setAgentId("default");
        setStatusMessage("Could not check backend status. The UI is using Mistral by default.");
      }
    }

    loadAgentStatus();

    const intervalId = window.setInterval(loadAgentStatus, 5000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [agentId, statusVersion]);

  const selectedOption = agentOptions.find((option) => option.id === agentId) ?? agentOptions[0];

  function handleAgentChange(nextAgentId: AgentId) {
    const nextOption = agentOptions.find((option) => option.id === nextAgentId);

    if (nextOption && !nextOption.available) {
      setStatusMessage(`${nextOption.label} is unavailable. Start its backend first and click Refresh.`);
      return;
    }

    setAgentId(nextAgentId);
    setThreadId(crypto.randomUUID());
    setChatVersion((value) => value + 1);
  }

  function handleRefresh() {
    setStatusVersion((value) => value + 1);
    setThreadId(crypto.randomUUID());
    setChatVersion((value) => value + 1);
  }

  return (
    <div className="app-shell">
      <div className="agent-switcher">
        <div>
          <p className="agent-switcher__eyebrow">Active backend</p>
          <h1 className="agent-switcher__title">Choose the agent runtime</h1>
        </div>

        <label className="agent-switcher__field" htmlFor="agent-select">
          <span className="agent-switcher__field-label">Backend</span>
          <div className="agent-switcher__input-row">
            <select
              id="agent-select"
              className="agent-switcher__select"
              value={agentId}
              onChange={(event) => handleAgentChange(event.target.value as AgentId)}
            >
              {agentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}{option.available ? "" : " (backend unavailable)"}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="agent-switcher__refresh"
              onClick={handleRefresh}
            >
              Refresh
            </button>
          </div>
        </label>

        <div className="agent-switcher__card">
          <span className="agent-switcher__label">{selectedOption.label}</span>
          <span className="agent-switcher__description">{selectedOption.description}</span>
        </div>

        <p className="agent-switcher__hint">{statusMessage}</p>
      </div>

      <div className="chat-shell">
        <CopilotChat
          key={`${agentId}-${threadId}-${chatVersion}`}
          agentId={agentId}
          threadId={threadId}
        />
      </div>
    </div>
  );
}
