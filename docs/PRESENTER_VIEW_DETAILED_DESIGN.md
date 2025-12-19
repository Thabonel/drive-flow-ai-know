# Dual-Display Presenter View Implementation Plan

## Executive Summary

Add a professional dual-display presenter mode to PitchDeck.tsx that separates presenter controls (laptop screen) from clean audience view (external display). Keep existing single-view mode for backward compatibility.

**Architecture Decision**: Use separate route (`/presentation-audience/:sessionId`) for audience view with BroadcastChannel API for real-time sync. This provides clean separation, allows true fullscreen via Fullscreen API, and enables independent window management.

---

## 1. Architecture Overview

### 1.1 Component Structure

```
PitchDeck.tsx (existing)
├── [Keep existing single-view presentation mode as-is]
├── [Add new dual-view mode trigger]
└── handleStartPresenterView() → Opens two windows

New: src/pages/PresentationAudience.tsx
├── Minimal fullscreen slide renderer
├── Listens to BroadcastChannel for slide changes
└── Auto-closes when presenter window closes

New: src/components/PresenterView.tsx
├── Grid layout: current slide + next preview + notes
├── Timer, slide counter, navigation controls
└── Broadcasts slide changes to audience window

New: src/lib/presentationSync.ts
├── BroadcastChannel wrapper with localStorage fallback
├── Message types: SLIDE_CHANGE, EXIT_PRESENTATION, SYNC_STATE
└── Cross-window state synchronization utilities
```

### 1.2 State Synchronization Strategy

**BroadcastChannel API (Primary)**:
- Modern, purpose-built for cross-tab/window communication
- Same-origin policy ensures security
- Automatic garbage collection when windows close
- No polling required (event-driven)

**localStorage (Fallback)**:
- For older browsers lacking BroadcastChannel support
- Use storage events for cross-window updates
- Cleanup on window close via beforeunload

**Minimum State to Sync**:
```typescript
interface PresentationState {
  sessionId: string;          // Unique ID for this presentation instance
  currentSlideIndex: number;   // Current slide being shown
  presentationStartTime: number; // Timestamp when presentation started
  isActive: boolean;           // Whether presentation is still running
}
```

---

## 2. Detailed Implementation Plan

### Phase 1: Core Infrastructure (30% of work)

#### Step 1.1: Create Presentation Sync Utility

**File**: `src/lib/presentationSync.ts`

**Purpose**: Centralized cross-window communication with BroadcastChannel + localStorage fallback.

**Key Functions**:
```typescript
// Message types
type PresentationMessage = 
  | { type: 'SLIDE_CHANGE'; index: number; timestamp: number }
  | { type: 'EXIT_PRESENTATION'; sessionId: string }
  | { type: 'SYNC_STATE'; state: PresentationState }
  | { type: 'HEARTBEAT'; timestamp: number };

// Main API
class PresentationSync {
  private channel?: BroadcastChannel;
  private sessionId: string;
  private isPresenter: boolean;
  
  constructor(sessionId: string, isPresenter: boolean)
  subscribe(handler: (msg: PresentationMessage) => void): () => void
  broadcast(message: PresentationMessage): void
  cleanup(): void
}

// Exports
export const createPresentationSync = (sessionId: string, isPresenter: boolean)
export const generateSessionId = () => crypto.randomUUID()
```

**Implementation Details**:
- Feature detect BroadcastChannel support: `'BroadcastChannel' in window`
- Channel name: `presentation-sync-${sessionId}`
- localStorage key: `presentation-state-${sessionId}`
- Heartbeat every 2 seconds from presenter to detect window close
- Auto-cleanup: Remove localStorage entry on presenter exit

**Why this approach?**
- BroadcastChannel is ~10x faster than localStorage events
- Fallback ensures compatibility with older browsers
- Session ID prevents cross-presentation conflicts
- Heartbeat pattern allows audience window to detect presenter disconnect

#### Step 1.2: Create Audience View Page

**File**: `src/pages/PresentationAudience.tsx`

**Purpose**: Minimal fullscreen slide renderer that mirrors presenter's current slide.

