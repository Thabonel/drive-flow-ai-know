"""Logging helpers for research agent demos.

This module provides utility functions and classes used for debug logging
and stderr filtering during streaming.
"""

from __future__ import annotations

import io
import sys


class FilteredStderr(io.TextIOBase):
    """A stderr wrapper that suppresses noisy tool conversion errors."""

    def write(self, s: str) -> int | None:  # type: ignore[override]
        if "Failed to convert ToolCallItem using to_input_item()" in s:
            return None
        return sys.__stderr__.write(s)


# Replace stderr with the filtered version so demos stay clean
sys.stderr = FilteredStderr()


def print_debug(event, seen: set[str]) -> None:
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


__all__ = ["FilteredStderr", "print_debug"]

