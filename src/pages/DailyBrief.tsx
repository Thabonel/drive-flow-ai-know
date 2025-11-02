import { AIDailyBrief } from '@/components/ai/AIDailyBrief';
import { PageHelp } from '@/components/PageHelp';

export default function DailyBrief() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Daily Brief</h1>
          <p className="text-muted-foreground">
            Your AI-powered summary of today's schedule and priorities
          </p>
        </div>
        <PageHelp
          title="Daily Brief Help"
          description="Your AI-powered daily brief summarizes your schedule, priorities, and important information to help you start your day informed and prepared."
          tips={[
            "Automatically generated each morning based on your timeline and tasks",
            "Reviews your calendar events and scheduled items",
            "Highlights top priorities and upcoming deadlines",
            "Suggests time allocation and focus areas",
            "Enable email delivery to receive briefs in your inbox"
          ]}
        />
      </div>

      <AIDailyBrief autoGenerate={true} />
    </div>
  );
}
