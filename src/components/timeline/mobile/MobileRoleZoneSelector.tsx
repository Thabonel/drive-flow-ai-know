import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGestures } from '@/hooks/useGestures';
import { toast } from 'sonner';
import { Vibrate } from '@/lib/haptics';
import {
  RoleMode,
  ZoneContext,
  ROLE_MODE_DESCRIPTIONS,
  ZONE_CONTEXT_DESCRIPTIONS,
  ROLE_MODES,
  ZONE_CONTEXTS
} from '@/lib/attentionTypes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, Settings2, Zap } from 'lucide-react';

interface MobileRoleZoneSelectorProps {
  className?: string;
  onRoleChange?: (role: RoleMode) => void;
  onZoneChange?: (zone: ZoneContext) => void;
}

export function MobileRoleZoneSelector({
  className,
  onRoleChange,
  onZoneChange
}: MobileRoleZoneSelectorProps) {
  const [currentRole, setCurrentRole] = useState<RoleMode>(ROLE_MODES.MAKER);
  const [currentZone, setCurrentZone] = useState<ZoneContext>(ZONE_CONTEXTS.PEACETIME);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isRoleSheetOpen, setIsRoleSheetOpen] = useState(false);
  const [isZoneSheetOpen, setIsZoneSheetOpen] = useState(false);
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);

  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Load current preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const response = await fetch('/functions/v1/attention-preferences', {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.preferences) {
            setCurrentRole(data.preferences.current_role);
            setCurrentZone(data.preferences.current_zone);
          }
        }
      } catch (error) {
        console.error('Error loading attention preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const updatePreferences = async (updates: { current_role?: RoleMode; current_zone?: ZoneContext }) => {
    if (!user || updating) return;

    setUpdating(true);

    // Haptic feedback
    Vibrate.selection();

    try {
      const response = await fetch('/functions/v1/attention-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setCurrentRole(data.preferences.current_role);
          setCurrentZone(data.preferences.current_zone);

          // Trigger callbacks
          if (updates.current_role) {
            onRoleChange?.(updates.current_role);
            const roleDesc = ROLE_MODE_DESCRIPTIONS[updates.current_role];
            toast.success(`Switched to ${roleDesc.label}`, {
              description: roleDesc.description
            });
          }

          if (updates.current_zone) {
            onZoneChange?.(updates.current_zone);
            const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[updates.current_zone];
            toast.success(`Switched to ${zoneDesc.label}`, {
              description: zoneDesc.description
            });
          }

          // Success haptic
          Vibrate.success();
        }
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating attention preferences:', error);
      toast.error('Failed to update role/zone preferences');
      Vibrate.error();
    } finally {
      setUpdating(false);
    }
  };

  // Gesture handling for quick switching
  const { isGesturing } = useGestures([
    {
      type: 'swipe',
      action: 'navigate',
      callback: (gesture) => {
        if (gesture.direction === 'left') {
          // Quick switch to next role
          const roleValues = Object.values(ROLE_MODES);
          const currentIndex = roleValues.indexOf(currentRole);
          const nextRole = roleValues[(currentIndex + 1) % roleValues.length];
          updatePreferences({ current_role: nextRole });
        } else if (gesture.direction === 'right') {
          // Quick switch to previous role
          const roleValues = Object.values(ROLE_MODES);
          const currentIndex = roleValues.indexOf(currentRole);
          const prevRole = roleValues[(currentIndex - 1 + roleValues.length) % roleValues.length];
          updatePreferences({ current_role: prevRole });
        } else if (gesture.direction === 'up') {
          // Toggle zone
          const newZone = currentZone === ZONE_CONTEXTS.PEACETIME
            ? ZONE_CONTEXTS.WARTIME
            : ZONE_CONTEXTS.PEACETIME;
          updatePreferences({ current_zone: newZone });
        }
      }
    },
    {
      type: 'longpress',
      action: 'edit',
      callback: () => {
        setShowQuickSwitch(true);
        Vibrate.heavy();
      }
    }
  ]);

  const handleRoleChange = (role: RoleMode) => {
    updatePreferences({ current_role: role });
    setIsRoleSheetOpen(false);
  };

  const handleZoneChange = (zone: ZoneContext) => {
    updatePreferences({ current_zone: zone });
    setIsZoneSheetOpen(false);
  };

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-10 w-12 bg-muted animate-pulse rounded-xl"></div>
        <div className="h-10 w-12 bg-muted animate-pulse rounded-xl"></div>
      </div>
    );
  }

  const roleDesc = ROLE_MODE_DESCRIPTIONS[currentRole];
  const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[currentZone];

  if (!isMobile) {
    // Fall back to desktop version for larger screens
    return null;
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Compact Role Button */}
        <Sheet open={isRoleSheetOpen} onOpenChange={setIsRoleSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`
                h-12 px-3 gap-2 rounded-2xl shadow-neu-raised transition-all duration-150
                ${isGesturing ? 'scale-95' : 'hover:scale-105'}
                ${updating ? 'opacity-50' : ''}
              `}
              disabled={updating}
            >
              <span className="text-lg">{roleDesc.icon}</span>
              <span className="text-xs font-medium">{roleDesc.label}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Choose Role Mode
              </SheetTitle>
              <SheetDescription>
                Select your current working mode to optimize attention budgets
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-6 h-full">
              <div className="space-y-3">
                {Object.values(ROLE_MODES).map((mode) => {
                  const desc = ROLE_MODE_DESCRIPTIONS[mode];
                  const isSelected = mode === currentRole;

                  return (
                    <Card
                      key={mode}
                      className={`
                        cursor-pointer transition-all duration-200 border-2
                        ${isSelected
                          ? 'border-primary shadow-neu-pressed bg-primary/5'
                          : 'border-transparent shadow-neu-flat hover:shadow-neu-raised'
                        }
                      `}
                      onClick={() => handleRoleChange(mode)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{desc.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{desc.label}</h3>
                              {isSelected && (
                                <Badge variant="default" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {desc.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Compact Zone Button */}
        <Sheet open={isZoneSheetOpen} onOpenChange={setIsZoneSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`
                h-12 px-3 gap-2 rounded-2xl shadow-neu-raised transition-all duration-150
                ${isGesturing ? 'scale-95' : 'hover:scale-105'}
                ${updating ? 'opacity-50' : ''}
                ${currentZone === ZONE_CONTEXTS.WARTIME ? 'border-destructive text-destructive' : ''}
              `}
              disabled={updating}
            >
              <span className="text-lg">{zoneDesc.icon}</span>
              <span className="text-xs font-medium">{zoneDesc.label}</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[50vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Choose Zone Context
              </SheetTitle>
              <SheetDescription>
                Set your current work environment and focus level
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="mt-6 h-full">
              <div className="space-y-3">
                {Object.values(ZONE_CONTEXTS).map((zone) => {
                  const desc = ZONE_CONTEXT_DESCRIPTIONS[zone];
                  const isSelected = zone === currentZone;
                  const isWartime = zone === ZONE_CONTEXTS.WARTIME;

                  return (
                    <Card
                      key={zone}
                      className={`
                        cursor-pointer transition-all duration-200 border-2
                        ${isSelected
                          ? `border-${isWartime ? 'destructive' : 'primary'} shadow-neu-pressed ${isWartime ? 'bg-destructive/5' : 'bg-primary/5'}`
                          : 'border-transparent shadow-neu-flat hover:shadow-neu-raised'
                        }
                      `}
                      onClick={() => handleZoneChange(zone)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{desc.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{desc.label}</h3>
                              {isSelected && (
                                <Badge
                                  variant={isWartime ? "destructive" : "default"}
                                  className="text-xs"
                                >
                                  Active
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {desc.description}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>

        {/* Status Indicator */}
        {(currentZone === ZONE_CONTEXTS.WARTIME || currentRole === ROLE_MODES.MULTIPLIER) && (
          <Badge
            variant={currentZone === ZONE_CONTEXTS.WARTIME ? "destructive" : "default"}
            className="text-xs px-2 py-1"
          >
            {currentZone === ZONE_CONTEXTS.WARTIME ? 'Focus' : 'Team'}
          </Badge>
        )}
      </div>

      {/* Quick Switch Dialog */}
      <Dialog open={showQuickSwitch} onOpenChange={setShowQuickSwitch}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Switch</DialogTitle>
            <DialogDescription>
              Swipe gestures enabled for quick role/zone switching
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm space-y-2">
              <p><strong>Swipe Left/Right:</strong> Switch roles</p>
              <p><strong>Swipe Up:</strong> Toggle wartime/peacetime</p>
              <p><strong>Long Press:</strong> Open this menu</p>
            </div>
            <Button onClick={() => setShowQuickSwitch(false)} className="w-full">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}