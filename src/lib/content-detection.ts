/**
 * CRITICAL UTILITY - DO NOT REMOVE OR MODIFY WITHOUT UNDERSTANDING
 *
 * This file contains content detection logic for the document viewer.
 * It determines whether content should be rendered as HTML or Markdown.
 *
 * History: This logic has been accidentally removed/broken multiple times
 * during refactoring. If you're modifying DocumentViewerModal.tsx, ensure
 * this utility is still being used for content type detection.
 *
 * See CLAUDE.md section "Protected Patterns" for more context.
 */

/**
 * Determines if content is HTML (from Word docs) vs Markdown
 *
 * WHY THIS EXISTS:
 * - Word documents converted via mammoth produce HTML with <p>, <h1>, etc.
 * - Markdown documents should go through ReactMarkdown for proper rendering
 * - A naive regex like `/<[a-z][\s\S]*>/i` matches too broadly and breaks markdown
 *
 * HOW IT WORKS:
 * - Looks for actual HTML block-level tags (p, div, h1-6, ul, ol, li, table, etc.)
 * - Requires BOTH: block tags present AND (multiple tags OR closing tags)
 * - This prevents markdown with occasional angle brackets from being misdetected
 *
 * USAGE:
 * ```tsx
 * import { isHTMLContent } from '@/lib/content-detection';
 *
 * {isHTMLContent(content) ? (
 *   <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
 * ) : (
 *   <ReactMarkdown>{content}</ReactMarkdown>
 * )}
 * ```
 *
 * @param content - The document content to analyze
 * @returns true if content appears to be HTML, false for markdown/plain text
 */
export const isHTMLContent = (content: string | null | undefined): boolean => {
  if (!content) return false;

  // Check for common HTML block-level tags that indicate real HTML content
  // These are tags typically produced by Word/mammoth conversion
  const htmlBlockTags = /<(p|div|h[1-6]|ul|ol|li|table|tr|td|th|br|hr|section|article|header|footer|nav|aside|main|blockquote|pre|figure|figcaption)\b[^>]*>/i;

  // Check for multiple HTML tags (real HTML usually has several)
  const htmlTagMatches = content.match(/<[a-z][a-z0-9]*\b[^>]*>/gi);
  const hasMultipleHtmlTags = htmlTagMatches && htmlTagMatches.length >= 3;

  // Check for closing tags (markdown rarely has these)
  const hasClosingTags = /<\/[a-z][a-z0-9]*>/i.test(content);

  return htmlBlockTags.test(content) && (hasMultipleHtmlTags || hasClosingTags);
};

/**
 * Checks if document metadata indicates HTML content
 * Use this in combination with isHTMLContent for full detection
 */
export const hasHTMLMetadata = (metadata: Record<string, unknown> | null | undefined): boolean => {
  if (!metadata) return false;
  return (
    metadata.contentFormat === 'html' ||
    metadata.extractionMethod === 'mammoth-html'
  );
};

/**
 * Combined check for whether content should render as HTML
 * This is the recommended function to use in components
 */
export const shouldRenderAsHTML = (
  content: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): boolean => {
  return hasHTMLMetadata(metadata) || isHTMLContent(content);
};
