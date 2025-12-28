import { useTeam } from '@/hooks/useTeam';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * TeamSwitcher Component
 *
 * Dropdown menu for switching between multiple teams (Slack-style)
 * Shows all teams user is a member of with visual indicator for active team
 * Includes "Create Team" action for Business tier users
 */
export function TeamSwitcher() {
  const { team, allTeams, activeTeamId, setActiveTeam } = useTeam();
  const navigate = useNavigate();

  // Don't show if user has no teams
  if (!team || allTeams.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-between px-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-6 w-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
              {team.name[0].toUpperCase()}
            </div>
            <span className="truncate text-left">{team.name}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Switch Team</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* List all teams */}
        {allTeams.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onClick={() => setActiveTeam(t.id)}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="h-5 w-5 rounded bg-muted flex items-center justify-center text-xs flex-shrink-0">
                {t.name[0].toUpperCase()}
              </div>
              <span className="truncate">{t.name}</span>
            </div>
            {t.id === activeTeamId && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        {/* Create Team Action */}
        <DropdownMenuItem onClick={() => navigate('/team/create')} className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
