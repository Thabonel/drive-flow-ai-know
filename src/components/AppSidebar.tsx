import { Home, FolderOpen, FileText, Brain, Settings, LogOut, RefreshCw, Upload, MessageSquare, HelpCircle, Clock, Users, FileCheck, Shield, ChevronDown } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMyExecutives, usePendingApprovals, useHasAssistantFeatures } from '@/lib/permissions';
import { useState, useEffect } from 'react';

const navigationItems = [
  { title: 'Your Day', url: '/timeline', icon: Clock },
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'AI Assistant', url: '/conversations', icon: MessageSquare },
  { title: 'Find Documents', url: '/documents', icon: FileText },
  { title: 'Add Documents', url: '/add-documents', icon: Upload },
  { title: 'Knowledge Bases', url: '/knowledge', icon: Brain },
  { title: 'Assistants', url: '/assistants', icon: Users },
  { title: 'Briefs', url: '/briefs', icon: FileCheck },
  { title: 'Audit Log', url: '/audit', icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  // Check if user has access to assistant features
  const hasAssistantFeatures = useHasAssistantFeatures();

  // Fetch executives if user is an assistant
  const { data: myExecutives } = useMyExecutives();
  const { data: pendingApprovals } = usePendingApprovals();

  // Executive selector state
  const [activeExecutiveId, setActiveExecutiveId] = useState<string | null>(
    localStorage.getItem('active-executive-id')
  );

  useEffect(() => {
    if (activeExecutiveId) {
      localStorage.setItem('active-executive-id', activeExecutiveId);
    } else {
      localStorage.removeItem('active-executive-id');
    }
  }, [activeExecutiveId]);

  const handleExecutiveChange = (executiveId: string) => {
    if (executiveId === 'none') {
      setActiveExecutiveId(null);
    } else {
      setActiveExecutiveId(executiveId);
    }
  };

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50';

  // Filter navigation items based on subscription tier
  const filteredNavigationItems = navigationItems.filter(item => {
    // Hide assistant-only features for non-executive tiers
    const assistantOnlyPages = ['/assistants', '/briefs', '/audit'];
    if (assistantOnlyPages.includes(item.url) && !hasAssistantFeatures) {
      return false;
    }
    return true;
  });

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4 space-y-3">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-sidebar-primary" />
          {!collapsed && (
            <span className="font-semibold text-sidebar-foreground">
              AI Query Hub
            </span>
          )}
        </div>

        {/* Executive Selector for Assistants - Only show for executive tier */}
        {!collapsed && hasAssistantFeatures && myExecutives && myExecutives.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Acting as:</label>
            <Select value={activeExecutiveId || 'none'} onValueChange={handleExecutiveChange}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder="Select executive" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Personal Account</SelectItem>
                {myExecutives.map((rel: any) => (
                  <SelectItem key={rel.id} value={rel.executive_id}>
                    {rel.executive?.raw_user_meta_data?.full_name || rel.executive?.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center justify-between flex-1">
                          <span>{item.title}</span>
                          {item.title === 'Assistants' && hasAssistantFeatures && pendingApprovals && pendingApprovals.length > 0 && (
                            <Badge variant="destructive" className="ml-auto h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs">
                              {pendingApprovals.length}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/support" className={getNavCls}>
                <HelpCircle className="h-4 w-4" />
                {!collapsed && <span>Support</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink to="/settings" className={getNavCls}>
                <Settings className="h-4 w-4" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Sign Out</span>}
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}