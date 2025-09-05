#!/usr/bin/env python3
"""
Sample MCP Server for Deep Research API Integration

This server implements the Model Context Protocol (MCP) with search and fetch
capabilities designed to work with ChatGPT's deep research feature.
"""

import logging
from typing import Any

from dotenv import load_dotenv
from fastmcp import FastMCP
from openai import OpenAI
from vector_utils import detect_vector_store_id
from tools import fetch as fetch_impl, search as search_impl

# Load environment variables from .env file
load_dotenv(override=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = OpenAI()

# Vector store ID (detected at runtime)
VECTOR_STORE_ID = None


def create_server():
    """Create MCP server with search and fetch tools."""
    mcp = FastMCP(
        name="Sample Deep Research MCP Server",
        instructions="""
        This MCP server provides search and document retrieval capabilities for deep research.
        Use the search tool to find relevant documents based on keywords, then use the fetch
        tool to retrieve complete document content with citations.
        """,
    )

    @mcp.tool()
    async def search(query: str) -> dict[str, list[dict[str, Any]]]:
        """Search vector store for relevant documents."""
        return await search_impl(query, openai_client, VECTOR_STORE_ID, logger)

    @mcp.tool()
    async def fetch(id: str) -> dict[str, Any]:
        """Retrieve complete document content by ID."""
        return await fetch_impl(id, openai_client, VECTOR_STORE_ID, logger)

    return mcp


def main():
    """Main function to start the MCP server."""
    global VECTOR_STORE_ID

    # Verify OpenAI client is initialized
    if not openai_client:
        logger.error(
            "OpenAI API key not found. Please set OPENAI_API_KEY environment variable."
        )
        raise ValueError("OpenAI API key is required")

    # Detect vector store ID with proper error handling
    try:
        VECTOR_STORE_ID = detect_vector_store_id()
        logger.info(f"Using vector store: {VECTOR_STORE_ID}")
    except ValueError as e:
        logger.error(f"Vector store detection failed: {e}")
        raise

    # Create the MCP server
    server = create_server()

    # Start server
    logger.info("Starting MCP server...")

    try:
        # Use direct SSE app method for FastMCP 2.2.0 compatibility on port 8001
        import uvicorn

        app = server.sse_app()
        uvicorn.run(app, host="127.0.0.1", port=8001)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        raise


if __name__ == "__main__":
    main()
