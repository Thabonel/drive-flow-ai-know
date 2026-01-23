# Frontend Guide

## Table of Contents
1. [Overview](#overview)
2. [Pages](#pages)
3. [Components](#components)
4. [Custom Hooks](#custom-hooks)
5. [State Management](#state-management)
6. [Routing](#routing)
7. [Styling](#styling)

---

## Overview

The frontend is built with **React 18 + TypeScript** using modern patterns and best practices. Key characteristics:

- **Component-Based**: Reusable UI components using shadcn/ui
- **Type-Safe**: Full TypeScript coverage with strict mode
- **Responsive**: Mobile-first design with Tailwind CSS
- **Accessible**: WCAG AA compliant components
- **Performance**: Code splitting, lazy loading, optimized builds

### Technology Stack

| Library | Version | Purpose |
|---------|---------|---------|
| React | 18.2.0 | UI framework |
| TypeScript | 5.0.2 | Type safety |
| React Router | 6.11.2 | Routing |
| TanStack Query | 4.29.7 | Server state |
| React Hook Form | 7.60.0 | Forms |
| Tailwind CSS | 3.3.0 | Styling |
| shadcn/ui | Latest | Components |

---

## Pages

All pages are located in `src/pages/`. Each page represents a route in the application.

### Core Pages

#### 1. Landing (`Landing.tsx`)
**Route**: `/`
**Access**: Public (redirects if authenticated)
**Purpose**: Marketing landing page

**Features**:
- Hero section with value proposition
- Feature highlights
- CTA buttons
- Auto-redirect authenticated users to `/timeline`

---

#### 2. Auth (`Auth.tsx`)
**Route**: `/auth`
**Access**: Public (redirects if authenticated)
**Purpose**: User authentication (sign in / sign up)

**Features**:
- Email/password authentication
- OAuth providers (Google, Microsoft)
- Password reset flow
- Form validation with Zod

**Related Pages**:
- `ResetPassword.tsx` - Password reset with token
- `MicrosoftCallback.tsx` - OAuth callback for Microsoft
- `auth/DropboxCallback.tsx` - OAuth callback for Dropbox

---

#### 3. Timeline (`Timeline.tsx`)
**Route**: `/timeline`
**Access**: Protected
**Purpose**: Task management and daily planning (main dashboard)

**Features**:
- Drag-and-drop task scheduling
- AI-powered task breakdown
- Google Calendar sync
- Recurring tasks support
- Workload visualization
- Daily planning flow
- Team collaboration

**Related Components**:
- `timeline/TimelineControls` - Navigation and filters
- `timeline/ViewModeSwitcher` - List/Calendar views
- `timeline/ParkedItemsPanel` - Unscheduled tasks
- `timeline/CompletedItemsToggle` - Show/hide completed
- `timeline/CalendarSyncButton` - Google Calendar integration

**Related Hooks**:
- `useTimeline` - Task CRUD operations
- `useTasks` - Task state management
- `useTimelineSync` - Calendar synchronization
- `useAIDailyPlanning` - AI planning assistance
- `useWorkload` - Capacity analysis

**State**:
```typescript
interface TimelineItem {
  id: string;
  title: string;
  description?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_duration_minutes?: number;
  estimated_duration_minutes?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'parked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  layer_id?: string;
  user_id: string;
  parent_id?: string;  // For sub-tasks
  recurring_series_id?: string;
}
```

---

#### 4. Documents (`Documents.tsx`)
**Route**: `/documents`
**Access**: Protected
**Purpose**: Document library and management

**Features**:
- Document upload
- Cloud storage sync (Google Drive, OneDrive, Dropbox)
- AI-powered document summaries
- Tag management
- Document search
- Bulk actions
- Document visualization
- Spreadsheet viewer

**Related Components**:
- `DocumentList` - Paginated document grid
- `documents/DocumentUploader` - File upload UI
- `DocumentVisualizationPanel` - Charts and insights
- `SpreadsheetViewer` - Excel/CSV viewer
- `RecentDocuments` - Recent activity widget

**Related Hooks**:
- `useDocumentStore` - Document storage operations
- `useDocumentVisualization` - Chart generation
- `useGoogleDrive` - Google Drive integration
- `useMicrosoft` - OneDrive integration
- `useDropbox` - Dropbox integration

---

#### 5. Knowledge Bases (`KnowledgeBases.tsx`)
**Route**: `/knowledge`
**Access**: Protected
**Purpose**: Create and manage AI knowledge bases

**Features**:
- Create knowledge bases from documents
- AI-generated content
- Knowledge base preview
- Document selection
- Search and filtering

**Related Components**:
- `KnowledgeBasePreview` - Preview KB content
- ~~`AIAssistantSidebar`~~ - *(Removed Jan 23, 2026 - see AI Chat page)*

**State**:
```typescript
interface KnowledgeBase {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  content: string;
  source_document_ids: string[];  // Array of document UUIDs
  created_at: string;
  updated_at: string;
}
```

---

#### 6. Pitch Deck (`PitchDeck.tsx`)
**Route**: `/pitch-deck`
**Access**: Protected
**Purpose**: AI-powered pitch deck generation and presentation

**Features**:
- Generate pitch decks with AI
- Customize style (professional, creative, minimal, bold)
- Select source documents
- AI-generated images (Gemini 3 Pro Image)
- Full-screen presentation mode
- Split-screen with speaker notes
- Presenter view (dual-window)
- Keyboard navigation
- Export to PDF/PPTX
- Revision mode (edit existing decks)

**Presentation Modes**:
1. **Edit Mode**: Create/modify decks
2. **Full-Screen Mode**: Single-window presentation
3. **Split-Screen Mode**: Slide + notes (70/30 split)
4. **Presenter View**: Dual-window (slide + next slide + timer)

**Related Components**:
- `PresenterView` - Dual-window presenter display
- `PresentationAudience` - Audience-facing display

**Related Libraries**:
- `lib/presentationStorage.ts` - Local storage for decks
- `lib/presentationSync.ts` - BroadcastChannel sync

**Keyboard Shortcuts**:
- `Arrow Keys / Space` - Navigate slides
- `N` - Toggle split-screen notes
- `P` - Open presenter view
- `F` - Toggle full screen
- `Escape` - Exit presentation
- `Home / End` - First / last slide

**State**:
```typescript
interface PitchDeck {
  title: string;
  subtitle: string;
  slides: Slide[];
  totalSlides: number;
}

interface Slide {
  slideNumber: number;
  title: string;
  content: string;
  visualType?: 'chart' | 'diagram' | 'illustration' | 'icon' | 'photo' | 'none';
  visualPrompt?: string;
  imageData?: string;  // base64 encoded
  notes?: string;  // Speaker notes
}
```

---

#### 7. Settings (`Settings.tsx`)
**Route**: `/settings`
**Access**: Protected
**Purpose**: User preferences and configuration

**Features**:
- Profile management
- AI model selection (Claude/OpenAI/Gemini)
- Cloud storage connections
- Billing & subscriptions (Stripe)
- Notification preferences
- Theme selection
- API key management

**Related Hooks**:
- `useUserSettings` - User preferences
- `useAuth` - Profile updates

---

#### 8. Daily Brief (`DailyBrief.tsx`)
**Route**: `/daily-brief`
**Access**: Protected
**Purpose**: AI-generated daily summary and planning

**Features**:
- AI summary of upcoming tasks
- Schedule overview
- Workload analysis
- Daily tips and insights
- Planning recommendations

**Related Components**:
- `ai/AIDailyBrief` - AI-generated briefing
- `planning/DailyPlanningFlow` - Morning planning
- `planning/EndOfDayShutdown` - Evening review

**Related Hooks**:
- `useAIDailyBrief` - Generate daily brief
- `useAIDailyPlanning` - AI planning assistance

---

#### 9. Conversations (`Conversations.tsx`)
**Route**: `/conversations`
**Access**: Protected
**Purpose**: Saved AI conversation history

**Features**:
- View past AI conversations
- Resume conversations
- Search conversation history
- Delete conversations
- Conversation summaries

**State**:
```typescript
interface Conversation {
  id: string;
  user_id: string;
  title: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  summary?: string;
  created_at: string;
  updated_at: string;
}
```

---

### Team Pages

#### 10. Team Timeline (`Team/TeamTimeline.tsx`)
**Route**: `/team/timeline`
**Access**: Protected (team members only)
**Purpose**: Shared team timeline and task management

**Features**:
- View team members' tasks
- Delegate tasks to team
- Shared calendar
- Workload distribution
- Team collaboration

---

#### 11. Team Documents (`Team/Documents.tsx`)
**Route**: `/team/documents`
**Access**: Protected (team members only)
**Purpose**: Shared document library

---

#### 12. Team Members (`Team/Members.tsx`)
**Route**: `/team/members`
**Access**: Protected (team owner/admin)
**Purpose**: Manage team membership

**Features**:
- Invite team members
- Manage roles (owner, admin, member, assistant)
- Remove members
- View member activity

---

#### 13. Team Settings (`Team/Settings.tsx`)
**Route**: `/team/settings`
**Access**: Protected (team owner/admin)
**Purpose**: Team configuration

---

### Assistant Pages

#### 14. Assistant Management (`AssistantManagement.tsx`)
**Route**: `/assistants`
**Access**: Protected
**Purpose**: Manage executive assistants

**Features**:
- Invite assistants
- Assign permissions
- View delegation queue
- Meeting briefings

**Related Components**:
- `assistant/InviteAssistantDialog`
- `assistant/DelegationQueue`
- `assistant/ExecutiveAssistantDashboard`

---

#### 15. Assistant Portal (`AssistantPortalPage.tsx`)
**Route**: `/assistant-portal`
**Access**: Protected (assistant role)
**Purpose**: Assistant dashboard for managing executive's tasks

**Features**:
- View delegated tasks
- Create tasks for executive
- Meeting preparation
- Task prioritization

**Related Components**:
- `assistant/AssistantPortal`
- `assistant/AssistantDashboard`
- `assistant/MeetingBriefingManager`

---

### Booking Pages

#### 16. Booking Links (`BookingLinks.tsx`)
**Route**: `/booking-links`
**Access**: Protected
**Purpose**: Manage booking page links

**Features**:
- Create booking pages
- Configure availability
- Custom slugs
- Calendar integration

**Related Components**:
- `booking/BookingLinkManager`
- `booking/BookingLinkEditor`

**Related Hooks**:
- `useBookingLinks`

---

#### 17. Booking Page (`BookingPage.tsx`)
**Route**: `/book/:slug`
**Access**: Public
**Purpose**: Public booking interface

---

### Admin Pages

#### 18. Admin Dashboard (`Admin.tsx`)
**Route**: `/admin`
**Access**: Protected (admin only)
**Purpose**: System administration

**Features**:
- User management
- System statistics
- Feature flags
- AI command center

---

#### 19. Admin Support Tickets (`AdminSupportTickets.tsx`)
**Route**: `/admin/support-tickets`
**Access**: Protected (admin only)
**Purpose**: Manage user support requests

---

### Utility Pages

#### 20. Email to Task (`EmailToTask.tsx`)
**Route**: `/email-to-task`
**Access**: Protected
**Purpose**: Convert emails to timeline tasks

**Features**:
- Email forwarding setup
- AI email parsing
- Automatic task creation

**Related Components**:
- `email/EmailToTaskManager`

**Related Hooks**:
- `useAIEmailParser`

---

#### 21. Google Drive (`GoogleDrive.tsx`)
**Route**: `/drive`
**Access**: Protected
**Purpose**: Google Drive integration and file picker

---

#### 22. Sync Status (`SyncStatus.tsx`)
**Route**: `/sync`
**Access**: Protected
**Purpose**: Monitor cloud storage sync status

---

#### 23. Add Documents (`AddDocuments.tsx`)
**Route**: `/add-documents`
**Access**: Protected
**Purpose**: Multiple document upload methods

---

### Legal Pages

#### 24. Terms of Service (`Terms.tsx`)
**Route**: `/terms`
**Access**: Public

---

#### 25. Privacy Policy (`Privacy.tsx`)
**Route**: `/privacy`
**Access**: Public

---

#### 26. Disclaimer (`Disclaimer.tsx`)
**Route**: `/disclaimer`
**Access**: Public

---

#### 27. Data Policy (`DataPolicy.tsx`)
**Route**: `/data-policy`
**Access**: Public

---

#### 28. Acceptable Use Policy (`AcceptableUse.tsx`)
**Route**: `/acceptable-use`
**Access**: Public

---

#### 29. Support (`Support.tsx`)
**Route**: `/support`
**Access**: Protected
**Purpose**: Submit support tickets

---

#### 30. Presentation Audience (`PresentationAudience.tsx`)
**Route**: `/presentation-audience/:sessionId`
**Access**: Public
**Purpose**: Audience view for synchronized presentations

---

#### 31. Not Found (`NotFound.tsx`)
**Route**: `*` (catch-all)
**Access**: Public
**Purpose**: 404 error page

---

## Components

Components are organized by feature and purpose. Key component directories:

### UI Components (`components/ui/`)

These are shadcn/ui components (Radix UI primitives styled with Tailwind):

- `button.tsx` - Button variants
- `input.tsx` - Text input
- `textarea.tsx` - Multi-line input
- `select.tsx` - Dropdown select
- `dialog.tsx` - Modal dialogs
- `sheet.tsx` - Slide-in panels
- `dropdown-menu.tsx` - Context menus
- `tabs.tsx` - Tab navigation
- `accordion.tsx` - Collapsible sections
- `toast.tsx` / `sonner.tsx` - Notifications
- `tooltip.tsx` - Hover tooltips
- `sidebar.tsx` - App sidebar
- `calendar.tsx` - Date picker
- `form.tsx` - Form wrappers
- And 30+ more...

**Usage Example**:
```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

<Dialog>
  <DialogContent>
    <DialogHeader>Title</DialogHeader>
    <p>Content</p>
    <Button variant="default">Action</Button>
  </DialogContent>
</Dialog>
```

---

### Feature Components

#### AI Components (`components/ai/`)

**`AIAssistantSidebar.tsx`** *(DEPRECATED - Removed Jan 23, 2026)*
- ~~Main AI chat interface~~
- ~~Query input and response display~~
- ~~Knowledge base selection~~
- ~~Document context~~
- ~~Conversation history~~
- *Functionality consolidated into AI Chat page (`/conversations`)*

**`AIDailyBrief.tsx`**
- AI-generated daily summary

**`AIDailyPlanningModal.tsx`**
- Morning planning assistant

**`AITimeInsights.tsx`**
- Time management insights

**`AIMeetingPrep.tsx`**
- AI meeting preparation

**`AITaskBreakdown.tsx`**
- Break large tasks into subtasks

**`AILoadingAnimation.tsx`**
- Loading state for AI operations

**`AIBadge.tsx`**
- AI-powered feature indicator

**`StreamingText.tsx`**
- Stream AI responses in real-time

**`AILearningStatus.tsx`**
- AI learning progress

**`DailyAITips.tsx`**
- Daily productivity tips

**`AIPersonality.tsx`**
- Customize AI personality

**`AchievementShare.tsx`**
- Share accomplishments

**`AISuccessStory.tsx`**
- Motivational stories

---

#### Document Components (`components/documents/`)

**`DocumentUploader.tsx`**
- Drag-and-drop file upload
- Batch upload
- Progress tracking

**`DocumentList.tsx`**
- Grid/list view of documents
- Pagination
- Sorting and filtering

**`DocumentVisualizationPanel.tsx`**
- Chart generation from document data
- Data extraction
- Visual insights

**`SpreadsheetViewer.tsx`**
- View Excel/CSV files
- Table rendering

**`RecentDocuments.tsx`**
- Recently viewed/modified widget

**`EmptyDocumentsState.tsx`**
- Empty state UI

**`DocumentCardSkeleton.tsx`**
- Loading skeleton

---

#### Timeline Components (`components/timeline/`)

**`TimelineControls.tsx`**
- Date navigation
- View mode selector
- Filter controls

**`ViewModeSwitcher.tsx`**
- Switch between list/calendar views

**`ParkedItemsPanel.tsx`**
- Unscheduled tasks sidebar

**`CompletedItemsToggle.tsx`**
- Show/hide completed tasks

**`CalendarSyncButton.tsx`**
- Google Calendar sync trigger

**`CalendarSyncSettings.tsx`**
- Configure calendar sync

**`TimeEstimateInput.tsx`**
- Duration estimation UI

---

#### Assistant Components (`components/assistant/`)

**`AssistantPortal.tsx`**
- Full assistant dashboard

**`InviteAssistantDialog.tsx`**
- Invite new assistant

**`ExecutiveAssistantDashboard.tsx`**
- Executive view of assistant activity

**`AssistantDashboard.tsx`**
- Assistant's task view

**`MeetingBriefingManager.tsx`**
- Prepare meeting briefs

**`DelegationQueue.tsx`**
- View delegated tasks

**`DelegateTaskButton.tsx`**
- Quick delegate action

**`AssistantAITools.tsx`**
- AI tools for assistants

---

#### Booking Components (`components/booking/`)

**`BookingLinkManager.tsx`**
- Manage all booking links

**`BookingLinkEditor.tsx`**
- Create/edit booking pages
- Configure availability

---

#### Planning Components (`components/planning/`)

**`DailyPlanningFlow.tsx`**
- Guided planning process

**`EndOfDayShutdown.tsx`**
- Evening review and next-day prep

---

#### Email Components (`components/email/`)

**`EmailToTaskManager.tsx`**
- Email-to-task configuration
- Parsing rules

---

#### Template Components (`components/templates/`)

**`TemplateBuilder.tsx`**
- Create task templates

**`TemplateLibrary.tsx`**
- Browse and apply templates

---

#### Routine Components (`components/routines/`)

**`RoutineManager.tsx`**
- Manage daily/weekly routines
- Routine templates

---

### Shared Components

**`AppSidebar.tsx`**
- Main navigation sidebar
- Route links
- User menu

**`ThemeProvider.tsx`**
- Light/dark theme management
- System theme detection

**`ErrorBoundary.tsx`**
- Catch and display React errors

**`KeyboardShortcutsHelp.tsx`**
- Keyboard shortcut reference

**`PaginationControls.tsx`**
- Pagination UI

**`ConfirmationDialog.tsx`**
- Generic confirmation modal

**`PageHelp.tsx`**
- Contextual help widget

**`FeedbackWidget.tsx`**
- User feedback form

---

## Custom Hooks

All hooks are in `src/hooks/`. Custom hooks encapsulate business logic and API interactions.

### Core Hooks

#### `useAuth.ts`
**Purpose**: Authentication state and methods

```typescript
const {
  user,           // Current user object
  loading,        // Auth loading state
  signIn,         // Sign in method
  signUp,         // Sign up method
  signOut,        // Sign out method
  resetPassword,  // Password reset
} = useAuth();
```

**Features**:
- Manages Supabase auth state
- Provides auth context to app
- Handles OAuth flows

---

#### `useUserSettings.ts`
**Purpose**: User preferences and settings

```typescript
const {
  settings,         // User settings object
  updateSettings,   // Update settings
  loading,
} = useUserSettings();
```

**Settings Schema**:
```typescript
interface UserSettings {
  user_id: string;
  model_preference: 'claude' | 'openai' | 'gemini';
  theme: 'light' | 'dark' | 'system';
  notifications_enabled: boolean;
  daily_brief_time?: string;  // HH:mm format
  timezone?: string;
}
```

---

#### `useKeyboardShortcuts.ts`
**Purpose**: Global keyboard shortcuts

```typescript
const shortcuts = {
  'Ctrl+K': () => openCommandPalette(),
  'Ctrl+/': () => toggleHelp(),
  '/': () => focusSearch(),
};

useKeyboardShortcuts(shortcuts);
```

---

### Data Hooks

#### `useTimeline.ts`
**Purpose**: Timeline task management

```typescript
const {
  items,             // All timeline items
  loading,
  createItem,        // Create new task
  updateItem,        // Update task
  deleteItem,        // Delete task
  moveItem,          // Drag-and-drop handler
  parkItem,          // Move to parking lot
  completeItem,      // Mark complete
} = useTimeline();
```

---

#### `useTasks.ts`
**Purpose**: Task CRUD operations

---

#### `useDocumentStore.ts`
**Purpose**: Document storage and retrieval

```typescript
const {
  documents,         // User documents
  loading,
  uploadDocument,    // Upload new document
  deleteDocument,    // Delete document
  updateDocument,    // Update metadata
  searchDocuments,   // Search by query
} = useDocumentStore();
```

---

#### `useDocumentVisualization.ts`
**Purpose**: Generate charts from documents

```typescript
const {
  generateChart,     // Create chart from data
  chartData,
  loading,
} = useDocumentVisualization(document);
```

---

### Integration Hooks

#### `useGoogleDrive.ts`
**Purpose**: Google Drive integration

```typescript
const {
  isConnected,       // Connection status
  connectDrive,      // OAuth flow
  disconnectDrive,   // Revoke access
  syncFiles,         // Sync documents
  files,             // Drive files
  loading,
} = useGoogleDrive();
```

---

#### `useMicrosoft.ts`
**Purpose**: Microsoft OneDrive integration

---

#### `useDropbox.ts`
**Purpose**: Dropbox integration

---

#### `useGoogleCalendar.ts`
**Purpose**: Google Calendar sync

```typescript
const {
  isConnected,
  connectCalendar,
  syncEvents,        // Sync timeline to calendar
  events,
  loading,
} = useGoogleCalendar();
```

---

### AI Hooks

#### `useAIDailyBrief.ts`
**Purpose**: Generate daily AI briefing

```typescript
const {
  generateBrief,     // Request new brief
  brief,             // Generated content
  loading,
} = useAIDailyBrief();
```

---

#### `useAIDailyPlanning.ts`
**Purpose**: AI-assisted planning

```typescript
const {
  generatePlan,      // Create daily plan
  plan,
  loading,
} = useAIDailyPlanning();
```

---

#### `useAITimeIntelligence.ts`
**Purpose**: AI time management insights

---

#### `useAIEmailParser.ts`
**Purpose**: Parse emails into tasks

```typescript
const {
  parseEmail,        // Extract task from email
  loading,
} = useAIEmailParser();
```

---

### Team Hooks

#### `useTeam.ts`
**Purpose**: Team management

```typescript
const {
  team,              // Current team
  createTeam,        // Create new team
  inviteMember,      // Invite user
  removeMember,      // Remove member
  loading,
} = useTeam();
```

---

#### `useTeamMembers.ts`
**Purpose**: Team member list

---

#### `useAssistantAccess.ts`
**Purpose**: Assistant permissions

```typescript
const {
  isAssistant,       // User is assistant
  hasAccess,         // Permission check
  executives,        // List of executives
  loading,
} = useAssistantAccess();
```

---

### Utility Hooks

#### `useOffline.ts`
**Purpose**: Offline mode detection

```typescript
const {
  isOffline,         // Offline status
  toggleOffline,     // Enable/disable
} = useOffline();
```

---

#### `useWorkload.ts`
**Purpose**: Workload analysis

```typescript
const {
  workload,          // Hours scheduled
  capacity,          // Available hours
  utilization,       // Percentage
  loading,
} = useWorkload();
```

---

#### `useUsageTracking.ts`
**Purpose**: Analytics tracking

```typescript
const {
  trackEvent,        // Log event
  trackPageView,     // Log page view
} = useUsageTracking();
```

---

#### `useDictation.ts`
**Purpose**: Voice-to-text input

```typescript
const {
  startDictation,    // Start recording
  stopDictation,     // Stop recording
  transcript,        // Text result
  isRecording,
} = useDictation();
```

---

## State Management

### Global State (Context API)

**AuthContext** (`useAuth` hook)
- User authentication state
- User profile data
- Auth methods

**ThemeContext** (`ThemeProvider`)
- Light/dark mode
- System theme preference

### Server State (TanStack Query)

Most data fetching uses TanStack Query for automatic caching, refetching, and state management:

```typescript
// Example: Fetch documents
const { data: documents, isLoading } = useQuery({
  queryKey: ['documents', userId],
  queryFn: () => fetchDocuments(userId),
  staleTime: 5 * 60 * 1000,  // 5 minutes
});
```

**Query Keys**:
- `['documents', userId]` - User documents
- `['timeline', userId, date]` - Timeline items
- `['conversations', userId]` - AI conversations
- `['team', teamId]` - Team data
- `['settings', userId]` - User settings

---

## Routing

Routes defined in `src/App.tsx:123-276`.

### Route Structure

```tsx
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
  <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />

  {/* Protected Routes */}
  <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
  <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />

  {/* Team Routes */}
  <Route path="/team/timeline" element={<ProtectedRoute><TeamTimeline /></ProtectedRoute>} />

  {/* Public Dynamic Routes */}
  <Route path="/book/:slug" element={<BookingPage />} />
  <Route path="/presentation-audience/:sessionId" element={<PresentationAudience />} />

  {/* Catch-all */}
  <Route path="*" element={<NotFound />} />
</Routes>
```

### Navigation

**Programmatic Navigation**:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
navigate('/timeline');                // Navigate
navigate('/documents', { replace: true });  // Replace
navigate(-1);                         // Go back
```

**Link Component**:
```tsx
import { Link } from 'react-router-dom';

<Link to="/timeline" className="text-primary">
  Go to Timeline
</Link>
```

---

## Styling

### Tailwind CSS

**Utility-First Approach**:
```tsx
<div className="flex items-center justify-between p-4 bg-primary text-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold">Title</h2>
  <Button variant="outline" size="sm">Action</Button>
</div>
```

### Theme System

**CSS Variables** (`src/index.css`):
```css
:root {
  --primary: 213 74% 15%;           /* Deep Navy */
  --accent: 46 100% 50%;            /* Vibrant Gold */
  --secondary: 213 74% 20%;         /* Lighter Navy */
  --muted: 0 0% 97%;                /* Light Gray */
  --success: 165 98% 30%;           /* Teal */
}

.dark {
  --primary: 213 74% 85%;
  --accent: 46 100% 60%;
  /* ... dark mode colors */
}
```

**Using Theme Colors**:
```tsx
<div className="bg-primary text-primary-foreground">
  Primary background with contrasting text
</div>

<div className="bg-accent text-accent-foreground">
  Accent color (gold)
</div>
```

### Component Styling

**shadcn/ui Variants**:
```tsx
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>

<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

### Responsive Design

**Breakpoints**:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column mobile, 2 tablet, 3 desktop */}
</div>

<div className="text-sm md:text-base lg:text-lg">
  {/* Responsive text size */}
</div>
```

**Tailwind Breakpoints**:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

---

**Next Steps:**
- [Backend Guide →](../03-Backend/README.md)
- [Database Schema →](../04-Database/README.md)
- [AI Integration →](../05-AI-Integration/README.md)