**Component Structure**:
```tsx
function PresentationAudience() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [state, setState] = useState<PresentationState | null>(null);
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Load presentation data from localStorage (passed from presenter)
  useEffect(() => {
    const data = localStorage.getItem(`presentation-data-${sessionId}`);
    if (data) setPitchDeck(JSON.parse(data));
  }, [sessionId]);
  
  // Subscribe to presentation sync
  useEffect(() => {
    const sync = createPresentationSync(sessionId!, false);
    const unsubscribe = sync.subscribe((msg) => {
      if (msg.type === 'SLIDE_CHANGE') {
        setState(prev => ({ ...prev!, currentSlideIndex: msg.index }));
      } else if (msg.type === 'EXIT_PRESENTATION') {
        window.close(); // Auto-close audience window
      }
    });
    return () => { unsubscribe(); sync.cleanup(); };
  }, [sessionId]);
  
  // Request fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.warn('Fullscreen request denied:', err);
        // Continue in CSS fullscreen mode
      }
    };
    enterFullscreen();
  }, []);
  
  // Render current slide (same logic as PitchDeck.tsx presentation mode)
  return <div className="fixed inset-0 bg-black">
    {/* Render slide based on state.currentSlideIndex */}
  </div>;
}
```

**Key Features**:
- No UI chrome (no controls, no timer, no notes)
- Auto-fullscreen on load using Fullscreen API
- Graceful fallback to CSS fullscreen if API denied
- Auto-close when presenter exits
- Listen-only mode (no user interaction needed)

**Why separate page?**
- Clean URL for window.open(): `/presentation-audience/${sessionId}`
- No props drilling or complex conditional rendering
- Can be opened before presenter window is ready
- Easier to request fullscreen (must be user-initiated, tied to window open)

#### Step 1.3: Add Route for Audience View

**File**: `src/App.tsx`

**Changes**:
```tsx
// Add import
import PresentationAudience from "./pages/PresentationAudience";

// Add route (no auth required for simplicity, secured by sessionId)
<Route 
  path="/presentation-audience/:sessionId" 
  element={<PresentationAudience />} 
/>
```

**Why no auth?**
- Session ID acts as capability token (unguessable UUID)
- Simplifies cross-window flow (no need to pass auth state)
- Audience window may open before React Router ready
- Can add auth later if needed (check sessionId in database)

---

### Phase 2: Presenter View Component (30% of work)

#### Step 2.1: Create Presenter View Component

**File**: `src/components/PresenterView.tsx`

**Purpose**: Rich presenter interface with current slide, next preview, notes, timer, controls.

**Layout Design**:
```
┌────────────────────────────────────────────────┐
│  Timer: 12:34         Slide 5 / 12     [Exit] │  ← Header bar
├─────────────────────┬──────────────────────────┤
│                     │                          │
│   CURRENT SLIDE     │    NEXT SLIDE PREVIEW    │  ← Main area
│   (Large 60%)       │    (Small 40%)           │
│                     │                          │
├─────────────────────┴──────────────────────────┤
│  SPEAKER NOTES                                 │  ← Notes area
│  - Key point about this slide                  │    (scrollable)
│  - Remember to pause here                      │
├────────────────────────────────────────────────┤
│  [← Previous]              [Next →]            │  ← Navigation
└────────────────────────────────────────────────┘
```

**Component Interface**:
```tsx
interface PresenterViewProps {
  pitchDeck: PitchDeck;
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  onExit: () => void;
  presentationStartTime: number;
}

function PresenterView({
  pitchDeck,
  currentSlideIndex,
  onSlideChange,
  onExit,
  presentationStartTime
}: PresenterViewProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const prevButtonRef = useRef<HTMLButtonElement>(null);
  
  // Timer (same as current implementation)
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - presentationStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [presentationStartTime]);
  
  // Keyboard navigation (delegate to buttons)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextButtonRef.current?.click();
      else if (e.key === 'ArrowLeft') prevButtonRef.current?.click();
      else if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);
  
  const currentSlide = currentSlideIndex === 0 
    ? { title: pitchDeck.title, content: pitchDeck.subtitle }
    : pitchDeck.slides[currentSlideIndex - 1];
  
  const nextSlide = currentSlideIndex < pitchDeck.slides.length
    ? pitchDeck.slides[currentSlideIndex]
    : null;
  
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 px-6 py-3 flex justify-between items-center">
        <span className="text-accent font-bold text-2xl">{formatTime(elapsedSeconds)}</span>
        <span className="text-white text-lg">
          Slide {currentSlideIndex} / {pitchDeck.slides.length}
        </span>
        <Button onClick={onExit} variant="ghost" className="text-white">
          Exit (ESC)
        </Button>
      </div>
      
      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-[60%_40%] gap-4 p-4">
        {/* Current Slide */}
        <div className="bg-black rounded-lg flex items-center justify-center p-8">
          <SlideRenderer slide={currentSlide} />
        </div>
        
        {/* Next Slide Preview */}
        <div className="flex flex-col gap-4">
          <div className="bg-black/50 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-white text-sm font-semibold mb-2">NEXT SLIDE:</h3>
            <div className="flex-1 flex items-center justify-center scale-75">
              {nextSlide ? (
                <SlideRenderer slide={nextSlide} />
              ) : (
                <span className="text-gray-500">End of Presentation</span>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Speaker Notes */}
      <div className="bg-gray-800 px-6 py-4 max-h-[200px] overflow-y-auto">
        <h4 className="text-white font-semibold mb-2">SPEAKER NOTES:</h4>
        <p className="text-gray-300 text-sm">
          {currentSlide?.notes || 'No notes for this slide.'}
        </p>
      </div>
      
      {/* Navigation Controls */}
      <div className="bg-black/80 px-6 py-4 flex justify-center gap-4">
        <Button
          ref={prevButtonRef}
          onClick={() => onSlideChange(Math.max(0, currentSlideIndex - 1))}
          disabled={currentSlideIndex === 0}
          variant="outline"
          size="lg"
          className="text-white border-white/20"
        >
          ← Previous
        </Button>
        <Button
          ref={nextButtonRef}
          onClick={() => onSlideChange(Math.min(pitchDeck.slides.length, currentSlideIndex + 1))}
          disabled={currentSlideIndex === pitchDeck.slides.length}
          variant="outline"
          size="lg"
          className="text-white border-white/20"
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
```

