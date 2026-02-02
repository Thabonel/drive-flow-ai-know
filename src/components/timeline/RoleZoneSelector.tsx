import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
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

interface RoleZoneSelectorProps {
  className?: string;
  showLabels?: boolean;
  size?: 'sm' | 'default';
}

export function RoleZoneSelector({ className, showLabels = true, size = 'default' }: RoleZoneSelectorProps) {
  const [currentRole, setCurrentRole] = useState<RoleMode>(ROLE_MODES.MAKER);
  const [currentZone, setCurrentZone] = useState<ZoneContext>(ZONE_CONTEXTS.PEACETIME);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { user } = useAuth();

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

          // Show feedback about the change
          if (updates.current_role) {
            const roleDesc = ROLE_MODE_DESCRIPTIONS[updates.current_role];
            toast.success(`Switched to ${roleDesc.label} mode`, {
              description: roleDesc.description
            });
          }

          if (updates.current_zone) {
            const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[updates.current_zone];
            toast.success(`Switched to ${zoneDesc.label} mode`, {
              description: zoneDesc.description
            });
          }
        }
      } else {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Error updating attention preferences:', error);
      toast.error('Failed to update role/zone preferences');
    } finally {
      setUpdating(false);
    }
  };

  const handleRoleChange = (role: RoleMode) => {
    updatePreferences({ current_role: role });
  };

  const handleZoneChange = (zone: ZoneContext) => {
    updatePreferences({ current_zone: zone });
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
          <div className="h-8 w-16 bg-muted animate-pulse rounded"></div>
        </div>
      </div>
    );
  }

  const roleDesc = ROLE_MODE_DESCRIPTIONS[currentRole];
  const zoneDesc = ZONE_CONTEXT_DESCRIPTIONS[currentZone];

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Role Selector */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size={size}
                  className="gap-2"
                  disabled={updating}
                >
                  <span>{roleDesc.icon}</span>
                  {showLabels && <span>{roleDesc.label}</span>}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>{roleDesc.label}</strong></p>
              <p className="text-xs">{roleDesc.description}</p>
            </TooltipContent>
          </Tooltip>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Role Mode</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(ROLE_MODES).map((mode) => {
            const desc = ROLE_MODE_DESCRIPTIONS[mode];
            return (
              <DropdownMenuItem
                key={mode}
                onClick={() => handleRoleChange(mode)}
                className="flex flex-col items-start p-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <span>{desc.icon}</span>
                  <span className="font-medium">{desc.label}</span>
                  {mode === currentRole && (
                    <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">
                  {desc.description}
                </p>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

        {/* Zone Selector */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size={size}
                  className="gap-2"
                  disabled={updating}
                >
                  <span>{zoneDesc.icon}</span>
                  {showLabels && <span>{zoneDesc.label}</span>}
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p><strong>{zoneDesc.label}</strong></p>
              <p className="text-xs">{zoneDesc.description}</p>
            </TooltipContent>
          </Tooltip>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Zone Context</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.values(ZONE_CONTEXTS).map((zone) => {
            const desc = ZONE_CONTEXT_DESCRIPTIONS[zone];
            return (
              <DropdownMenuItem
                key={zone}
                onClick={() => handleZoneChange(zone)}
                className="flex flex-col items-start p-3"
              >
                <div className="flex items-center gap-2 w-full">
                  <span>{desc.icon}</span>
                  <span className="font-medium">{desc.label}</span>
                  {zone === currentZone && (
                    <Badge variant="secondary" className="ml-auto text-xs">Current</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-tight">
                  {desc.description}
                </p>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

        {/* Status Indicator */}
        {(currentZone === ZONE_CONTEXTS.WARTIME || currentRole === ROLE_MODES.MULTIPLIER) && (
          <Badge
            variant={currentZone === ZONE_CONTEXTS.WARTIME ? "destructive" : "default"}
            className="text-xs"
          >
            {currentZone === ZONE_CONTEXTS.WARTIME ? 'High Focus' : 'Delegation Mode'}
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}