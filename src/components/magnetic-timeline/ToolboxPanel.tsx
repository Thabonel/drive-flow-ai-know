// Toolbox Panel - Reusable templates and quick-add items

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Moon, Coffee, Briefcase, Dumbbell, Utensils, Car, Users, BookOpen } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  duration: number; // minutes
  color: string;
  category: 'rest' | 'personal' | 'meal' | 'health' | 'work' | 'travel' | 'social' | 'learning';
  isLocked?: boolean;
  isFlexible?: boolean;
}

const defaultTemplates: Template[] = [
  {
    id: 'sleep',
    name: 'Sleep',
    icon: Moon,
    duration: 480, // 8 hours
    color: '#6366f1',
    category: 'rest',
    isLocked: true,
    isFlexible: false,
  },
  {
    id: 'breakfast',
    name: 'Breakfast',
    icon: Coffee,
    duration: 30,
    color: '#f59e0b',
    category: 'meal',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'lunch',
    name: 'Lunch',
    icon: Utensils,
    duration: 45,
    color: '#f59e0b',
    category: 'meal',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'dinner',
    name: 'Dinner',
    icon: Utensils,
    duration: 60,
    color: '#f59e0b',
    category: 'meal',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'work',
    name: 'Work',
    icon: Briefcase,
    duration: 480, // 8 hours
    color: '#3b82f6',
    category: 'work',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'exercise',
    name: 'Exercise',
    icon: Dumbbell,
    duration: 60,
    color: '#10b981',
    category: 'health',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'commute',
    name: 'Commute',
    icon: Car,
    duration: 30,
    color: '#8b5cf6',
    category: 'travel',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'social',
    name: 'Social Time',
    icon: Users,
    duration: 120,
    color: '#ec4899',
    category: 'social',
    isLocked: false,
    isFlexible: true,
  },
  {
    id: 'learning',
    name: 'Learning',
    icon: BookOpen,
    duration: 90,
    color: '#06b6d4',
    category: 'learning',
    isLocked: false,
    isFlexible: true,
  },
];

interface ToolboxPanelProps {
  onClose: () => void;
  onAddItem: (template: Template) => void;
}

export function ToolboxPanel({ onClose, onAddItem }: ToolboxPanelProps) {
  const categories = Array.from(new Set(defaultTemplates.map(t => t.category)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Toolbox</CardTitle>
            <CardDescription>
              Click a template to add it to your timeline at the current time
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {categories.map((category) => {
            const templates = defaultTemplates.filter(t => t.category === category);

            return (
              <div key={category}>
                <h4 className="text-sm font-semibold mb-2 capitalize">{category}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {templates.map((template) => {
                    const Icon = template.icon;

                    return (
                      <Button
                        key={template.id}
                        variant="outline"
                        className="h-auto flex-col gap-2 p-4"
                        onClick={() => onAddItem(template)}
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: template.color }}
                        >
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {Math.floor(template.duration / 60)}h {template.duration % 60}m
                          </div>
                        </div>
                        {template.isLocked && (
                          <div className="text-xs text-yellow-600">🔒 Locked</div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