**SlideRenderer Sub-Component**:
```tsx
// Extract shared slide rendering logic
function SlideRenderer({ slide }: { slide: Slide | { title: string; content: string } }) {
  return (
    <div className="w-full max-w-4xl text-center">
      <h2 className="text-4xl font-bold text-white mb-4">{slide.title}</h2>
      {slide.imageData && (
        <img 
          src={`data:image/png;base64,${slide.imageData}`} 
          className="w-full max-h-64 object-contain rounded mb-4"
        />
      )}
      <div className="text-xl text-white/90 whitespace-pre-wrap">{slide.content}</div>
    </div>
  );
}
```

**Why this design?**
- **60/40 split**: Current slide large for reference, next slide visible for pacing
- **Fixed notes area**: Always visible, scrollable if long (no overlay toggle needed)
- **Top-level controls**: Timer/counter always visible, not hidden in overlay
- **Keyboard delegation**: Reuse existing pattern (refs + click) for consistency
- **Black background**: Professional, reduces eye strain in dark venues

---

### Phase 3: Dual-Window Orchestration (25% of work)

#### Step 3.1: Add Display Detection & User Choice

**File**: `src/pages/PitchDeck.tsx`

**New State**:
```tsx
const [showDisplayDialog, setShowDisplayDialog] = useState(false);
const [audienceWindow, setAudienceWindow] = useState<Window | null>(null);
const [presenterSessionId, setPresenterSessionId] = useState<string | null>(null);
```

**Display Detection**:
```tsx
function detectMultipleDisplays(): boolean {
  // Modern approach: Screen enumeration API (if available)
  if ('getScreenDetails' in window) {
    // Future API, not yet widely supported
    return false; // Fallback for now
  }
  
  // Heuristic: Check if available screen width > window width
  // Indicates external monitor (not foolproof but reasonable)
  const screenWidth = window.screen.availWidth;
  const windowWidth = window.innerWidth;
  
  // If screen is significantly wider than current window, likely multiple displays
  return screenWidth > windowWidth * 1.5;
}
```

**Display Choice Dialog**:
```tsx
{showDisplayDialog && (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Single Display Detected</CardTitle>
        <CardDescription>
          Choose which view to show on this screen:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={() => handleDisplayChoice('presenter')}
          className="w-full"
          size="lg"
        >
          Show Presenter View
          <p className="text-xs opacity-70">Current slide + Notes + Controls</p>
        </Button>
        <Button 
          onClick={() => handleDisplayChoice('audience')}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Show Audience View
          <p className="text-xs opacity-70">Clean fullscreen slides only</p>
        </Button>
      </CardContent>
    </Card>
  </div>
)}
```

#### Step 3.2: Implement Presenter View Launch Logic

**File**: `src/pages/PitchDeck.tsx`

