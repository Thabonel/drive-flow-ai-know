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
          description="Your AI-powered daily brief summarizes your schedule, priorities, and key information to help you start each day prepared and focused."
          tips={[
            "Auto-generates based on your timeline items and scheduled tasks",
            "Reviews upcoming calendar events and deadlines",
            "Highlights your top priorities for the day",
            "Provides time allocation suggestions and focus areas",
            "Regenerate anytime to get updated information"
          ]}
        />
      </div>

      <AIDailyBrief autoGenerate={true} />
    </div>
  );
}
