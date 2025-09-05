"""Demo launcher utilities for research agent demos."""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path
from typing import Callable

from agency_swarm import Agency

from .pdf import save_research_to_pdf
from .streaming import stream_demo


def copilot_demo(
    agency: Agency, save_pdf_func: Callable[[str, str], str] | None = None
) -> None:
    """Launch Copilot UI demo with optional PDF saving."""
    try:
        from agency_swarm.ui.demos.launcher import CopilotDemoLauncher

        if save_pdf_func:
            # Wrap the existing agency with PDF saving logic
            original_get_response = agency.get_response

            def _get_response_and_save(query: str, **kwargs):
                response = original_get_response(query, **kwargs)
                save_pdf_func(str(response), query)
                return response

            # Monkey-patch the method for the duration of this demo
            agency.get_response = _get_response_and_save  # type: ignore

        launcher = CopilotDemoLauncher()
        launcher.start(agency)
    except ImportError:
        print("❌ Copilot demo requires additional dependencies")
        print("Install with: pip install agency-swarm[copilot]")


def save_research_report(response, query, output_dir="reports"):
    """Save response to PDF with error handling."""
    try:
        pdf_path = save_research_to_pdf(
            research_content=str(response), query=query, output_dir=output_dir
        )
        print(f"\n📄 Research report saved to: {pdf_path}")
        return pdf_path
    except Exception as e:  # pragma: no cover - runtime guard
        print(f"\n❌ Error saving PDF: {e}")
        return None


def run_agency_demo(agency: Agency) -> None:
    """Run the agency demo, either in terminal or Copilot UI."""
    # Get the files directory path
    files_dir = Path("files")
    if files_dir.exists() and files_dir.is_dir():
        print(f"📁 Found files directory with {len(list(files_dir.glob('*')))} files")
        # Files will be available through MCP server

    # Show MCP configuration
    mcp_url = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")
    print(f"📡 MCP Server URL: {mcp_url}")
    if "ngrok" in mcp_url:
        print("✅ Using ngrok tunnel for public access")
    elif "localhost" in mcp_url:
        print(
            "⚠️  Using localhost - OK for local testing, but OpenAI API needs public URL (use ngrok)"
        )

    if len(sys.argv) > 1 and sys.argv[1] in ["--ui", "--copilot"]:
        print("🚀 Launching Copilot UI...")
        copilot_demo(agency, save_research_report)
    else:
        print("🚀 Launching Terminal Demo...")
        asyncio.run(stream_demo(agency, save_research_report))


__all__ = ["copilot_demo", "run_agency_demo", "save_research_report"]