**New Function**:
```tsx
const handleStartPresenterView = async () => {
  if (!pitchDeck) {
    toast.error('Please generate a pitch deck first');
    return;
  }
  
  // Generate unique session ID for this presentation instance
  const sessionId = generateSessionId();
  setPresenterSessionId(sessionId);
  
  // Store presentation data in localStorage for audience window to access
  localStorage.setItem(`presentation-data-${sessionId}`, JSON.stringify(pitchDeck));
  
  // Initialize sync channel
  const sync = createPresentationSync(sessionId, true); // true = is presenter
  
  // Detect multiple displays
  const hasMultipleDisplays = detectMultipleDisplays();
  
  if (!hasMultipleDisplays) {
    // Single display: Show dialog to choose which view to display
    setShowDisplayDialog(true);
    return;
  }
  
  // Multiple displays: Open audience window on external display
  try {
    const audienceUrl = `/presentation-audience/${sessionId}`;
    
    // Window features for external display
    // These hints may help OS place window on secondary monitor
    const features = [
      'width=1920',
      'height=1080',
      'left=1920',  // Assume external is to the right of primary
      'top=0',
      'toolbar=no',
      'location=no',
      'status=no',
      'menubar=no',
      'scrollbars=no'
    ].join(',');
    
    const newWindow = window.open(audienceUrl, 'presentation-audience', features);
    
    if (!newWindow) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }
    
    setAudienceWindow(newWindow);
    
    // Wait for audience window to load, then start presentation
    setTimeout(() => {
      setCurrentSlideIndex(0);
      setIsPresentationMode(true);
      setPresentationStartTime(Date.now());
      setElapsedSeconds(0);
      
      // Broadcast initial state
      sync.broadcast({
        type: 'SYNC_STATE',
        state: {
          sessionId,
          currentSlideIndex: 0,
          presentationStartTime: Date.now(),
          isActive: true
        }
      });
    }, 500);
    
  } catch (error) {
    console.error('Failed to open audience window:', error);
    toast.error('Failed to open presentation window');
  }
};

const handleDisplayChoice = (choice: 'presenter' | 'audience') => {
  setShowDisplayDialog(false);
  
  if (choice === 'presenter') {
    // Show presenter view in current window, open audience in background
    const audienceUrl = `/presentation-audience/${presenterSessionId}`;
    const newWindow = window.open(audienceUrl, 'presentation-audience', 'width=800,height=600');
    
    if (newWindow) {
      // Minimize/background the audience window (hint only, browser may ignore)
      newWindow.blur();
      window.focus();
      setAudienceWindow(newWindow);
    }
    
    // Start presenter mode in current window
    setCurrentSlideIndex(0);
    setIsPresentationMode(true);
    setPresentationStartTime(Date.now());
    
  } else {
    // Open presenter view in background, show audience in current window
    const presenterUrl = `${window.location.origin}/pitch-deck`; // Current page
    
    // Navigate current window to audience view
    window.location.href = `/presentation-audience/${presenterSessionId}`;
    
    // Note: This is tricky. May need to rethink this flow.
    // Alternative: Always show presenter view in current window, audience in popup.
    toast.info('Opening audience view...');
  }
};
```

**Why this approach?**
- **Session ID**: Prevents conflicts if multiple presentations running
- **localStorage**: Simple data transfer without URL params or API calls
- **Popup hints**: Left/width parameters hint OS to place on external display
- **Delay before broadcast**: Ensures audience window has loaded and subscribed
- **Single display handling**: Gives user control over which view to prioritize

**Limitation**: Window placement on specific displays is not guaranteed (browser/OS dependent). Future improvement could use experimental Window Placement API.

#### Step 3.3: Sync Slide Changes

**File**: `src/pages/PitchDeck.tsx`

**Update slide navigation handlers**:
```tsx
const handleNextSlide = () => {
  if (pitchDeck && currentSlideIndex < pitchDeck.slides.length) {
    const newIndex = currentSlideIndex + 1;
    setCurrentSlideIndex(newIndex);
    
    // Broadcast to audience window if in presenter mode
    if (presenterSessionId) {
      const sync = createPresentationSync(presenterSessionId, true);
      sync.broadcast({
        type: 'SLIDE_CHANGE',
        index: newIndex,
        timestamp: Date.now()
      });
    }
  }
};

const handlePreviousSlide = () => {
  if (currentSlideIndex > 0) {
    const newIndex = currentSlideIndex - 1;
    setCurrentSlideIndex(newIndex);
    
    // Broadcast to audience window
    if (presenterSessionId) {
      const sync = createPresentationSync(presenterSessionId, true);
      sync.broadcast({
        type: 'SLIDE_CHANGE',
        index: newIndex,
        timestamp: Date.now()
      });
    }
  }
};
```

