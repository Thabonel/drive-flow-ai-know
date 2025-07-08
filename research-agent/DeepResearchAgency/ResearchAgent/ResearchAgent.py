import os

from agency_swarm import Agent
from agents import HostedMCPTool, WebSearchTool


class ResearchAgent(Agent):
    def __init__(self):
        # Get MCP server URL from environment or use default
        mcp_server_url = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")

        super().__init__(
            name="Research Agent",
            model="o4-mini-deep-research-2025-06-26",
            instructions="Perform deep empirical research based on the user's instructions.",
            tools=[
                WebSearchTool(),
                HostedMCPTool(
                    tool_config={
                        "type": "mcp",
                        "server_label": "file_search",
                        "server_url": mcp_server_url,
                        "require_approval": "never",
                    }
                ),
            ],
        )
