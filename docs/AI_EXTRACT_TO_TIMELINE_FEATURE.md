# AI Extract to Timeline Feature

## Overview

This feature allows users to extract schedulable items from AI-generated responses or existing documents and add them directly to the Timeline. It uses Claude AI to intelligently identify actionable tasks, deadlines, milestones, and events from any text content.

**Implemented:** December 2024
**Backup Tag:** `backup-before-timeline-feature` (use `git checkout backup-before-timeline-feature` to revert)

---

## User Flows

### Flow A: From AI Responses

1. User submits a query in AI Query Input or Conversation Chat
2. AI generates a response with actionable content
3. User clicks **"Add to Timeline"** button
4. Dialog opens showing extracted items
5. User reviews, edits, and selects items
6. Items are added to the chosen timeline layer

### Flow B: From Existing Documents

1. User views any document (from Documents page or document cards)
2. User clicks **"Add to Timeline"** button
3. Dialog opens showing extracted items from document content
4. User reviews, edits, and selects items
5. Items are added to the chosen timeline layer

---

## Entry Points

The feature is accessible from 4 locations in the application:

| Component | File | Button Location |
|-----------|------|-----------------|
| AI Query Input | `src/components/AIQueryInput.tsx` | Footer actions (next to "Save as Document") |
| Conversation Chat | `src/components/ConversationChat.tsx` | Action bar when messages exist |
| Document Viewer Modal | `src/components/DocumentViewerModal.tsx` | Header actions (view mode) |
| Document Card | `src/components/DocumentCard.tsx` | Card actions (full-width button) |

---

## Technical Architecture

### Backend: Edge Function

**File:** `supabase/functions/extract-timeline-items/index.ts`

The Edge Function uses Claude AI to extract schedulable items from text content.

#### Request Format

```typescript
interface ExtractRequest {
  content: string;  // The text to analyze
}
```

#### Response Format

```typescript
interface ExtractResponse {
  items: ExtractedItem[];
  message?: string;  // Only if no items found
}

interface ExtractedItem {
  title: string;              // Item name/title
  suggested_date: string | null;  // ISO date if mentioned
  duration_minutes: number;   // Estimated duration (default: 60)
  description: string | null; // Additional context
  sequence: number;           // Order in the content
}
```

#### AI Prompt Strategy

The Edge Function prompts Claude to:
1. Identify actionable items (tasks, events, milestones, deadlines)
2. Extract any mentioned dates or timeframes
3. Estimate reasonable durations based on complexity
4. Maintain logical sequence order
5. Return structured JSON for UI rendering

### Frontend: ExtractToTimelineDialog Component

**File:** `src/components/ai/ExtractToTimelineDialog.tsx`

A comprehensive dialog component that handles:

#### State Management

```typescript
const [isExtracting, setIsExtracting] = useState(false);
const [isAdding, setIsAdding] = useState(false);
const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([]);
const [selectedLayerId, setSelectedLayerId] = useState<string>('');
const [startDate, setStartDate] = useState<string>(today);
const [isCreatingLayer, setIsCreatingLayer] = useState(false);
const [newLayerName, setNewLayerName] = useState('');
const [newLayerColor, setNewLayerColor] = useState('#3B82F6');
```

#### Key Features

1. **Automatic Extraction**: Calls Edge Function when dialog opens
2. **Item Selection**: Checkbox selection with Select All/None
3. **Inline Editing**: Edit title, date, and duration for each item
4. **Layer Selection**: Choose existing layer or create new one
5. **Inline Layer Creation**: Create layer without leaving dialog
6. **Smart Date Spacing**: Items without dates spaced weekly from start date

#### Props Interface

```typescript
interface ExtractToTimelineDialogProps {
  open: boolean;
  onClose: () => void;
  content: string;            // Text to extract from
  sourceType: 'ai-response' | 'document';
  sourceTitle?: string;       // Optional title for context
}
```

---

## No Timeline/Layer Handling

A key requirement was handling the case when no timeline layers exist yet.

### Solution: Inline Layer Creation

When `layers.length === 0` OR user clicks the "+" button:

1. Layer creation form appears inline in the dialog
2. User enters layer name and selects color
3. Layer is created automatically when "Add to Timeline" is clicked
4. Items are added to the newly created layer

```tsx
{hasNoLayers || isCreatingLayer ? (
  <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
    <Input
      value={newLayerName}
      onChange={(e) => setNewLayerName(e.target.value)}
      placeholder="Layer name (e.g., Podcast Episodes)"
    />
    <div className="flex gap-1">
      {DEFAULT_LAYER_COLORS.map((color) => (
        <button
          key={color}
          onClick={() => setNewLayerColor(color)}
          className={`w-6 h-6 rounded-full ${selected ? 'border-2' : ''}`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  </div>
) : (
  <Select value={selectedLayerId} onValueChange={setSelectedLayerId}>
    {/* Existing layers */}
  </Select>
)}
```

---

## Date Calculation Logic

```typescript
const calculateItemDate = (item: ExtractedItem, index: number): string => {
  // Use AI-extracted date if available
  if (item.suggested_date) {
    return item.suggested_date;
  }
  // Otherwise, space items weekly from start date
  const date = new Date(startDate);
  date.setDate(date.getDate() + index * 7);
  return date.toISOString().split('T')[0];
};
```

---

## Dependencies

### Hooks Used