**Update exit handler**:
```tsx
const handleExitPresentation = () => {
  // Broadcast exit to audience window
  if (presenterSessionId) {
    const sync = createPresentationSync(presenterSessionId, true);
    sync.broadcast({ type: 'EXIT_PRESENTATION', sessionId: presenterSessionId });
    sync.cleanup();
    
    // Close audience window if we opened it
    if (audienceWindow && !audienceWindow.closed) {
      audienceWindow.close();
    }
  }
  
  // Clean up localStorage
  if (presenterSessionId) {
    localStorage.removeItem(`presentation-data-${presenterSessionId}`);
    localStorage.removeItem(`presentation-state-${presenterSessionId}`);
  }
  
  // Reset state
  setIsPresentationMode(false);
  setCurrentSlideIndex(0);
  setPresentationStartTime(null);
  setElapsedSeconds(0);
  setPresenterSessionId(null);
  setAudienceWindow(null);
};
```

#### Step 3.4: Update Presentation Mode Rendering

**File**: `src/pages/PitchDeck.tsx`

**Replace current presentation overlay (lines 1556-1662) with**:
```tsx
{isPresentationMode && pitchDeck && presenterSessionId && (
  // Presenter view mode (dual-window)
  <PresenterView
    pitchDeck={pitchDeck}
    currentSlideIndex={currentSlideIndex}
    onSlideChange={(index) => {
      setCurrentSlideIndex(index);
      const sync = createPresentationSync(presenterSessionId, true);
      sync.broadcast({ type: 'SLIDE_CHANGE', index, timestamp: Date.now() });
    }}
    onExit={handleExitPresentation}
    presentationStartTime={presentationStartTime!}
  />
)}

{isPresentationMode && pitchDeck && !presenterSessionId && (
  // Keep existing single-view fullscreen mode for backward compatibility
  <div ref={presentationRef} className="fixed inset-0 bg-black z-50 flex flex-col">
    {/* Existing presentation mode code (lines 1562-1662) */}
  </div>
)}
```

**Why conditional on sessionId?**
- `presenterSessionId` presence indicates dual-window mode
- Absence means single-window mode (existing behavior)
- Allows graceful coexistence of both modes

---

### Phase 4: UI Integration (10% of work)

#### Step 4.1: Add Presenter View Button

**File**: `src/pages/PitchDeck.tsx`

**Location**: After "Start Presentation" button (line 1332)

```tsx
{pitchDeck && (
  <div className="space-y-2">
    <Button
      onClick={handleStartPresentation}
      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
      size="lg"
    >
      <Presentation className="h-5 w-5 mr-2" />
      Start Presentation
    </Button>
    
    {/* NEW BUTTON */}
    <Button
      onClick={handleStartPresenterView}
      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      size="lg"
    >
      <Eye className="h-5 w-5 mr-2" />
      Start Presenter View
    </Button>
    
    <Button
      onClick={handleSave}
      className="w-full"
      disabled={isSaving}
    >
      {/* Existing save button */}
    </Button>
  </div>
)}
```

**Visual Distinction**:
- Single-view: Gold/Accent color (existing)
- Dual-view: Navy/Primary color (new)
- Icons: Presentation (single) vs Eye (dual)

#### Step 4.2: Add Help Text

**File**: `src/pages/PitchDeck.tsx`

**Update PageHelp content** (around line 1018):
```tsx
const helpContent = [
  "Generate professional pitch decks with AI assistance",
  "Select documents from your knowledge base to inform content",
  "Click 'Start Presentation' for single-screen fullscreen mode",
  "Click 'Start Presenter View' for dual-display mode with speaker notes",
  "Use arrow keys to navigate slides during presentation",
  "Export to PDF, PowerPoint, or share via link"
];
```

---

### Phase 5: Edge Cases & Error Handling (5% of work)

#### Step 5.1: Handle Popup Blockers

```tsx
const handleStartPresenterView = async () => {
  // ... existing code ...
  
  const newWindow = window.open(audienceUrl, 'presentation-audience', features);
  
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    // Popup blocked
    toast.error(
      'Popup blocked! Please allow popups for this site, then try again.',
      { duration: 5000 }
    );
    
    // Show instructions
    setShowPopupBlockedDialog(true);
    return;
  }
  
  // ... continue ...
};
```

