import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AIBadgeProps {
  variant?: 'default' | 'powered-by' | 'confidence';
  confidence?: number;
  className?: string;
}

export function AIBadge({ variant = 'default', confidence, className }: AIBadgeProps) {
  if (variant === 'powered-by') {
    return (
      <Badge
        variant="outline"
        className={cn(
          "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
          className
        )}
      >
        <span className="text-xs font-medium">Powered by GPT-4</span>
      </Badge>
    );
  }

  if (variant === 'confidence' && confidence !== undefined) {
    const confidenceColor =
      confidence >= 0.8
        ? 'from-green-500/10 to-emerald-500/10 border-green-500/20 text-green-700 dark:text-green-300'
        : confidence >= 0.6
        ? 'from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
        : 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-300';

    return (
      <Badge
        variant="outline"
        className={cn('bg-gradient-to-r', confidenceColor, className)}
      >
        <span className="text-xs font-medium">{Math.round(confidence * 100)}% confident</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20 text-purple-700 dark:text-purple-300",
        className
      )}
    >
      <span className="text-xs font-medium">AI Generated</span>
    </Badge>
  );
}

export function AIFeatureBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "inline-flex items-center px-2 py-1 rounded-md bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20",
      className
    )}>
      <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{children}</span>
    </div>
  );
}
