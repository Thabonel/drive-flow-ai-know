import { ExecutiveAssistantDashboard } from '@/components/assistant/ExecutiveAssistantDashboard';
import { AIQueryInput } from '@/components/AIQueryInput';

export default function AssistantManagement() {
  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-6">
      {/* AI Assistant */}
      <AIQueryInput />

      <ExecutiveAssistantDashboard />
    </div>
  );
}