**Popup Blocked Dialog**:
```tsx
{showPopupBlockedDialog && (
  <Dialog open onOpenChange={() => setShowPopupBlockedDialog(false)}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Enable Popups</DialogTitle>
        <DialogDescription>
          Presenter View requires opening a separate window for the audience display.
          <br/><br/>
          To enable:
          <ol className="list-decimal ml-4 mt-2">
            <li>Look for popup blocker icon in address bar</li>
            <li>Click "Always allow popups from this site"</li>
            <li>Try "Start Presenter View" again</li>
          </ol>
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
)}
```

#### Step 5.2: Handle Audience Window Closed Early

**File**: `src/pages/PitchDeck.tsx`

**Add window close detector**:
```tsx
useEffect(() => {
  if (!audienceWindow || !presenterSessionId) return;
  
  const checkInterval = setInterval(() => {
    if (audienceWindow.closed) {
      toast.warning('Audience window was closed', {
        description: 'You can continue using presenter view or reopen the window',
        action: {
          label: 'Reopen',
          onClick: () => {
            const url = `/presentation-audience/${presenterSessionId}`;
            const newWin = window.open(url, 'presentation-audience', '...');
            if (newWin) setAudienceWindow(newWin);
          }
        }
      });
      
      clearInterval(checkInterval);
      setAudienceWindow(null);
    }
  }, 1000);
  
  return () => clearInterval(checkInterval);
}, [audienceWindow, presenterSessionId]);
```

#### Step 5.3: Handle Fullscreen Permission Denied

**File**: `src/pages/PresentationAudience.tsx`

```tsx
useEffect(() => {
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      // Permission denied or not supported
      console.warn('Fullscreen not available:', err);
      
      // Fallback: CSS-based fullscreen
      setIsFullscreen(false);
      
      // Show brief notification
      toast.info('Press F11 for fullscreen', { duration: 3000 });
    }
  };
  
  // Delay slightly to ensure user gesture context
  setTimeout(enterFullscreen, 100);
}, []);

// Fallback CSS if true fullscreen fails
<div 
  className={cn(
    "fixed inset-0 bg-black z-50",
    !isFullscreen && "cursor-none" // Hide cursor in CSS fullscreen
  )}
>
```

#### Step 5.4: Handle BroadcastChannel Unavailable

**File**: `src/lib/presentationSync.ts`

```tsx
class PresentationSync {
  constructor(sessionId: string, isPresenter: boolean) {
    this.sessionId = sessionId;
    this.isPresenter = isPresenter;
    
    if ('BroadcastChannel' in window) {
      // Modern approach
      this.channel = new BroadcastChannel(`presentation-sync-${sessionId}`);
      this.useFallback = false;
    } else {
      // Fallback to localStorage + storage events
      this.useFallback = true;
      console.warn('BroadcastChannel not supported, using localStorage fallback');
    }
  }
  
  broadcast(message: PresentationMessage) {
    if (this.useFallback) {
      // Write to localStorage
      const key = `presentation-msg-${this.sessionId}`;
      localStorage.setItem(key, JSON.stringify({
        ...message,
        timestamp: Date.now()
      }));
      
      // Immediately remove to trigger storage event again on next write
      setTimeout(() => localStorage.removeItem(key), 10);
    } else {
      this.channel!.postMessage(message);
    }
  }
  
  subscribe(handler: (msg: PresentationMessage) => void) {
    if (this.useFallback) {
      const storageHandler = (e: StorageEvent) => {
        if (e.key === `presentation-msg-${this.sessionId}` && e.newValue) {
          handler(JSON.parse(e.newValue));
        }
      };
      window.addEventListener('storage', storageHandler);
      return () => window.removeEventListener('storage', storageHandler);
    } else {
      const messageHandler = (e: MessageEvent) => handler(e.data);
      this.channel!.addEventListener('message', messageHandler);
      return () => this.channel!.removeEventListener('message', messageHandler);
    }
  }
}
```

---

## 3. Testing Plan

### 3.1 Manual Test Cases

**Test Case 1: Dual-Display Happy Path**
1. Connect external monitor
2. Generate pitch deck
3. Click "Start Presenter View"
4. Verify audience window opens on external display (or can be dragged there)
5. Verify audience window enters fullscreen automatically
6. Navigate slides using keyboard (arrow keys)
7. Verify both windows stay in sync
8. Verify timer updates in real-time
9. Verify next slide preview shows correct upcoming slide
10. Verify speaker notes display correctly
11. Click "Exit" in presenter view
12. Verify both windows close gracefully

