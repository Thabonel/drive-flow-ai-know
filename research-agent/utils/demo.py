import asyncio
import json
import os
import io
import sys
from typing import Callable

from agency_swarm import Agency

from .pdf import save_research_to_pdf

from pathlib import Path


class FilteredStderr(io.TextIOBase):
    def write(self, s):
        if "Failed to convert ToolCallItem using to_input_item()" in s:
            return  # Ignore this line
        sys.__stderr__.write(s)

sys.stderr = FilteredStderr()


def _print_debug(event, seen):
    """Enhanced debug logging to show key research events."""
    event_type = getattr(event, "type", None)

    # Show new event types once
    if (
        event_type
        and event_type not in seen
        and event_type != "response.output_text.delta"
    ):
        print(f"\n[DEBUG] Event: {event_type}")
        seen.add(event_type)

        # Show additional details for key events
        if event_type == "raw_response_event":
            if hasattr(event, "data") and hasattr(event.data, "item"):
                action = getattr(event.data.item, "action", None)
                if action and getattr(action, "type", None) == "search":
                    query_text = getattr(action, "query", "")
                    if query_text:
                        print(f"[DEBUG]   → Search Query: {query_text}")

        elif event_type == "handoff_call_item":
            if hasattr(event, "raw_item"):
                function_name = getattr(event.raw_item, "name", "Unknown")
                print(f"[DEBUG]   → Handoff: {function_name}")

    # Show agent switches
    elif event_type == "agent_updated_stream_event" and hasattr(event, "new_agent"):
        agent_name = event.new_agent.name
        print(f"\n[DEBUG] 🔄 Agent Switch: {agent_name}")

    # Show web searches
    elif event_type == "raw_response_event":
        if hasattr(event, "data") and hasattr(event.data, "item"):
            action = getattr(event.data.item, "action", None)
            if action and getattr(action, "type", None) == "search":
                query_text = getattr(action, "query", "")
                if query_text:
                    print(f"[DEBUG] 🔍 Web Search: {query_text}")


async def stream_demo(
    agency: Agency,
    save_pdf: Callable[[str, str], str] | None = None,
    debug: bool = True,
):
    """Interactive terminal demo following Agency Swarm patterns."""
    print("🌟 Research Agency Demo")
    print("Ask any research question. Type 'quit' to exit.")
    print("🔍 Debug logging enabled - you'll see key events during research.\n")

    while True:
        try:
            query = input("🔥 Research Query: ").strip()
            if query.lower() in ["quit", "exit", "q"]:
                print("👋 Goodbye!")
                break

            if not query:
                continue

            print(f"\n🔥 Researching: {query}")
            print("📡 Response: ", end="", flush=True)

            full_text = ""
            clarifying_text = ""
            current_agent = None
            seen_events = set()
            research_completed = False
            stream_error = None

            # Stream the response
            try:
                async for event in agency.get_response_stream(query):
                    if debug:
                        _print_debug(event, seen_events)

                    # Track agent switches for cleaner output
                    if getattr(
                        event, "type", None
                    ) == "agent_updated_stream_event" and hasattr(event, "new_agent"):
                        current_agent = event.new_agent.name
                        print(f"\n\n🔄 Switched to: {current_agent}")
                        print("─" * 50)
                        continue

                    # Handle text streaming
                    if hasattr(event, "data"):
                        data = event.data
                        if getattr(data, "type", "") == "response.output_text.delta":
                            delta = getattr(data, "delta", "")
                            if delta:
                                if current_agent == "Clarifying Questions Agent":
                                    # Accumulate clarifying text for JSON parsing
                                    clarifying_text += delta
                                else:
                                    print(delta, end="", flush=True)
                                    full_text += delta
                                    if current_agent == "Research Agent":
                                        research_completed = True

                    # Handle web search events
                    elif getattr(event, "type", None) == "raw_response_event":
                        if hasattr(event, "data") and hasattr(event.data, "item"):
                            action = getattr(event.data.item, "action", None)
                            if action and getattr(action, "type", None) == "search":
                                query_text = getattr(action, "query", "")
                                if query_text:
                                    print(f"\n🔍 [Web Search]: {query_text}")

                    # Handle errors
                    elif isinstance(event, dict) and event.get("event") == "error":
                        print(
                            f"\n❌ Error: {event.get('content', event.get('data', 'Unknown'))}"
                        )
                        break
            except Exception as e:
                stream_error = e

            # Handle clarification questions if we have them
            if clarifying_text.strip():
                try:
                    clarification_data = json.loads(clarifying_text.strip())
                    questions = clarification_data.get("questions", [])

                    if questions:
                        print("\n\n✏️ Please answer the following questions:\n")
                        answers = []
                        for q in questions:
                            ans = (
                                input(f"{q}\n   Your answer: ").strip()
                                or "No preference."
                            )
                            answers.append(f"**{q}**\n{ans}")

                        # Send clarifications and continue research
                        clarification_response = "\n\n".join(answers)
                        print("\n🔥 Continuing with clarifications...")
                        print("📡 Response: ", end="", flush=True)

                        # Reset for follow-up research
                        current_agent = None

                        try:
                            async for event in agency.get_response_stream(
                                clarification_response
                            ):
                                if debug:
                                    _print_debug(event, seen_events)

                                if getattr(
                                    event, "type", None
                                ) == "agent_updated_stream_event" and hasattr(
                                    event, "new_agent"
                                ):
                                    current_agent = event.new_agent.name
                                    print(f"\n\n🔄 Switched to: {current_agent}")
                                    print("─" * 50)
                                    continue

                                if hasattr(event, "data"):
                                    data = event.data
                                    if (
                                        getattr(data, "type", "")
                                        == "response.output_text.delta"
                                    ):
                                        delta = getattr(data, "delta", "")
                                        if delta:
                                            print(delta, end="", flush=True)
                                            full_text += delta
                                            if current_agent == "Research Agent":
                                                research_completed = True

                                elif (
                                    getattr(event, "type", None) == "raw_response_event"
                                ):
                                    if hasattr(event, "data") and hasattr(
                                        event.data, "item"
                                    ):
                                        action = getattr(
                                            event.data.item, "action", None
                                        )
                                        if (
                                            action
                                            and getattr(action, "type", None)
                                            == "search"
                                        ):
                                            query_text = getattr(action, "query", "")
                                            if query_text:
                                                print(
                                                    f"\n🔍 [Web Search]: {query_text}"
                                                )
                        except Exception as e:
                            stream_error = e
                except json.JSONDecodeError:
                    # If it's not JSON, treat as regular text
                    full_text += clarifying_text
                    research_completed = True

            if research_completed:
                print("\n✅ Research complete")
            else:
                print("\n⚠️ Process ended (research not completed)")

            # Only save to PDF if we have substantial research content
            if (
                save_pdf
                and full_text.strip()
                and research_completed
                and len(full_text) > 100
            ):
                save_pdf(full_text, query)

            print("\n" + "=" * 70)

            if stream_error:
                print(f"\n❌ Error during streaming: {stream_error}")

        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback

            traceback.print_exc()


def copilot_demo(agency: Agency, save_pdf_func: Callable[[str, str], str] | None = None):
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
    except Exception as e:
        print(f"\n❌ Error saving PDF: {e}")
        return None


def run_agency_demo(agency: Agency):
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
