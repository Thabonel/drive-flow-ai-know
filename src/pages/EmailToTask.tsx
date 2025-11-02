import { EmailToTaskManager } from '@/components/email/EmailToTaskManager';
import { AIQueryInput } from '@/components/AIQueryInput';
import { PageHelp } from '@/components/PageHelp';

export default function EmailToTask() {
  return (
    <div className="container py-8 space-y-6">
      {/* AI Assistant */}
      <AIQueryInput />

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Email to Task</h1>
          <p className="text-muted-foreground">
            Convert emails into timeline tasks automatically
          </p>
        </div>
        <PageHelp
          title="Email to Task Help"
          description="Forward emails to automatically convert them into timeline tasks. AI extracts key information, suggested times, and action items from your emails."
          tips={[
            "Each user gets a unique email address for forwarding",
            "Forward emails with meeting invites to auto-add to timeline",
            "AI extracts dates, times, and action items automatically",
            "Tasks appear in your timeline with estimated durations",
            "Review and edit converted tasks before confirming"
          ]}
        />
      </div>

      <EmailToTaskManager />
    </div>
  );
}
