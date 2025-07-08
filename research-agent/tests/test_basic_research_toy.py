#!/usr/bin/env python3
"""
Simple toy test for BasicResearchAgency using agency.get_response()
Tests internal file search functionality without streaming.
"""

import asyncio
import os
import sys
from pathlib import Path

# Set MCP server URL to ngrok public URL (required for OpenAI API)
os.environ["MCP_SERVER_URL"] = (
    "https://1071-2001-818-e31f-b200-5c76-b9ff-2053-af2.ngrok-free.app/sse"
)

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import after setting environment variable
from agency_swarm import Agency, Agent
from agents import HostedMCPTool, WebSearchTool


def create_test_agency():
    """Create a fresh agency instance for testing"""
    # Get MCP server URL from environment
    MCP_SERVER_URL = os.getenv("MCP_SERVER_URL")

    # Basic Research Agent - o4-mini-deep-research with web search
    research_agent = Agent(
        name="Research Agent",
        model="o4-mini-deep-research-2025-06-26",
        tools=[
            WebSearchTool(),
            HostedMCPTool(
                tool_config={
                    "type": "mcp",
                    "server_label": "file_search",
                    "server_url": MCP_SERVER_URL,
                    "require_approval": "never",
                }
            ),
        ],
        instructions="You perform deep empirical research based on the user's question.",
    )

    # Create the agency
    return Agency(research_agent)


async def test_basic_research_toy():
    """Test BasicResearchAgency with simple get_response() call"""

    print("🧪 Testing BasicResearchAgency with toy example...")
    print("=" * 60)

    # Create fresh agency with correct MCP URL
    agency = create_test_agency()

    # Test query about the files in /files directory
    query = "What can you tell me about TechCorp Solutions based on the internal documents? Include their revenue, industry, and key products."

    print(f"📝 Query: {query}")
    print("-" * 60)

    # Use get_response() - no streaming, just get the result
    response = await agency.get_response(query)

    print("🤖 Response:")
    print(response)
    print("=" * 60)

    # Basic validation
    assert response is not None, "Response should not be None"
    assert len(str(response)) > 0, "Response should not be empty"

    # Check if the response contains information from our files
    response_str = str(response).lower()
    assert "techcorp" in response_str, "Response should mention TechCorp"

    print("✅ Test passed! BasicResearchAgency successfully used internal documents.")
    return response


async def test_market_research_toy():
    """Test BasicResearchAgency asking about market research"""

    print("\n🧪 Testing market research query...")
    print("=" * 60)

    # Create fresh agency with correct MCP URL
    agency = create_test_agency()

    # Test query about market research
    query = "What does our market research say about the AI industry size and growth rate in 2024?"

    print(f"📝 Query: {query}")
    print("-" * 60)

    # Use get_response() - no streaming, just get the result
    response = await agency.get_response(query)

    print("🤖 Response:")
    print(response)
    print("=" * 60)

    # Basic validation
    assert response is not None, "Response should not be None"
    response_str = str(response).lower()
    assert "190b" in response_str or "190" in response_str, (
        "Response should mention market size"
    )

    print("✅ Test passed! BasicResearchAgency found market research data.")
    return response


async def main():
    """Main async function to run all tests"""
    print("🚀 Running BasicResearchAgency Toy Tests")
    print("🔍 Testing internal file search with get_response()")
    print(f"📡 MCP Server URL: {os.environ.get('MCP_SERVER_URL')}")
    print()

    try:
        # Test 1: Company info
        response1 = await test_basic_research_toy()

        # Test 2: Market research
        response2 = await test_market_research_toy()

        print("\n🎉 All tests passed!")
        print("✅ BasicResearchAgency successfully uses internal documents")
        print("✅ MCP server integration working")
        print("✅ No streaming issues")

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
