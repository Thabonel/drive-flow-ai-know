import { arrayBufferToBase64 } from '../_shared/base64Utils.ts';
import { CLAUDE_MODELS } from '../_shared/models.ts';

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

    // Parse FDX using regex (DOMParser doesn't support XML in Deno Deploy)
    let title = fileName.replace(/\.[^/.]+$/, '');
    let content = '';
    let sceneCount = 0;

    // Extract title from TitlePage if available
    const titleMatch = text.match(/<TitlePage>[\s\S]*?<Text>(.*?)<\/Text>/);
    if (titleMatch && titleMatch[1].trim().length > 0 && titleMatch[1].trim().length < 100) {
      title = titleMatch[1].trim();
    }

    // Extract all paragraphs with their type and text content
    const paragraphRegex = /<Paragraph[^>]*Type="([^"]*)"[^>]*>[\s\S]*?<\/Paragraph>/g;
    const textRegex = /<Text>(.*?)<\/Text>/g;

    let match;
    while ((match = paragraphRegex.exec(text)) !== null) {
      const type = match[1];
      const paragraphContent = match[0];

      // Extract all text nodes within this paragraph
      let lineText = '';
      let textMatch;
      while ((textMatch = textRegex.exec(paragraphContent)) !== null) {
        lineText += textMatch[1];
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
        case 'Shot':
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
    console.log('Parsing Word document using mammoth...');

    // Import mammoth library dynamically
    const mammoth = await import('npm:mammoth@1.6.0');

    const fileBytes = await Deno.readFile(filePath);
    const arrayBuffer = fileBytes.buffer;

    // Use mammoth to extract text from DOCX
    const result = await mammoth.extractRawText({ arrayBuffer });
    const extractedContent = result.value || '';

    if (result.messages && result.messages.length > 0) {
      console.log('Mammoth parsing warnings:', result.messages);
    }

    console.log(`Word document parsed: ${extractedContent.length} characters extracted`);

    return {
      content: extractedContent,
      title: fileName.replace(/\.[^/.]+$/, ''),
      metadata: {
        type: 'word',
        originalName: fileName,
        extractionMethod: 'mammoth'
      }
    };
  } catch (error) {
    console.error('Word parsing error:', error);
    throw new Error(`Failed to parse Word document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
