"""Modern PDF Generation Utilities for Deep Research Workflow"""

import os
import re
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import markdown
from weasyprint import CSS, HTML

from .pdf_utils import (
    URLReference,
    create_html_document,
    enhance_html_with_bs4,
    extract_domain,
    get_modern_css,
)

class ModernPDFGenerator:
    """Modern PDF generator with full markdown support"""
    def __init__(self):
        self.url_references: Dict[str, URLReference] = {}
        self.reference_counter = 1

    def save_research_to_pdf(
        self,
        research_content: str,
        query: str = "Research Report",
        output_dir: str = "reports",
        filename: str = None,
    ) -> str:
        """
        Save research content to a professionally formatted PDF.

        Args:
            research_content: The research text to save (markdown format)
            query: Original research query for the title
            output_dir: Directory to save the PDF
            filename: Custom filename (optional)

        Returns:
            str: Path to the saved PDF file
        """
        # Create output directory
        Path(output_dir).mkdir(exist_ok=True)

        # Generate filename
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_query = (
                "".join(c for c in query[:50] if c.isalnum() or c in (" ", "-", "_"))
                .strip()
                .replace(" ", "_")
            )
            filename = f"research_report_{safe_query}_{timestamp}.pdf"

        if not filename.endswith(".pdf"):
            filename += ".pdf"

        filepath = os.path.join(output_dir, filename)

        # Parse markdown and extract URLs
        html_content, references = self._markdown_to_html_with_references(
            research_content
        )

        # Create complete HTML document
        full_html = create_html_document(html_content, query, references)

        # Generate PDF
        html_doc = HTML(string=full_html)
        css = CSS(string=get_modern_css())

        with tempfile.TemporaryDirectory() as temp_dir:
            html_doc.write_pdf(filepath, stylesheets=[css])

        return filepath

    def _markdown_to_html_with_references(
        self, content: str
    ) -> Tuple[str, List[URLReference]]:
        """Convert markdown to HTML while extracting URL references"""

        # Initialize markdown processor with extensions
        md = markdown.Markdown(
            extensions=[
                "tables",
                "toc",
                "codehilite",
                "fenced_code",
                "nl2br",
                "attr_list",
                "def_list",
                "footnotes",
                "smarty",
                "sane_lists",
            ],
            extension_configs={
                "codehilite": {"css_class": "highlight", "use_pygments": True},
                "toc": {"permalink": False, "title": "Table of Contents"},
            },
        )

        # Extract and replace URLs with numbered references
        processed_content = self._process_urls_in_markdown(content)

        # Convert to HTML
        html = md.convert(processed_content)

        # Enhance HTML with BeautifulSoup
        html = enhance_html_with_bs4(html)

        return html, list(self.url_references.values())

    def _process_urls_in_markdown(self, content: str) -> str:
        """Process URLs in markdown content and create numbered references"""

        # Reset references for each document
        self.url_references = {}
        self.reference_counter = 1

        # Pattern to match markdown links [text](url)
        link_pattern = r"\[([^\]]*)\]\(([^)]+)\)"

        def replace_link(match):
            link_text = match.group(1)
            url = match.group(2)

            # Skip internal links (anchors)
            if url.startswith("#"):
                return match.group(0)

            # Add to references if not already present
            if url not in self.url_references:
                self.url_references[url] = URLReference(
                    url=url,
                    title=link_text or extract_domain(url),
                    number=self.reference_counter,
                )
                self.reference_counter += 1

            ref = self.url_references[url]
            # Simple approach: just show reference number
            return f"[{ref.number}]"

        # Replace all markdown links
        processed = re.sub(link_pattern, replace_link, content)

        # Handle bare URLs that aren't already processed
        url_pattern = r'(?<!\[)\b(?:https?://|www\.)[^\s<>"\[\]]+(?!\])'

        def replace_bare_url(match):
            url = match.group(0)
            if url not in self.url_references:
                self.url_references[url] = URLReference(
                    url=url,
                    title=extract_domain(url),
                    number=self.reference_counter,
                )
                self.reference_counter += 1

            ref = self.url_references[url]
            return f"[{ref.number}]"

        processed = re.sub(url_pattern, replace_bare_url, processed)

        return processed


# Create a single instance for use throughout the application
pdf_generator = ModernPDFGenerator()


def save_research_to_pdf(
    research_content: str,
    query: str = "Research Report",
    output_dir: str = "reports",
    filename: str = None,
) -> str:
    """
    Save research content to a professionally formatted PDF.

    Args:
        research_content: The research text to save (markdown format)
        query: Original research query for the title
        output_dir: Directory to save the PDF (default: 'reports')
        filename: Custom filename (optional, auto-generated if not provided)

    Returns:
        str: Path to the saved PDF file
    """
    return pdf_generator.save_research_to_pdf(
        research_content=research_content,
        query=query,
        output_dir=output_dir,
        filename=filename,
    )
