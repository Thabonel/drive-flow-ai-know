import { useState, useEffect } from 'react';
import { X, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasPromptBeenDismissed, setHasPromptBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the prompt before
    const dismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissed) {
      setHasPromptBeenDismissed(true);
      return;
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Detect Safari
    const isSafariBrowser = /safari/.test(userAgent) && !/chrome/.test(userAgent) && !/crios/.test(userAgent) && !/fxios/.test(userAgent);
    setIsSafari(isSafariBrowser);

    // Check if already installed (standalone mode)
    const isInStandaloneMode =
      ('standalone' in window.navigator && (window.navigator as any).standalone) ||
      window.matchMedia('(display-mode: standalone)').matches;
    setIsStandalone(isInStandaloneMode);

    // Show prompt if:
    // 1. On iOS device
    // 2. Not already in standalone mode
    // 3. Haven't dismissed before
    // Will show different content based on whether using Safari or not
    if (isIOSDevice && !isInStandaloneMode && !dismissed) {
      // Show after 5 seconds to not be intrusive
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const handleRemindLater = () => {
    setShowPrompt(false);
    // Don't set dismissed flag, so it shows again on next visit
  };

  if (!isIOS || isStandalone || hasPromptBeenDismissed) {
    return null;
  }

  return (
    <>
      {/* Floating Install Button - Always visible */}
      {!showPrompt && (
        <Button
          onClick={() => setShowPrompt(true)}
          className="fixed bottom-4 right-4 z-50 shadow-lg gap-2"
          size="lg"
        >
          <Smartphone className="h-5 w-5" />
          Install App
        </Button>
      )}

      {/* Installation Instructions Modal */}
      <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Install AI Query Hub
            </DialogTitle>
            <DialogDescription>
              Add this app to your home screen for a better experience
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!isSafari ? (
              <>
                {/* Non-Safari browser instructions */}
                <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    To install this app, you need to open it in Safari first.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Open Safari browser</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        PWA installation only works in Safari on iOS
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Navigate to this website</p>
                      <p className="mt-1 text-xs text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
                        {window.location.origin}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tap the Share button</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Share className="h-4 w-4" />
                        <span>Located at the bottom or top of Safari</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Select "Add to Home Screen"</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        <span>Scroll down if you don't see it immediately</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      5
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tap "Add"</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The app will appear on your home screen
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Safari browser instructions */}
                <Alert>
                  <AlertDescription>
                    Get the full app experience with offline access and faster loading!
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tap the Share button</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Share className="h-4 w-4" />
                        <span>Located at the bottom or top of Safari</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Select "Add to Home Screen"</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Plus className="h-4 w-4" />
                        <span>Scroll down if you don't see it immediately</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tap "Add"</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The app will appear on your home screen
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium mb-1">Why install?</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>• Full-screen experience (no browser bars)</li>
                    <li>• Faster loading with offline support</li>
                    <li>• Quick access from your home screen</li>
                    <li>• Feels like a native iPad app</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRemindLater}
              className="flex-1"
            >
              Remind Me Later
            </Button>
            <Button
              onClick={handleDismiss}
              className="flex-1"
            >
              Got It!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
