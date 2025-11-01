import { EmailToTaskManager } from '@/components/email/EmailToTaskManager';
import { AIQueryInput } from '@/components/AIQueryInput';

export default function EmailToTask() {
  return (
    <div className="container py-8 space-y-6">
      {/* AI Assistant */}
      <AIQueryInput />

      <EmailToTaskManager />
    </div>
  );
}
