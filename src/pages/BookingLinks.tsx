import { BookingLinkManager } from '@/components/booking/BookingLinkManager';
import { AIQueryInput } from '@/components/AIQueryInput';

export default function BookingLinks() {
  return (
    <div className="space-y-6">
      {/* AI Assistant */}
      <AIQueryInput />

      <BookingLinkManager />
    </div>
  );
}
