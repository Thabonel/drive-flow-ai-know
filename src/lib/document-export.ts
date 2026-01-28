import { Document, Paragraph, TextRun, HeadingLevel, Packer, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';
import { parseContentForWord, ParsedElement } from './content-parser';

/**
 * Generate and download a Word document (.docx)
 * Uses Navy/Gold theme styling to match PDF exports
 */
export const generateWordDocument = async (
  title: string,
  category: string,
  tags: string[],
  content: string,
  metadata: any
): Promise<void> => {
  // Parse content into structured elements
  const parsedContent = parseContentForWord(content, metadata);

  // Convert parsed elements to Word document paragraphs
  const contentParagraphs = convertToWordParagraphs(parsedContent);

  // Create Word document with Navy/Gold theme
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title with gold underline
          new Paragraph({
            text: title,
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
            thematicBreak: false,
            border: {
              bottom: {
                color: 'FFC300', // Gold
                space: 1,
                style: 'single',
                size: 18,
              },
            },
          }),

          // Metadata section with light gray background
          new Paragraph({
            children: [
              new TextRun({ text: 'Category: ', bold: true }),
              new TextRun(category || 'Uncategorized'),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Tags: ', bold: true }),
              new TextRun(tags.length > 0 ? tags.join(', ') : 'None'),
            ],
            spacing: { after: 300 },
          }),

          // Document content
          ...contentParagraphs,
        ],
      },
    ],
  });

  // Generate blob and trigger download
  const blob = await Packer.toBlob(doc);
  const fileName = sanitizeFilename(title);
  saveAs(blob, `${fileName}.docx`);
};

/**
 * Convert parsed elements to Word document paragraphs
 */
const convertToWordParagraphs = (elements: ParsedElement[]): Paragraph[] => {
  const paragraphs: Paragraph[] = [];

  for (const element of elements) {
    switch (element.type) {
      case 'heading':
        const headingLevel = element.level === 1 ? HeadingLevel.HEADING_1 :
                            element.level === 2 ? HeadingLevel.HEADING_2 :
                            element.level === 3 ? HeadingLevel.HEADING_3 :
                            element.level === 4 ? HeadingLevel.HEADING_4 :
                            element.level === 5 ? HeadingLevel.HEADING_5 :
                            HeadingLevel.HEADING_6;

        paragraphs.push(
          new Paragraph({
            text: element.text,
            heading: headingLevel,
            spacing: { before: 300, after: 200 },
          })
        );
        break;

      case 'paragraph':
        paragraphs.push(
          new Paragraph({
            text: element.text,
            spacing: { after: 200 },
            alignment: AlignmentType.JUSTIFIED,
          })
        );
        break;

      case 'list':
        // Add list items
        if (element.children) {
          for (const item of element.children) {
            paragraphs.push(
              new Paragraph({
                text: item.text,
                bullet: {
                  level: 0,
                },
                spacing: { after: 100 },
              })
            );
          }
        }
        break;

      case 'code':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.text,
                font: 'Courier New',
                size: 20, // 10pt in half-points
              }),
            ],
            spacing: { after: 200 },
            shading: {
              fill: 'F5F5F5', // Light gray background
            },
          })
        );
        break;

      case 'bold':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.text,
                bold: true,
              }),
            ],
            spacing: { after: 200 },
          })
        );
        break;

      case 'italic':
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: element.text,
                italics: true,
              }),
            ],
            spacing: { after: 200 },
          })
        );
        break;

      default:
        // Fallback: treat as plain paragraph
        paragraphs.push(
          new Paragraph({
            text: element.text,
            spacing: { after: 200 },
          })
        );
        break;
    }
  }

  return paragraphs;
};

/**
 * Sanitize filename for safe file system usage
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-z0-9]/gi, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
    .substring(0, 100); // Limit length
};
