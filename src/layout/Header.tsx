import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp';
import { useOffline } from '@/hooks/useOffline';
import { useUserSettings } from '@/hooks/useUserSettings';
import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { offlineEnabled } = useOffline();
  const { modelPreference } = useUserSettings();

  const showBanner = offlineEnabled;

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="h-12 flex items-center justify-between border-b bg-background px-4 relative">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">AI Query Hub</h2>
      </div>
      
      <div className="flex items-center gap-2">
        <KeyboardShortcutsHelp />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="User menu">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {getInitials(user?.user_metadata?.full_name || user?.email || 'U')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{user?.user_metadata?.full_name || 'User'}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {showBanner && (
        <div className="absolute inset-x-0 top-full bg-yellow-500 dark:bg-yellow-600 text-white dark:text-yellow-50 text-center py-1 text-sm font-medium z-50">
          📶 You are currently using AI offline (Ollama). All processing is local.
        </div>
      )}
    </header>
  );
};

export default Header;
