import { shouldRenderAsHTML } from './content-detection';

export interface ParsedElement {
  type: 'heading' | 'paragraph' | 'list' | 'list-item' | 'bold' | 'italic' | 'code' | 'text';
  level?: number;
  text: string;
  children?: ParsedElement[];
  style?: any;
}

/**
 * Parse content for PDF generation
 * Converts HTML or Markdown to structured elements for @react-pdf/renderer
 */
export const parseContentForPDF = (content: string, metadata: any): ParsedElement[] => {
  const isHTML = shouldRenderAsHTML(content, metadata);

  if (isHTML) {
    return parseHTMLContent(content);
  } else {
    return parseMarkdownContent(content);
  }
};

/**
 * Parse content for Word document generation
 * Converts HTML or Markdown to structured elements for docx library
 */
export const parseContentForWord = (content: string, metadata: any): ParsedElement[] => {
  // Same parsing logic as PDF, but we'll transform it differently for Word
  return parseContentForPDF(content, metadata);
};

/**
 * Parse HTML content into structured elements
 */
const parseHTMLContent = (html: string): ParsedElement[] => {
  const elements: ParsedElement[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const processNode = (node: Node): ParsedElement | null => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) {
          return {
            type: 'text',
            text,
          };
        }
        return null;
      }

      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();

        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6':
            return {
              type: 'heading',
              level: parseInt(tagName[1]),
              text: element.textContent || '',
            };

          case 'p':
            return {
              type: 'paragraph',
              text: element.textContent || '',
            };

          case 'ul':
          case 'ol':
            const listItems: ParsedElement[] = [];
            element.querySelectorAll('li').forEach((li) => {
              listItems.push({
                type: 'list-item',
                text: li.textContent || '',
              });
            });
            return {
              type: 'list',
              text: '',
              children: listItems,
            };

          case 'strong':
          case 'b':
            return {
              type: 'bold',
              text: element.textContent || '',
            };

          case 'em':
          case 'i':
            return {
              type: 'italic',
              text: element.textContent || '',
            };

          case 'code':
          case 'pre':
            return {
              type: 'code',
              text: element.textContent || '',
            };

          default:
            // For other elements, try to extract text content
            const text = element.textContent?.trim();
            if (text) {
              return {
                type: 'paragraph',
                text,
              };
            }
            return null;
        }
      }

      return null;
    };

    // Process all child nodes of body
    doc.body.childNodes.forEach((node) => {
      const parsed = processNode(node);
      if (parsed) {
        elements.push(parsed);
      }
    });

  } catch (error) {
    console.error('Error parsing HTML content:', error);
    // Fallback: treat as plain text
    elements.push({
      type: 'paragraph',
      text: html,
    });
  }

  return elements;
};

/**
 * Parse Markdown content into structured elements
 */
const parseMarkdownContent = (markdown: string): ParsedElement[] => {
  const elements: ParsedElement[] = [];
  const lines = markdown.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      i++;
      continue;
    }

    // Headings
    if (trimmedLine.startsWith('#')) {
      const match = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        elements.push({
          type: 'heading',
          level: match[1].length,
          text: match[2],
        });
        i++;
        continue;
      }
    }

    // Unordered lists
    if (trimmedLine.match(/^[-*+]\s+/)) {
      const listItems: ParsedElement[] = [];
      while (i < lines.length && lines[i].trim().match(/^[-*+]\s+/)) {
        const itemText = lines[i].trim().replace(/^[-*+]\s+/, '');
        listItems.push({
          type: 'list-item',
          text: itemText,
        });
        i++;
      }
      elements.push({
        type: 'list',
        text: '',
        children: listItems,
      });
      continue;
    }

    // Ordered lists
    if (trimmedLine.match(/^\d+\.\s+/)) {
      const listItems: ParsedElement[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '');
        listItems.push({
          type: 'list-item',
          text: itemText,
        });
        i++;
      }
      elements.push({
        type: 'list',
        text: '',
        children: listItems,
      });
      continue;
    }

    // Code blocks
    if (trimmedLine.startsWith('```')) {
      const codeLines: string[] = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      elements.push({
        type: 'code',
        text: codeLines.join('\n'),
      });
      continue;
    }

    // Regular paragraph - handle inline formatting
    const processedText = processInlineMarkdown(trimmedLine);
    elements.push({
      type: 'paragraph',
      text: processedText,
    });
    i++;
  }

  return elements;
};

/**
 * Process inline markdown formatting (bold, italic, code)
 * Removes markdown syntax and returns plain text
 * (PDF/Word libraries will handle styling separately)
 */
const processInlineMarkdown = (text: string): string => {
  // Remove bold syntax (**text** or __text__)
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');

  // Remove italic syntax (*text* or _text_)
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove inline code syntax (`code`)
  text = text.replace(/`(.+?)`/g, '$1');

  // Remove links [text](url)
  text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');

  return text;
};
