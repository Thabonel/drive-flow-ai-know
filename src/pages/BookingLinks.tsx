import { BookingLinkManager } from '@/components/booking/BookingLinkManager';
import { AIQueryInput } from '@/components/AIQueryInput';
import { PageHelp } from '@/components/PageHelp';

export default function BookingLinks() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* AI Assistant */}
      <AIQueryInput />

      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Booking Links</h1>
          <p className="text-muted-foreground">
            Create shareable links for others to book time with you
          </p>
        </div>
        <PageHelp
          title="Booking Links Help"
          description="Create shareable booking links so others can schedule time with you. Links automatically integrate with your timeline and respect your availability."
          tips={[
            "Create multiple booking link types (15min, 30min, 1hr, etc.)",
            "Set availability windows and buffer times between meetings",
            "Bookings automatically appear in your timeline",
            "Customize confirmation messages and pre-meeting questions",
            "Share links via email, website, or social media"
          ]}
        />
      </div>

      <BookingLinkManager />
    </div>
  );
}
