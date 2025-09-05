"""Tool implementations for MCP server."""

import logging
from typing import Any

from openai import OpenAI


async def search(
    query: str, openai_client: OpenAI, vector_store_id: str, logger: logging.Logger
) -> dict[str, list[dict[str, Any]]]:
    """Search vector store for relevant documents. Returns list with id, title, text snippet."""
    if not query or not query.strip():
        return {"results": []}

    if not openai_client:
        logger.error("OpenAI client not initialized - API key missing")
        raise ValueError("OpenAI API key is required for vector store search")

    if not vector_store_id:
        logger.error("Vector store ID not configured")
        raise ValueError("Vector store ID is required for search")

    try:
        logger.info(
            f"Searching vector store {vector_store_id} for query: '{query}'"
        )

        response = openai_client.vector_stores.search(
            vector_store_id=vector_store_id, query=query
        )

        results = []

        if hasattr(response, "data") and response.data:
            for i, item in enumerate(response.data):
                item_id = getattr(item, "file_id", f"vs_{i}")
                item_filename = getattr(item, "filename", f"Document {i + 1}")

                content_list = getattr(item, "content", [])
                text_content = ""
                if content_list and len(content_list) > 0:
                    first_content = content_list[0]
                    if hasattr(first_content, "text"):
                        text_content = first_content.text
                    elif isinstance(first_content, dict):
                        text_content = first_content.get("text", "")

                if not text_content:
                    text_content = "No content available"

                text_snippet = (
                    text_content[:200] + "..."
                    if len(text_content) > 200
                    else text_content
                )

                result = {
                    "id": item_id,
                    "title": item_filename,
                    "text": text_snippet,
                    "url": f"https://platform.openai.com/storage/files/{item_id}",
                }

                results.append(result)

        logger.info(f"Vector store search returned {len(results)} results")
        return {"results": results}

    except Exception as e:
        logger.error(f"Error during vector store search: {e}")
        return {"results": []}


async def fetch(
    id: str, openai_client: OpenAI, vector_store_id: str, logger: logging.Logger
) -> dict[str, Any]:
    """Retrieve complete document content by ID for analysis and citation."""
    if not id:
        raise ValueError("Document ID is required")

    if not openai_client:
        logger.error("OpenAI client not initialized - API key missing")
        raise ValueError("OpenAI API key is required for vector store file retrieval")

    if not vector_store_id:
        logger.error("Vector store ID not configured")
        raise ValueError("Vector store ID is required for file retrieval")

    try:
        logger.info(f"Fetching content from vector store for file ID: {id}")

        content_response = openai_client.vector_stores.files.content(
            vector_store_id=vector_store_id, file_id=id
        )

        file_info = openai_client.vector_stores.files.retrieve(
            vector_store_id=vector_store_id, file_id=id
        )

        file_content = ""
        if hasattr(content_response, "data") and content_response.data:
            content_parts = []
            for content_item in content_response.data:
                if hasattr(content_item, "text"):
                    content_parts.append(content_item.text)
            file_content = "\n".join(content_parts)
        else:
            file_content = "No content available"

        filename = getattr(file_info, "filename", f"Document {id}")

        result = {
            "id": id,
            "title": filename,
            "text": file_content,
            "url": f"https://platform.openai.com/storage/files/{id}",
            "metadata": None,
        }

        if hasattr(file_info, "attributes") and file_info.attributes:
            result["metadata"] = file_info.attributes

        logger.info(f"Successfully fetched vector store file: {id}")
        return result

    except Exception as e:
        logger.error(f"Error fetching vector store file {id}: {e}")
        return {
            "id": id,
            "title": f"Error retrieving document {id}",
            "text": f"Error: {str(e)}",
            "url": f"https://platform.openai.com/storage/files/{id}",
            "metadata": None,
        }
