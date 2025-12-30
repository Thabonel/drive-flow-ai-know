import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Cpu } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentModeToggleProps {
  userId: string;
}

export function AgentModeToggle({ userId }: AgentModeToggleProps) {
  const [agentMode, setAgentMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAgentMode();
  }, [userId]);

  const fetchAgentMode = async () => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('agent_mode')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setAgentMode(data?.agent_mode ?? false);
    } catch (error) {
      console.error('Failed to fetch agent mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to load agent mode setting',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ agent_mode: enabled })
        .eq('user_id', userId);

      if (error) throw error;

      setAgentMode(enabled);
      toast({
        title: enabled ? 'Agent Mode Activated' : 'Agent Mode Deactivated',
        description: enabled
          ? 'Your AI assistant will now proactively help manage your day'
          : 'Switched back to manual assistant mode',
      });
    } catch (error) {
      console.error('Failed to toggle agent mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to update agent mode setting',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading agent mode...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor="agent-mode" className="text-base font-semibold">
              Agent Assistant Mode
            </Label>
            {agentMode && <Cpu className="h-4 w-4 text-accent" />}
          </div>
          <p className="text-sm text-muted-foreground">
            Enable autonomous AI assistance for proactive task management
          </p>
        </div>
        <Switch
          id="agent-mode"
          checked={agentMode}
          onCheckedChange={handleToggle}
          disabled={updating}
        />
      </div>

      {agentMode && (
        <Alert className="border-accent/20 bg-accent/5">
          <Cpu className="h-4 w-4 text-accent" />
          <AlertDescription>
            <strong>Agent mode is active.</strong> Your AI assistant will:
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm">
              <li>Monitor your calendar for upcoming events</li>
              <li>Generate daily briefings automatically</li>
              <li>Suggest task prioritization</li>
              <li>Proactively analyze your workload</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!agentMode && (
        <p className="text-sm text-muted-foreground">
          Currently in manual mode. Toggle on to enable autonomous assistance.
        </p>
      )}
    </div>
  );
}
