import { ExecutiveAssistantDashboard } from '@/components/assistant/ExecutiveAssistantDashboard';
import { PageHelp } from '@/components/PageHelp';

export default function AssistantManagement() {
  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Assistant Setup</h1>
          <p className="text-muted-foreground">
            Add and manage your human assistant
          </p>
        </div>
        <PageHelp
          title="Assistant Setup Help"
          description="Invite your human assistant to collaborate on your timeline and help manage your work."
          tips={[
            "Invite your assistant by email to access your timeline",
            "Delegate tasks to your assistant with instructions",
            "Your assistant can help with research, scheduling, and planning",
            "View delegation queue to track what's been assigned",
            "Assistants can prepare meeting briefs and summaries"
          ]}
        />
      </div>

      <ExecutiveAssistantDashboard />
    </div>
  );
}
