import { arrayBufferToBase64 } from '../_shared/base64Utils.ts';
import { CLAUDE_MODELS } from '../_shared/models.ts';
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts";

interface ParseResult {
  content: string;
  title?: string;
  pageCount?: number;
  hasImages?: boolean;
  extractedImages?: string[];
  metadata?: Record<string, any>;
}

export async function parseDocument(filePath: string, mimeType: string, fileName: string): Promise<ParseResult> {
  console.log(`Parsing document: ${fileName} (${mimeType})`);

  // Get file extension for additional type detection
  const ext = fileName.toLowerCase().split('.').pop() || '';

  // Handle Final Draft FDX files (XML-based screenwriting format)
  if (ext === 'fdx' || mimeType === 'application/x-final-draft') {
    return await parseFDX(filePath, fileName);
  }

  // Handle different document types
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    return await parsePDF(filePath, fileName);
  }

  if (mimeType.includes('wordprocessingml') || mimeType.includes('msword') || ext === 'docx' || ext === 'doc') {
    return await parseWord(filePath, fileName);
  }

  if (mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')) {
    return await parseExcel(filePath, fileName);
  }

  if (mimeType.includes('presentationml') || mimeType.includes('ms-powerpoint')) {
    return await parsePowerPoint(filePath, fileName);
  }

  if (mimeType.startsWith('audio/')) {
    return await parseAudio(filePath, fileName);
  }

  if (mimeType.startsWith('image/')) {
    return await parseImage(filePath, fileName);
  }

  if (mimeType === 'application/rtf' || ext === 'rtf') {
    return await parseRTF(filePath, fileName);
  }

  // Fallback for unsupported formats
  throw new Error(`Unsupported file type: ${mimeType} (${ext})`);
}

/**
 * Parse Final Draft FDX files (XML-based screenwriting format)
 * FDX structure: <FinalDraft><Content><Paragraph Type="Scene Heading|Action|Character|Dialogue">
 */
