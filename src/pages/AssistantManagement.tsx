import { ExecutiveAssistantDashboard } from '@/components/assistant/ExecutiveAssistantDashboard';
import { AIQueryInput } from '@/components/AIQueryInput';
import { PageHelp } from '@/components/PageHelp';

export default function AssistantManagement() {
  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* AI Assistant */}
      <AIQueryInput />

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Executive Assistant</h1>
          <p className="text-muted-foreground">
            Manage your team of AI assistants and delegate tasks
          </p>
        </div>
        <PageHelp
          title="Executive Assistant Help"
          description="Manage your team of AI assistants. Invite human assistants, delegate tasks, and coordinate your workflow with both AI and human helpers."
          tips={[
            "Invite human assistants by email to collaborate on your timeline",
            "Delegate tasks to specific assistants with instructions",
            "AI assistants can help with research, scheduling, and planning",
            "View delegation queue to track what's been assigned",
            "Assistants can prepare meeting briefs and summaries"
          ]}
        />
      </div>

      <ExecutiveAssistantDashboard />
    </div>
  );
}
