# AI Query Function Troubleshooting Session
**Date:** November 9, 2025
**Issue:** AI queries returning empty responses after web search requests

## Problem Summary

Users experiencing two related issues with the AI query functionality:

1. **Empty responses after web search**: When Claude requests a web search, the follow-up API call was returning empty responses
2. **Document search UX issue**: Manually created documents were opening invalid Google Drive URLs instead of the modal viewer
3. **Search button missing**: Document search lacked explicit search trigger and Enter key support

## Issue 1: Empty AI Responses After Web Search

### Initial Symptoms
- User query: "looking at the Boring business that makes money document, can you research how I would add a cheap off the shelf tag printer to this"
- Error: "I'm sorry, I couldn't generate a response to your question. Please try rephrasing or try again."
- Logs showed: "AI response generated successfully: No Length: 0"

### Investigation Timeline

#### Step 1: Analyze Supabase Logs
```
"Claude requested web search: portable tag printer test and tag labels AS/NZS 3760 Australia"
"Claude response structure"
"AI response generated successfully: No Length: 0"
"Empty AI response received"
"Saving query to history..."
```

**Key Finding:** Claude successfully requested web search, but the response text extraction returned empty string.

#### Step 2: Code Analysis
Located in `supabase/functions/ai-query/index.ts`:

**Lines 185-202 (BEFORE FIX):**
```typescript
const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
  // ... API call config
});

const followUpData = await followUpResponse.json();
return followUpData.content?.find((block: any) => block.type === 'text')?.text ?? '';
```

**Problems Identified:**
1. No error checking for `followUpResponse.ok`
2. No logging of follow-up response structure
3. Silent failure - returns empty string if no text block found
4. No diagnostics to understand what's in `followUpData.content`

### Root Cause
When Claude uses the web search tool:
1. Initial API call succeeds and returns `tool_use` block ✓
2. Web search executes successfully ✓
3. Follow-up API call is made with search results ✓
4. **Follow-up response format is unexpected or malformed** ❌
5. Text extraction finds no text block and silently returns `''` ❌
6. Empty response propagates to user ❌

### Solution Implemented

**File:** `supabase/functions/ai-query/index.ts` (Lines 201-218)

```typescript
// Add error checking
if (!followUpResponse.ok) {
  console.error('Follow-up API error:', followUpResponse.status, followUpResponse.statusText);
  const errorText = await followUpResponse.text();
  console.error('Follow-up error details:', errorText);
  throw new Error(`Follow-up Claude API error: ${followUpResponse.status}`);
}

const followUpData = await followUpResponse.json();
// Add debug logging
console.log('Follow-up response stop_reason:', followUpData.stop_reason);
console.log('Follow-up content blocks:', followUpData.content?.map((b: any) => ({ type: b.type, hasText: !!b.text })));

// Improve text extraction
const textBlock = followUpData.content?.find((block: any) => block.type === 'text');
if (!textBlock || !textBlock.text) {
  console.error('No text block in follow-up response. Full content:', JSON.stringify(followUpData.content));
  return "I found search results but had trouble generating a response. Please try rephrasing your question.";
}
console.log('Extracted text length:', textBlock.text.length);
return textBlock.text;
```

**Changes:**
1. Added HTTP status check for follow-up API call
2. Added comprehensive logging for response structure
3. Replaced silent failure with informative error message
4. Added text extraction length logging

**Deployment:**
```bash
npx supabase functions deploy ai-query
git commit -m "fix: Add error handling and logging for web search follow-up responses"
git push origin main
```

**Status:** Deployed to production. Awaiting logs from next query to diagnose actual issue.

---

## Issue 2: Document Viewer Opening Invalid Google Drive URLs

### Problem
When searching for and viewing manually created documents (e.g., "Boring business that makes money"):
- Clicking "View" opened a new tab
- URL: `https://drive.google.com/file/d/manual-1234567890/view`
- Error: "Sorry, the file you have requested does not exist"

### Root Cause
**File:** `src/components/DocumentList.tsx` (Lines 70-76)

The component always tried to open documents in Google Drive, even for manually created ones:

```typescript
const handleViewDocument = (doc: any) => {
  window.open(`https://drive.google.com/file/d/${doc.google_file_id}/view`, '_blank');
};

const handleEditDocument = (doc: any) => {
  window.open(`https://docs.google.com/document/d/${doc.google_file_id}/edit`, '_blank');
};
```

Manually created documents have fake `google_file_id` values:
- `manual-{timestamp}` - Created via "Create Document" modal
- `upload_{timestamp}_{random}` - Uploaded local files
- `ai_generated_{timestamp}` - AI-generated documents

### Solution Implemented

**File:** `src/components/DocumentList.tsx`

**Added document type detection (Lines 73-79):**
```typescript
const isManualDocument = (doc: any) => {
  return doc.file_type === 'manual' ||
         doc.google_file_id?.startsWith('manual-') ||
         doc.google_file_id?.startsWith('upload_') ||
         doc.google_file_id?.startsWith('ai_generated_');
};
```

**Updated handlers (Lines 81-101):**
```typescript
const handleViewDocument = (doc: any) => {
  if (isManualDocument(doc)) {
    // Open in modal viewer for manual/local documents
    setViewerDocument(doc);
    setIsViewerOpen(true);
  } else {
    // Open Google Drive for actual Drive documents
    window.open(`https://drive.google.com/file/d/${doc.google_file_id}/view`, '_blank');
  }
};