**Test Case 2: Single-Display Mode**
1. Disconnect external monitor (or test on laptop only)
2. Generate pitch deck
3. Click "Start Presenter View"
4. Verify dialog appears asking which view to show
5. Choose "Presenter View"
6. Verify presenter view shows in current window
7. Verify audience window opens but stays in background
8. Navigate slides and verify sync
9. Exit presentation

**Test Case 3: Popup Blocker**
1. Enable popup blocker in browser
2. Click "Start Presenter View"
3. Verify error message appears
4. Verify instructions are clear
5. Disable popup blocker
6. Retry and verify success

**Test Case 4: Audience Window Closed Early**
1. Start presenter view with dual windows
2. Manually close audience window
3. Verify warning appears in presenter view
4. Click "Reopen" action in toast
5. Verify audience window reopens and resumes sync

**Test Case 5: Fullscreen Denied**
1. Deny fullscreen permission in browser (Settings > Permissions)
2. Start presenter view
3. Verify audience window shows fallback message
4. Verify CSS fullscreen still provides clean view
5. Verify F11 hint appears

**Test Case 6: Backward Compatibility**
1. Click "Start Presentation" (old single-view button)
2. Verify existing fullscreen mode works unchanged
3. Verify keyboard shortcuts work (arrows, N for notes, ESC)
4. Verify no audience window opens
5. Exit and verify clean state

### 3.2 Browser Compatibility

**Priority Browsers**:
- Chrome/Edge 90+ (BroadcastChannel supported)
- Firefox 85+ (BroadcastChannel supported)
- Safari 15.4+ (BroadcastChannel supported)

**Fallback Browsers**:
- Safari 13-15.3 (localStorage fallback)
- Older Chrome/Firefox (localStorage fallback)

### 3.3 Performance Checks

- BroadcastChannel latency: < 50ms slide change propagation
- Timer drift: < 1 second difference after 30 min presentation
- Memory: No leaks after 100+ slide changes
- Cleanup: All intervals/listeners removed on exit

---

## 4. File Change Summary

### Files to Create (3 new files)

1. **src/lib/presentationSync.ts** (150 lines)
   - BroadcastChannel wrapper with localStorage fallback
   - Cross-window messaging API
   - Session management utilities

2. **src/pages/PresentationAudience.tsx** (120 lines)
   - Minimal fullscreen slide renderer
   - Sync subscription and state management
   - Auto-fullscreen logic

3. **src/components/PresenterView.tsx** (200 lines)
   - Rich presenter interface layout
   - Current slide + next preview + notes
   - Timer, navigation, keyboard shortcuts

### Files to Modify (2 existing files)

4. **src/pages/PitchDeck.tsx** (changes across multiple sections)
   - Add state: `presenterSessionId`, `audienceWindow`, `showDisplayDialog`
   - Add functions: `handleStartPresenterView()`, `handleDisplayChoice()`, `detectMultipleDisplays()`
   - Update functions: `handleNextSlide()`, `handlePreviousSlide()`, `handleExitPresentation()`
   - Add UI: "Start Presenter View" button, display choice dialog, popup blocker dialog
   - Update presentation rendering: Conditional between PresenterView and existing fullscreen
   - Add imports: PresenterView, presentationSync utilities

5. **src/App.tsx** (1 line added)
   - Add route: `/presentation-audience/:sessionId`

---

## 5. Implementation Order

**Recommended sequence** (can parallelize some steps):

1. **Day 1: Infrastructure**
   - Create `presentationSync.ts` (with tests in browser console)
   - Create `PresentationAudience.tsx` (can test standalone with mock data)
   - Add route in `App.tsx`
   - Test: Manually navigate to `/presentation-audience/test-123` and verify render

2. **Day 2: Presenter View**
   - Create `PresenterView.tsx` component
   - Extract `SlideRenderer` shared logic
   - Test: Render in Storybook or isolated page with mock props
   - Verify layout, keyboard nav, timer

3. **Day 3: Integration**
   - Add state and handlers to `PitchDeck.tsx`
   - Implement `handleStartPresenterView()`
   - Add "Start Presenter View" button
   - Test: End-to-end dual-window flow

4. **Day 4: Edge Cases & Polish**
   - Add display detection and dialog
   - Implement popup blocker handling
   - Add audience window close detector
   - Update help text and UI copy
   - Test: All edge cases from testing plan

5. **Day 5: QA & Documentation**
   - Cross-browser testing
   - Performance checks
   - Update README or user docs
   - Create demo video/screenshots

---

## 6. Architecture Rationale

### Why BroadcastChannel over alternatives?

