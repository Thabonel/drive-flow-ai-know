import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { AgentAction } from '@/hooks/useAgentApproval';

interface ApprovalGateProps {
  isOpen: boolean;
  action: AgentAction | null;
  onApprove: (dontAskAgain: boolean) => void;
  onReject: () => void;
}

export function ApprovalGate({ isOpen, action, onApprove, onReject }: ApprovalGateProps) {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!action) return null;

  const getImpactIcon = () => {
    switch (action.impact) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'medium':
        return <Info className="h-5 w-5 text-accent" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-success" />;
    }
  };

  const getImpactBadge = () => {
    switch (action.impact) {
      case 'high':
        return <Badge variant="destructive">High Impact</Badge>;
      case 'medium':
        return <Badge className="bg-accent text-accent-foreground">Medium Impact</Badge>;
      case 'low':
        return <Badge variant="secondary">Low Impact</Badge>;
    }
  };

  const handleApprove = () => {
    onApprove(dontAskAgain);
    setDontAskAgain(false); // Reset for next time
  };

  const handleReject = () => {
    onReject();
    setDontAskAgain(false); // Reset for next time
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleReject()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getImpactIcon()}
            <DialogTitle>Agent Action Approval Required</DialogTitle>
          </div>
          <DialogDescription>
            Your AI assistant wants to perform the following action. Please review and approve or reject.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{action.title}</h4>
              {getImpactBadge()}
            </div>
            <p className="text-sm text-muted-foreground">{action.description}</p>
          </div>

          {/* Action Data Preview */}
          {Object.keys(action.data).length > 0 && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <p className="text-sm font-medium">Action Details:</p>
              <dl className="space-y-1 text-sm">
                {Object.entries(action.data).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="font-medium text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}:
                    </dt>
                    <dd className="flex-1">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Don't Ask Again Checkbox */}
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="dont-ask-again"
              checked={dontAskAgain}
              onCheckedChange={(checked) => setDontAskAgain(checked as boolean)}
            />
            <Label
              htmlFor="dont-ask-again"
              className="text-sm font-normal cursor-pointer"
            >
              Don't ask again for this type of action
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReject}>
            Reject
          </Button>
          <Button onClick={handleApprove} className="bg-accent hover:bg-accent/90">
            Approve & Execute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
