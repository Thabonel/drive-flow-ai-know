import { SidebarTrigger } from '@/components/ui/sidebar';
import { useOffline } from '@/hooks/useOffline';
import { useUserSettings } from '@/hooks/useUserSettings';

const Header = () => {
  const { offlineEnabled } = useOffline();
  const { modelPreference } = useUserSettings();

  const showBanner = true; // Temporarily forced for testing

  return (
    <header className="h-12 flex items-center border-b bg-background px-4 relative">
      <SidebarTrigger />
      {showBanner && (
        <div className="absolute inset-x-0 top-full bg-yellow-300 text-yellow-900 text-center py-1 text-sm font-medium">
          📶 You are currently using AI offline (Ollama). All processing is local.
        </div>
      )}
    </header>
  );
};

export default Header;
