import os
from dataclasses import dataclass


@dataclass
class CodexRunResult:
    output: str
    logs: str


class CodexAgentRunner:
    """
    Adapter layer for future Codex-over-MCP execution.

    The API surface is intentionally small: main.py calls run(), and this file
    owns the OpenAI Agents SDK / MCP details. That keeps the REST API stable
    while the execution backend evolves.
    """

    def __init__(self) -> None:
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        self.enable_codex_mcp = os.getenv("ENABLE_CODEX_MCP", "false").lower() == "true"
        self.codex_server_label = os.getenv("CODEX_MCP_SERVER_LABEL", "codex")

    async def run(self, *, agent: dict, prompt: str, tools: list[dict] | None = None) -> CodexRunResult:
        if self.enable_codex_mcp:
            return await self._run_with_agents_sdk(agent=agent, prompt=prompt, tools=tools or [])

        tool_names = ", ".join(tool["name"] for tool in tools or []) or "none"
        logs = [
            "Executor: local architecture mode.",
            "ENABLE_CODEX_MCP=false, so no external Codex MCP call was made.",
            f"Loaded tools: {tool_names}.",
            "Set ENABLE_CODEX_MCP=true after configuring the Codex MCP server.",
        ]
        output = (
            f"Agent '{agent['name']}' received the task.\n\n"
            f"Instructions:\n{agent['system_prompt']}\n\n"
            f"Task:\n{prompt}\n\n"
            "This is a functional placeholder result. The task lifecycle, logs, "
            "status updates, and persistence are active."
        )
        return CodexRunResult(output=output, logs="\n".join(logs) + "\n")

    async def _run_with_agents_sdk(
        self,
        *,
        agent: dict,
        prompt: str,
        tools: list[dict],
    ) -> CodexRunResult:
        try:
            from agents import Agent, Runner
        except ImportError as exc:
            raise RuntimeError(
                "openai-agents is not installed. Run: pip install -r requirements.txt"
            ) from exc

        sdk_agent = Agent(
            name=agent["name"],
            instructions=agent["system_prompt"],
            model=agent.get("model") or self.openai_model,
        )

        result = await Runner.run(sdk_agent, prompt)
        output = getattr(result, "final_output", None) or str(result)
        logs = (
            "Executor: OpenAI Agents SDK.\n"
            f"Model: {agent.get('model') or self.openai_model}\n"
            f"Registered tools in DB: {len(tools)}.\n"
            "Codex MCP hook point: configure tools/server in this adapter.\n"
        )
        return CodexRunResult(output=output, logs=logs)