**Alternatives considered**:

1. **URL Parameters**: Pass state in audience window URL
   - ❌ Con: One-way communication only
   - ❌ Con: Requires polling or WebSocket for updates
   - ❌ Con: URL length limits

2. **WebSocket/Server-Sent Events**: Real-time server connection
   - ❌ Con: Requires backend infrastructure
   - ❌ Con: Adds latency (client → server → client)
   - ❌ Con: Overkill for same-device communication

3. **SharedWorker**: Shared background thread
   - ❌ Con: Complex API, harder to debug
   - ❌ Con: Not supported in Safari
   - ❌ Con: Requires worker script file

4. **localStorage + polling**: Check for changes every 100ms
   - ⚠️  Con: High CPU usage, battery drain
   - ⚠️  Con: Introduces latency
   - ✅ Pro: Universal browser support

5. **localStorage + storage events**: React to changes
   - ✅ Pro: Event-driven, low overhead
   - ✅ Pro: Universal browser support
   - ⚠️  Con: Slightly slower than BroadcastChannel (~10-50ms)

6. **BroadcastChannel**: Purpose-built for cross-tab messaging
   - ✅ Pro: Fastest, event-driven, low overhead
   - ✅ Pro: Designed for this exact use case
   - ✅ Pro: Automatic cleanup, no memory leaks
   - ⚠️  Con: Not in Safari < 15.4

**Decision**: BroadcastChannel primary + localStorage fallback
- Best of both worlds: Speed for modern browsers, compatibility for legacy
- Clean API, easy to test, future-proof

### Why separate route over inline rendering?

**Alternatives considered**:

1. **Inline modal in PitchDeck.tsx**: Conditional render audience view
   - ❌ Con: Can't window.open() a React component
   - ❌ Con: Requires ReactDOM.render() in new window (complex)
   - ❌ Con: Fullscreen API harder to trigger

2. **Data URL with HTML**: Generate HTML string, open in new window
   - ❌ Con: Can't share React components/state easily
   - ❌ Con: Hard to maintain, CSS duplicated
   - ❌ Con: No HMR during development

3. **Separate route**: `/presentation-audience/:sessionId`
   - ✅ Pro: Clean URL, works with window.open()
   - ✅ Pro: Fullscreen API easy to trigger (user gesture = opening window)
   - ✅ Pro: Independent rendering, no props drilling
   - ✅ Pro: Can be bookmarked/refreshed during dev

**Decision**: Separate route is cleanest, most maintainable

### Why not use Window Placement API?

**Window Placement API** (experimental):
```typescript
const screens = await window.getScreenDetails();
const externalScreen = screens.screens.find(s => !s.isPrimary);
window.open(url, '_blank', `left=${externalScreen.left},top=${externalScreen.top}`);
```

**Limitations**:
- Only in Chrome 100+ (not Firefox, Safari)
- Requires user permission prompt
- Still experimental, API may change

**Decision**: Use for future enhancement, not v1. Current heuristics (window hints) work "good enough" for majority of users.

---

## 7. Critical Files for Implementation

Below are the 3-5 most critical files for implementing this plan, with reasoning:

1. **src/lib/presentationSync.ts** - [NEW FILE - Core infrastructure]
   - Centralized cross-window communication logic
   - Must be created first as dependency for other components
   - Encapsulates BroadcastChannel + localStorage fallback complexity
   - Most reusable piece (could be used for other multi-window features)

2. **src/pages/PitchDeck.tsx** - [MODIFY - Main orchestration]
   - Entry point for dual-window mode
   - Contains all state management and window lifecycle logic
   - Integrates new button, handlers, and conditional rendering
   - Most complex changes (spans multiple sections of large file)

3. **src/pages/PresentationAudience.tsx** - [NEW FILE - Audience view]
   - Minimal but critical for audience display
   - Must handle fullscreen API and graceful fallbacks
   - Demonstrates clean separation of concerns
   - Pattern to follow for slide rendering consistency

4. **src/components/PresenterView.tsx** - [NEW FILE - Presenter interface]
   - Most visible new feature (rich UI layout)
   - Reference implementation for grid layout, timer, notes display
   - Shows how to reuse existing slide rendering logic
   - Key for UX quality (speaker notes visibility, next slide preview)

5. **src/App.tsx** - [MODIFY - Routing config]
   - Simple but essential 1-line change
   - Enables `/presentation-audience/:sessionId` route
   - Pattern to follow: Public route (no auth wrapper) for simplicity