const handleEditDocument = (doc: any) => {
  if (isManualDocument(doc)) {
    setViewerDocument(doc);
    setIsViewerOpen(true);
  } else {
    window.open(`https://docs.google.com/document/d/${doc.google_file_id}/edit`, '_blank');
  }
};
```

**Added modal viewer (Lines 150-157):**
```typescript
<DocumentViewerModal
  document={viewerDocument}
  isOpen={isViewerOpen}
  onClose={() => {
    setIsViewerOpen(false);
    setViewerDocument(null);
  }}
/>
```

**Deployment:**
```bash
git commit -m "fix: Prevent manually created documents from opening invalid Google Drive URLs"
git push origin main
```

**Status:** ✅ Fixed and deployed

---

## Issue 3: Document Search Missing Search Button

### Problem
In the Documents page "Search & Filter" section:
- No explicit "Search" button
- Pressing Enter didn't trigger search
- Users couldn't scroll to first result

### Solution Implemented

**File:** `src/components/DocumentSearchFilter.tsx`

**Added handlers (Lines 26-45):**
```typescript
const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const firstDocument = document.querySelector('[data-document-card]');
    if (firstDocument) {
      firstDocument.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }
};

const handleSearchClick = () => {
  const firstDocument = document.querySelector('[data-document-card]');
  if (firstDocument) {
    firstDocument.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
};

const handleClearSearch = () => {
  onSearchChange('');
};
```

**Updated UI (Lines 54-79):**
```typescript
<div className="flex gap-2">
  <div className="relative flex-1">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      placeholder="Search documents... (Press Enter to search)"
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      onKeyDown={handleSearchKeyDown}
      className="pl-10 pr-10"
      aria-label="Search documents"
    />
    {searchTerm && (
      <button
        onClick={handleClearSearch}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
        aria-label="Clear search"
      >
        <X className="h-4 w-4" />
      </button>
    )}
  </div>
  <Button onClick={handleSearchClick} variant="default" size="default">
    <Search className="h-4 w-4 mr-2" />
    Search
  </Button>
</div>
```

**File:** `src/components/DocumentCard.tsx` (Line 60-63)

**Added scroll target:**
```typescript
<Card
  data-document-card
  className="hover:shadow-lg transition-all duration-200 h-full flex flex-col"
>
```

**Deployment:**
```bash
git commit -m "feat: Add search button and Enter key support to document search"
git push origin main
```

**Status:** ✅ Fixed and deployed

---

## Current Status & Next Steps

### Fixed Issues ✅
1. Document viewer for manual documents
2. Search button and Enter key support

### In Progress 🔄
1. AI query empty responses - awaiting diagnostic logs from new error handling

### Pending Investigation 🔍
1. Check Supabase logs for follow-up response structure
2. Verify why Claude sometimes says it doesn't have web search access
3. Document context awareness - AI doesn't automatically retrieve documents mentioned by name

### Environment Verification
All required API keys confirmed set in Supabase:
- ✅ ANTHROPIC_API_KEY
- ✅ BRAVE_SEARCH_API_KEY
- ✅ OPENROUTER_API_KEY
- ✅ SUPABASE_* keys
- ✅ Google/Microsoft OAuth keys

### Known Limitations
1. **Document Context**: When user says "looking at the X document," the AI doesn't automatically retrieve that document's content. User must either:
   - Set `use_documents: true` (retrieves ALL documents)
   - Specify `knowledge_base_id` (retrieves specific KB)
   - Currently no way to retrieve a single document by name mention

2. **Web Search Tool**: While defined and enabled in code, Claude may not always use it. Needs further investigation of:
   - System message clarity
   - Tool use prompting
   - Response format validation

### Technical Debt
1. Update Supabase CLI (currently v2.22.6, latest v2.54.11)
2. Fix git pre-push hook error: "Supabase Service Role Key: syntax error"
3. Consider implementing document name parsing in backend
4. Add MCP authorization for automated Supabase access

## Code References

### Key Files Modified
- `supabase/functions/ai-query/index.ts` (Lines 201-218)
- `src/components/DocumentList.tsx` (Lines 73-157)
- `src/components/DocumentSearchFilter.tsx` (Lines 26-79)
- `src/components/DocumentCard.tsx` (Line 60-63)

### Related Functions
- `claudeCompletion()` - Main Claude API interaction
- `searchWeb()` - Brave Search API integration
- `getLLMResponse()` - Provider selection and fallback logic

## Testing Recommendations

1. **Test web search functionality:**
   - Query: "what's the weather like in Sydney today"
   - Expected: Claude uses web_search tool, returns current weather
   - Check logs for: follow-up response structure, extracted text length

2. **Test document context:**
   - Query: "summarize the Boring business document"
   - Expected: Either returns summary or explains it needs the document
   - Verify: Does AI have access to document content?

3. **Test manual document viewing:**
   - Search for manually created document
   - Click "View"
   - Expected: Opens in modal viewer, not Google Drive

4. **Test search UX:**
   - Type in search box
   - Press Enter OR click Search button
   - Expected: Scrolls to first matching document

## Lessons Learned

1. **Always add logging before silent failures** - The original code silently returned empty strings, making debugging impossible
2. **Check API responses explicitly** - Don't assume fetch() succeeded
3. **Document type detection is critical** - Can't assume all documents are Google Drive files
4. **UX improvements need multiple interaction methods** - Search should work via Enter key, button, AND real-time filtering
5. **Error messages should be informative** - "I found search results but had trouble generating a response" is better than "I'm sorry, I couldn't generate a response"

## Additional Resources

- [Anthropic Claude API Documentation](https://docs.anthropic.com/en/api/messages)
- [Brave Search API Documentation](https://api.search.brave.com/app/documentation)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Claude Tool Use Guide](https://docs.anthropic.com/en/docs/tool-use)

---

**Document prepared by:** Claude Code AI Assistant
**Session Date:** November 9, 2025
**Version:** 1.0