async function parseFDX(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    console.log('Parsing FDX (Final Draft) file...');
    const fileBytes = await Deno.readFile(filePath);

    // Detect encoding from XML declaration and BOM
    let text: string;
    try {
      // Try UTF-8 first (most common)
      text = new TextDecoder('utf-8').decode(fileBytes);

      // Check for UTF-16 BOM or encoding declaration
      if (text.charCodeAt(0) === 0xFEFF || text.includes('encoding="UTF-16"')) {
        text = new TextDecoder('utf-16').decode(fileBytes);
      }
    } catch (e) {
      // Fallback to UTF-8 with replacement characters
      text = new TextDecoder('utf-8', { fatal: false }).decode(fileBytes);
    }

    // Parse XML using DOMParser (now statically imported)
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');

    if (!doc) {
      throw new Error('Failed to parse FDX XML');
    }

    // Extract script title if available
    let title = fileName.replace(/\.[^/.]+$/, '');
    const titlePageElements = doc.querySelectorAll('TitlePage Content Paragraph Text');
    if (titlePageElements && titlePageElements.length > 0) {
      const possibleTitle = titlePageElements[0]?.textContent?.trim();
      if (possibleTitle && possibleTitle.length > 0 && possibleTitle.length < 100) {
        title = possibleTitle;
      }
    }

    // Extract paragraphs maintaining screenplay structure
    const paragraphs = doc.querySelectorAll('Content Paragraph');
    let content = '';
    let sceneCount = 0;

    for (const p of paragraphs) {
      const type = p.getAttribute('Type') || '';
      const textNodes = p.querySelectorAll('Text');
      let lineText = '';

      // Combine all text nodes in the paragraph
      for (const textNode of textNodes) {
        lineText += textNode.textContent || '';
      }

      lineText = lineText.trim();
      if (!lineText) continue;

      // Format based on screenplay element type
      switch (type) {
        case 'Scene Heading':
          content += `\n\n${lineText.toUpperCase()}\n\n`;
          sceneCount++;
          break;
        case 'Character':
          content += `\n                    ${lineText.toUpperCase()}\n`;
          break;
        case 'Dialogue':
          content += `          ${lineText}\n`;
          break;
        case 'Parenthetical':
          content += `               (${lineText.replace(/^\(|\)$/g, '')})\n`;
          break;
        case 'Action':
        case 'General':
          content += `${lineText}\n\n`;
          break;
        case 'Transition':
          content += `\n                                        ${lineText.toUpperCase()}\n\n`;
          break;
        default:
          content += `${lineText}\n`;
      }
    }

    console.log(`FDX parsing complete: ${sceneCount} scenes found`);

    return {
      content: content.trim(),
      title,
      metadata: {
        type: 'fdx',
        format: 'Final Draft',
        originalName: fileName,
        sceneCount
      }
    };
  } catch (error) {
    console.error('FDX parsing error:', error);
    throw new Error(`Failed to parse Final Draft file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse RTF (Rich Text Format) files by stripping control sequences
 */
async function parseRTF(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    console.log('Parsing RTF file...');
    const fileBytes = await Deno.readFile(filePath);
    const text = new TextDecoder('utf-8').decode(fileBytes);

    // Check if it's a valid RTF file
    if (!text.startsWith('{\\rtf')) {
      throw new Error('Invalid RTF file format');
    }

    // Parse RTF content
    let content = text;

    // Track nesting depth to handle groups properly
    let depth = 0;
    let result = '';
    let i = 0;
    let skipGroup = false;
    let skipGroupDepth = 0;

    while (i < content.length) {
      const char = content[i];

      if (char === '{') {
        depth++;
        // Check if this is a group to skip (like fonts, colors, etc.)
        const groupStart = content.substring(i, i + 20);
        if (groupStart.match(/^\{\\(fonttbl|colortbl|stylesheet|info|pict|object|footnote|header|footer)/)) {
          skipGroup = true;
          skipGroupDepth = depth;
        }
        i++;
        continue;
      }

      if (char === '}') {
        if (skipGroup && depth === skipGroupDepth) {
          skipGroup = false;
        }
        depth--;
        i++;
        continue;
      }

      if (skipGroup) {
        i++;
        continue;
      }

      if (char === '\\') {
        // Handle control words
        const remaining = content.substring(i);

        // Line and paragraph breaks
        if (remaining.startsWith('\\par')) {
          result += '\n\n';
          i += remaining.match(/^\\par\d*\s?/)?.[0].length || 4;
          continue;
        }
        if (remaining.startsWith('\\line')) {
          result += '\n';
          i += remaining.match(/^\\line\d*\s?/)?.[0].length || 5;
          continue;
        }
        if (remaining.startsWith('\\tab')) {
          result += '\t';
          i += remaining.match(/^\\tab\d*\s?/)?.[0].length || 4;
          continue;
        }

        // Non-breaking space
        if (remaining.startsWith('\\~')) {
          result += ' ';
          i += 2;
          continue;
        }

        // Hex character escape \'XX
        const hexMatch = remaining.match(/^\\'([0-9a-fA-F]{2})/);
        if (hexMatch) {
          const charCode = parseInt(hexMatch[1], 16);
          result += String.fromCharCode(charCode);
          i += 4;
          continue;
        }

        // Unicode character \uN
        const unicodeMatch = remaining.match(/^\\u(-?\d+)\??/);
        if (unicodeMatch) {
          let charCode = parseInt(unicodeMatch[1], 10);
          if (charCode < 0) charCode += 65536; // Handle negative values
          result += String.fromCharCode(charCode);
          i += unicodeMatch[0].length;
          // Skip the replacement character if present
          if (content[i] === '?') i++;
          continue;
        }

        // Skip other control words
        const controlMatch = remaining.match(/^\\[a-z]+(-?\d+)?\s?/i);
        if (controlMatch) {
          i += controlMatch[0].length;
          continue;
        }

        // Escaped special characters
        if (remaining[1] === '\\' || remaining[1] === '{' || remaining[1] === '}') {
          result += remaining[1];
          i += 2;
          continue;
        }

        i++;
        continue;
      }

      // Regular character
      if (char !== '\r' && char !== '\n') {
        result += char;
      }
      i++;
    }

    // Clean up the result
    const cleanedContent = result
      .replace(/\n{3,}/g, '\n\n')  // Limit consecutive newlines
      .replace(/[ \t]+\n/g, '\n')  // Remove trailing spaces
      .replace(/\n[ \t]+/g, '\n')  // Remove leading spaces on lines
      .trim();

    console.log(`RTF parsing complete: ${cleanedContent.length} characters extracted`);

    return {
      content: cleanedContent,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'rtf',
        originalName: fileName,
        originalSize: fileBytes.length
      }
    };
  } catch (error) {
    console.error('RTF parsing error:', error);
    throw new Error(`Failed to parse RTF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse PDF files using Claude Vision API
 */
async function parsePDF(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    console.log('Parsing PDF file using Claude Vision...');
    const fileBytes = await Deno.readFile(filePath);

    // Convert to base64
    const base64 = arrayBufferToBase64(fileBytes);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    console.log(`Sending PDF to Claude Vision (${Math.round(fileBytes.length / 1024)}KB)...`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.PRIMARY,
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: [{
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64
            }
          }, {
            type: 'text',
            text: 'Extract ALL text content from this PDF document. Preserve the original formatting, paragraph structure, headings, and layout as much as possible. Include all text from every page. Return ONLY the extracted text content, without any commentary or analysis.'
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.content || !result.content[0] || !result.content[0].text) {
      throw new Error('Unexpected response format from Claude API');
    }

    const extractedContent = result.content[0].text;
    console.log(`PDF parsing complete: ${extractedContent.length} characters extracted`);

    return {
      content: extractedContent,
      title: fileName.replace(/\.[^/.]+$/, ''),
      hasImages: true, // PDF might have images
      metadata: {
        type: 'pdf',
        originalName: fileName,
        originalSize: fileBytes.length,
        extractionMethod: 'claude-vision'
      }
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function parseWord(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    // For DOCX files, we can use Claude Vision as well
    console.log('Parsing Word document using Claude Vision...');
    const fileBytes = await Deno.readFile(filePath);
    const base64 = arrayBufferToBase64(fileBytes);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CLAUDE_MODELS.PRIMARY,
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: [{
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              data: base64
            }
          }, {
            type: 'text',
            text: 'Extract ALL text content from this Word document. Preserve the original formatting, paragraph structure, and headings. Return ONLY the extracted text content.'
          }]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    const extractedContent = result.content?.[0]?.text || '';

    return {
      content: extractedContent,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'word',
        originalName: fileName,
        extractionMethod: 'claude-vision'
      }
    };
  } catch (error) {
    console.error('Word parsing error:', error);
    throw error;
  }
}

async function parseExcel(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    return {
      content: `Excel Spreadsheet: ${fileName}\n\nThis is a Microsoft Excel file. Content extraction will be implemented with a spreadsheet parsing library.`,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'excel',
        originalName: fileName
      }
    };
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw error;
  }
}

async function parsePowerPoint(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    return {
      content: `PowerPoint Presentation: ${fileName}\n\nThis is a Microsoft PowerPoint file. Content extraction will be implemented with a presentation parsing library.`,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'powerpoint',
        originalName: fileName
      }
    };
  } catch (error) {
    console.error('PowerPoint parsing error:', error);
    throw error;
  }
}

async function parseAudio(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    return {
      content: `Audio File: ${fileName}\n\nThis is an audio file. Speech-to-text transcription will be implemented with an audio processing service.`,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'audio',
        originalName: fileName
      }
    };
  } catch (error) {
    console.error('Audio parsing error:', error);
    throw error;
  }
}

async function parseImage(filePath: string, fileName: string): Promise<ParseResult> {
  try {
    return {
      content: `Image File: ${fileName}\n\nThis is an image file. OCR text extraction will be implemented with an image processing service.`,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'image',
        originalName: fileName
      }
    };
  } catch (error) {
    console.error('Image parsing error:', error);
    throw error;
  }
}
