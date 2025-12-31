import { Home, FileText, BookOpen, Settings, LogOut, HelpCircle, Clock, Users, UserCog, Building2, Calendar, Bot, MessageSquare, Presentation, Plus } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePresentationMode } from '@/contexts/PresentationModeContext';
import { FeatureGate } from '@/components/FeatureGate';
import { TeamSwitcher } from '@/components/TeamSwitcher';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navigationItems = [
  {
    title: 'Timeline',
    url: '/timeline',
    icon: Clock,
    description: 'Plan your day & track tasks'
  },
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: BookOpen,
    description: 'Overview & quick actions'
  },
  {
    title: 'Documents',
    url: '/documents',
    icon: FileText,
    description: 'Browse & manage files'
  },
  {
    title: 'Pitch Deck',
    url: '/pitch-deck',
    icon: Presentation,
    description: 'Create presentations'
  },
];

const assistantNavigationItems = [
  {
    title: 'Agent Mode',
    url: '/agent',
    icon: Bot,
    description: 'Autonomous AI assistant'
  },
  {
    title: 'AI Chat',
    url: '/conversations',
    icon: MessageSquare,
    description: 'Ask questions & get insights'
  },
];

const executiveNavigationItems = [
  { title: 'Assistant Setup', url: '/assistants', icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === 'collapsed';

  // Get presentation mode from context
  const { isPresentationMode } = usePresentationMode();

  // Hide sidebar during presentation mode
  const isPresentationRoute = currentPath.startsWith('/presentation-audience');

  // Return null to completely remove sidebar from DOM during presentation
  if (isPresentationMode || isPresentationRoute) {
    return null;
  }

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'hover:bg-sidebar-accent/50';

  return (
    <TooltipProvider delayDuration={300}>
      <Sidebar className={collapsed ? 'w-14' : 'w-60'} collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-sidebar-primary" />
            {!collapsed && (
              <span className="font-semibold text-sidebar-foreground">
                AI Query Hub
              </span>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink to={item.url} end className={getNavCls}>
                              <item.icon className="h-4 w-4" />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Assistant Section */}
          <SidebarGroup>
            <SidebarGroupLabel>Assistant</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {assistantNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink to={item.url} end className={getNavCls}>
                              <item.icon className="h-4 w-4" />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-sm">{item.title}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

        {/* Team Navigation - Only visible for Business tier and above */}
        <FeatureGate requiredTier="business">
          {/* Team Switcher */}
          {!collapsed && (
            <div className="px-3 py-2">
              <TeamSwitcher />
            </div>
          )}

          <SidebarGroup>
            <SidebarGroupLabel>Team</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Create Team - Always visible for Business users */}
                <SidebarMenuItem>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to="/team/create" className={getNavCls}>
                            <Plus className="h-4 w-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">Create Team</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink to="/team/create" className={getNavCls}>
                        <Plus className="h-4 w-4" />
                        <span>Create Team</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>

                <SidebarMenuItem>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to="/team/timeline" className={getNavCls}>
                            <Calendar className="h-4 w-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">Team Timeline</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink to="/team/timeline" className={getNavCls}>
                        <Calendar className="h-4 w-4" />
                        <span>Team Timeline</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to="/team/documents" className={getNavCls}>
                            <FileText className="h-4 w-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">Team Documents</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink to="/team/documents" className={getNavCls}>
                        <FileText className="h-4 w-4" />
                        <span>Team Documents</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to="/team/members" className={getNavCls}>
                            <Users className="h-4 w-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">Team Members</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink to="/team/members" className={getNavCls}>
                        <Users className="h-4 w-4" />
                        <span>Team Members</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
                <SidebarMenuItem>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton asChild>
                          <NavLink to="/team/settings" className={getNavCls}>
                            <Building2 className="h-4 w-4" />
                          </NavLink>
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      <TooltipContent side="right">Team Settings</TooltipContent>
                    </Tooltip>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink to="/team/settings" className={getNavCls}>
                        <Building2 className="h-4 w-4" />
                        <span>Team Settings</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </FeatureGate>

        {/* Executive Navigation - Only visible for Executive tier */}
        <FeatureGate requiredTier="executive">
          <SidebarGroup>
            <SidebarGroupLabel>Executive</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {executiveNavigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <SidebarMenuButton asChild>
                            <NavLink to={item.url} className={getNavCls}>
                              <item.icon className="h-4 w-4" />
                            </NavLink>
                          </SidebarMenuButton>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.title}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} className={getNavCls}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </FeatureGate>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild>
                    <NavLink to="/support" className={getNavCls}>
                      <HelpCircle className="h-4 w-4" />
                    </NavLink>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">Support</TooltipContent>
              </Tooltip>
            ) : (
              <SidebarMenuButton asChild>
                <NavLink to="/support" className={getNavCls}>
                  <HelpCircle className="h-4 w-4" />
                  <span>Support</span>
                </NavLink>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton asChild>
                    <NavLink to="/settings" className={getNavCls}>
                      <Settings className="h-4 w-4" />
                    </NavLink>
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            ) : (
              <SidebarMenuButton asChild>
                <NavLink to="/settings" className={getNavCls}>
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </NavLink>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sign Out</TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <LogOut className="h-4 w-4" />
                <span className="ml-2">Sign Out</span>
              </Button>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}