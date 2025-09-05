"""Helper utilities for PDF generation."""

import logging
from datetime import datetime
from typing import List
from urllib.parse import urlparse

from bs4 import BeautifulSoup


class URLReference:
    """Represents a URL reference with title and number."""

    def __init__(self, url: str, title: str = "", number: int = 1):
        self.url = url
        self.title = title or extract_domain(url)
        self.number = number

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"[{self.number}] {self.title}: {self.url}"


def extract_domain(url: str) -> str:
    """Extract domain name from URL."""
    try:
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        parsed = urlparse(url)
        return parsed.netloc.replace("www.", "") or url
    except Exception:
        return url


def enhance_html_with_bs4(html: str) -> str:
    """Enhance HTML with BeautifulSoup for better formatting."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        for table in soup.find_all("table"):
            table["class"] = table.get("class", []) + ["research-table"]
        for blockquote in soup.find_all("blockquote"):
            blockquote["class"] = blockquote.get("class", []) + ["research-quote"]
        for pre in soup.find_all("pre"):
            pre["class"] = pre.get("class", []) + ["research-code"]
        return str(soup)
    except Exception as e:  # pragma: no cover - best effort
        logging.warning(f"HTML enhancement failed: {e}")
        return html


def create_html_document(content: str, query: str, references: List[URLReference]) -> str:
    """Create complete HTML document with header, content, and references."""
    references_html = ""
    if references:
        references_html = "<div class='references'><h2>References</h2><ol class='references-list'>"
        for ref in sorted(references, key=lambda x: x.number):
            references_html += (
                f"<li><strong>{ref.title}</strong><br/><a href='{ref.url}'>{ref.url}</a></li>"
            )
        references_html += "</ol></div>"
    timestamp = datetime.now().strftime("%B %d, %Y at %I:%M %p")
    return f"""
<!DOCTYPE html>
<html lang=\"en\">
<head>
    <meta charset=\"UTF-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
    <title>Deep Research Report</title>
</head>
<body>
    <div class=\"document\">
        <header class=\"document-header\">
            <h1 class=\"document-title\">Deep Research Report</h1>
            <p class=\"document-query\"><strong>Query:</strong> {query}</p>
            <p class=\"document-timestamp\">Generated on {timestamp}</p>
        </header>
        <main class=\"document-content\">{content}</main>
        {references_html}
    </div>
</body>
</html>
"""


def get_modern_css() -> str:
    """Get modern CSS styles for professional PDF formatting."""
    return """@page { size: A4; margin: 2cm; }
body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; color: #2c3e50; }
.document-header { text-align: center; margin-bottom: 2cm; padding-bottom: 1cm; border-bottom: 2px solid #3498db; }
.document-title { font-size: 24pt; color: #2c3e50; margin-bottom: 0.5cm; }
.document-query { font-size: 14pt; color: #34495e; margin-bottom: 0.3cm; }
.document-timestamp { font-size: 12pt; color: #7f8c8d; font-style: italic; }
.document-content { margin-bottom: 2cm; }
h1, h2, h3, h4, h5, h6 { color: #2c3e50; margin-top: 1.5em; margin-bottom: 0.5em; }
h1 { font-size: 20pt; } h2 { font-size: 16pt; } h3 { font-size: 14pt; }
p { margin-bottom: 1em; text-align: justify; }
ul, ol { margin-bottom: 1em; padding-left: 1.5em; }
.research-table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 10pt; }
.research-table th, .research-table td { border: 1px solid #bdc3c7; padding: 0.5em; text-align: left; }
.research-table th { background-color: #ecf0f1; font-weight: bold; }
.research-table tr:nth-child(even) { background-color: #f8f9fa; }
.research-quote { border-left: 4px solid #3498db; padding-left: 1em; margin: 1em 0; font-style: italic; color: #34495e; }
.research-code { background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 4px; padding: 1em; font-family: monospace; font-size: 9pt; }
code { background-color: #f8f9fa; padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 9pt; }
.references { margin-top: 2cm; padding-top: 1cm; border-top: 1px solid #bdc3c7; }
.references h2 { color: #2c3e50; font-size: 16pt; margin-bottom: 1em; }
.references-list { font-size: 10pt; line-height: 1.4; }
.references-list li { margin-bottom: 0.8em; padding-bottom: 0.5em; border-bottom: 1px solid #ecf0f1; }
.references-list a { color: #3498db; text-decoration: none; word-break: break-all; }
"""
