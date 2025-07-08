#!/usr/bin/env python3
"""Test BasicResearchAgency with configurable MCP URL."""

import asyncio
import os
from pathlib import Path

# Get the MCP server URL from environment or use default
MCP_SERVER_URL = os.getenv("MCP_SERVER_URL", "http://localhost:8001/sse")

print(f"Using MCP Server URL: {MCP_SERVER_URL}")

# Temporarily set the MCP URL for testing
os.environ["_TEST_MCP_URL"] = MCP_SERVER_URL

# Now import and run the agency
import sys

sys.path.append(str(Path(__file__).parent))

from BasicResearchAgency.agency import agency
from utils import stream_demo


async def test_agency():
    """Test the agency with a simple query."""
    print("\n🧪 Testing BasicResearchAgency...")
    print("=" * 50)

    # Test with a simple query
    test_query = "What is helium-3?"
    print(f"Query: {test_query}\n")

    try:
        # Create a mock conversation
        from agency_swarm import Agency

        response = await agency.get_response(test_query)
        print(f"✅ Success! Response received")
        print(f"Response preview: {str(response)[:200]}...")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("💡 Usage:")
    print("  Default (localhost): python test_agency_with_env.py")
    print(
        "  With ngrok: MCP_SERVER_URL=https://your-ngrok-url.ngrok-free.app/sse python test_agency_with_env.py"
    )
    print()

    asyncio.run(test_agency())