- `useLayers()` - Layer CRUD operations
- `useTimelineContext()` - Adding items to timeline
- `useToast()` - User feedback

### External Libraries

- `@/components/ui/*` - shadcn/ui components
- `lucide-react` - Icons

### Supabase Functions

- `extract-timeline-items` - AI extraction Edge Function

---

## UI Screenshots (Text Representation)

### Extraction Dialog

```
┌─────────────────────────────────────────────────────────────────┐
│  Add to Timeline                                            [X] │
│  Extracting schedulable items from "Project Plan"               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timeline Layer                                                 │
│  ┌─────────────────────────────────────────────┐ [+]            │
│  │ 🔵 My Project Tasks                    ▾    │                │
│  └─────────────────────────────────────────────┘                │
│                                                                 │
│  Start From Date                                                │
│  ┌─────────────────────────────────────────────┐                │
│  │ 2024-12-09                                  │                │
│  └─────────────────────────────────────────────┘                │
│  Items without specific dates will be spaced weekly             │
│                                                                 │
│  Found 4 items                    [Select All] [Select None]    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ☑ Research competitor analysis                              ││
│  │   📅 Week 1  ⏱ 60 min                               [Edit]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ☑ Draft initial proposal                                    ││
│  │   📅 Week 2  ⏱ 90 min                               [Edit]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ☐ Client presentation                                       ││
│  │   📅 2024-12-20  ⏱ 45 min                           [Edit]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ☑ Final review meeting                                      ││
│  │   📅 Week 4  ⏱ 30 min                               [Edit]  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│                               [Cancel]  [Add 3 Items to Timeline]│
└─────────────────────────────────────────────────────────────────┘
```

### Inline Layer Creation (No Layers Exist)

```
┌─────────────────────────────────────────────────────────────────┐
│  Timeline Layer                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Create Your First Timeline Layer                            ││
│  │                                                             ││
│  │ Layer name: [Marketing Tasks                  ]             ││
│  │                                                             ││
│  │ Color: 🔵 🟢 🟡 🔴 🟣 🩷                                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Edit Mode (Expanded Item)

```
┌─────────────────────────────────────────────────────────────────┐
│ ☑                                                               │
│   Title: [Research competitor analysis          ]               │
│   Date:  [2024-12-15]  Duration: [60  ] min                     │
│   [Done]                                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

### Extraction Errors

- Network failures show toast notification
- Sets message state with user-friendly error
- User can retry by closing and reopening dialog

### No Items Found

- Shows message: "No schedulable items found in the content."
- User can close dialog or try with different content

### Add to Timeline Errors

- Shows toast notification
- Preserves extracted items for retry
- Logs error to console for debugging

---

## Testing Checklist

### Manual Testing Steps

1. **AI Response Flow**
   - [ ] Submit AI query
   - [ ] Click "Add to Timeline"
   - [ ] Verify items are extracted
   - [ ] Select/deselect items
   - [ ] Edit an item's title and duration
   - [ ] Add items to existing layer
   - [ ] Verify items appear in timeline

2. **Document Flow**
   - [ ] Open document viewer
   - [ ] Click "Add to Timeline"
   - [ ] Verify extraction works
   - [ ] Add items to timeline

3. **New User Flow (No Layers)**
   - [ ] Ensure no timeline layers exist
   - [ ] Try to add items
   - [ ] Create layer inline
   - [ ] Verify items are added

4. **Edge Cases**
   - [ ] Empty content (should show message)
   - [ ] Content with no actionable items
   - [ ] Very long content
   - [ ] Content with explicit dates

---

## Future Improvements

1. **Batch Operations**
   - Add multiple items to different layers
   - Bulk duration adjustment

2. **Recurring Items**
   - Detect recurring patterns
   - Auto-schedule repeating tasks

3. **Smart Scheduling**
   - Consider existing timeline items
   - Avoid scheduling conflicts
   - Respect working hours

4. **Templates**
   - Save extraction patterns
   - Apply templates to similar content

5. **Integration**
   - Calendar sync
   - Export to external tools

---

## Related Features

- **Plan to Timeline** (`docs/PLAN_TO_TIMELINE_FEATURE.md`) - For structured project plans with user-defined durations
- **Timeline Management** - Core timeline functionality
- **AI Query System** - Source of AI-generated content

---

## Maintenance Notes

### Adding New Entry Points

To add "Add to Timeline" to a new component:

1. Import required dependencies:
```tsx
import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { ExtractToTimelineDialog } from '@/components/ai/ExtractToTimelineDialog';
```

2. Add state:
```tsx
const [showTimelineDialog, setShowTimelineDialog] = useState(false);
```

3. Add button:
```tsx
<Button onClick={() => setShowTimelineDialog(true)}>
  <Calendar className="h-4 w-4 mr-2" />
  Add to Timeline
</Button>
```

4. Add dialog:
```tsx
<ExtractToTimelineDialog
  open={showTimelineDialog}
  onClose={() => setShowTimelineDialog(false)}
  content={yourContent}
  sourceType="document" // or "ai-response"
  sourceTitle={optionalTitle}
/>
```

### Modifying AI Extraction

Edit the system prompt in `supabase/functions/extract-timeline-items/index.ts` to change:
- What types of items are extracted
- Default duration estimates
- Date parsing behavior
- Output structure

After changes, deploy with:
```bash
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy extract-timeline-items
```
