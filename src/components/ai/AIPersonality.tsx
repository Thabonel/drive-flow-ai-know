import { Brain, Sparkles, Zap } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const AI_PERSONALITIES = {
  alex: {
    name: 'Alex',
    title: 'Your AI Planner',
    avatar: '🤖',
    color: 'from-purple-500 to-blue-500',
    icon: Brain,
    personality: 'professional',
    greeting: 'Hey there! I\'m Alex, your AI planning assistant.',
    tagline: 'Helping you plan the perfect day',
  },
  sage: {
    name: 'Sage',
    title: 'AI Wisdom Guide',
    avatar: '🧙‍♂️',
    color: 'from-indigo-500 to-purple-500',
    icon: Sparkles,
    personality: 'wise',
    greeting: 'Greetings! I\'m Sage, here to guide your day with wisdom.',
    tagline: 'Strategic insights for your success',
  },
  nova: {
    name: 'Nova',
    title: 'AI Productivity Coach',
    avatar: '⚡',
    color: 'from-blue-500 to-cyan-500',
    icon: Zap,
    personality: 'energetic',
    greeting: 'Hi! I\'m Nova, let\'s make today amazing!',
    tagline: 'Energizing your productivity',
  },
};

export type PersonalityKey = keyof typeof AI_PERSONALITIES;

interface AIPersonalityAvatarProps {
  personality?: PersonalityKey;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  className?: string;
}

export function AIPersonalityAvatar({
  personality = 'alex',
  size = 'md',
  showBadge = false,
  className
}: AIPersonalityAvatarProps) {
  const ai = AI_PERSONALITIES[personality];

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <div className={cn("relative inline-flex items-center gap-2", className)}>
      <div className="relative">
        <Avatar className={cn(sizeClasses[size], `bg-gradient-to-br ${ai.color}`)}>
          <AvatarFallback className="text-white text-lg">
            {ai.avatar}
          </AvatarFallback>
        </Avatar>
        {showBadge && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-background" />
        )}
      </div>
    </div>
  );
}

interface AIPersonalityGreetingProps {
  personality?: PersonalityKey;
  showTagline?: boolean;
  className?: string;
}

export function AIPersonalityGreeting({
  personality = 'alex',
  showTagline = true,
  className
}: AIPersonalityGreetingProps) {
  const ai = AI_PERSONALITIES[personality];

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <AIPersonalityAvatar personality={personality} size="lg" showBadge />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold">{ai.name}</h3>
          <Badge variant="outline" className={`bg-gradient-to-r ${ai.color} text-white border-0`}>
            {ai.title}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{ai.greeting}</p>
        {showTagline && (
          <p className="text-xs text-muted-foreground mt-1 italic">{ai.tagline}</p>
        )}
      </div>
    </div>
  );
}

interface AIThinkingMessageProps {
  personality?: PersonalityKey;
  message?: string;
}

export function AIThinkingMessage({
  personality = 'alex',
  message
}: AIThinkingMessageProps) {
  const ai = AI_PERSONALITIES[personality];

  const thinkingMessages = [
    'Analyzing your schedule...',
    'Finding the optimal plan...',
    'Considering all possibilities...',
    'Learning from your patterns...',
    'Crafting the perfect day...',
    'Optimizing your time...',
  ];

  const displayMessage = message || thinkingMessages[Math.floor(Math.random() * thinkingMessages.length)];

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      <AIPersonalityAvatar personality={personality} size="sm" showBadge />
      <div className="flex-1">
        <p className="text-sm font-medium">{ai.name} is thinking...</p>
        <p className="text-xs text-muted-foreground">{displayMessage}</p>
      </div>
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-primary animate-bounce" />
      </div>
    </div>
  );
}
