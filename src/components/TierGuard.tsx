import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useHasAssistantFeatures } from '@/lib/permissions';
import { Loader2, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface TierGuardProps {
  children: ReactNode;
  requiredFeature?: 'assistant' | 'executive';
  redirectTo?: string;
  showUpgradeMessage?: boolean;
}

/**
 * Route guard component that restricts access based on subscription tier
 */
export function TierGuard({
  children,
  requiredFeature = 'assistant',
  redirectTo = '/dashboard',
  showUpgradeMessage = true
}: TierGuardProps) {
  const hasAssistantFeatures = useHasAssistantFeatures();
  const navigate = useNavigate();

  // Loading state while checking permissions
  if (hasAssistantFeatures === undefined) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has required feature access
  const hasAccess = requiredFeature === 'assistant' ? hasAssistantFeatures : false;

  if (!hasAccess) {
    if (!showUpgradeMessage) {
      return <Navigate to={redirectTo} replace />;
    }

    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900">
              <Lock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <CardTitle className="text-2xl">Executive Tier Required</CardTitle>
            <CardDescription className="text-base mt-2">
              This feature is only available to users on the Executive tier subscription.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold">Executive Tier Benefits:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>Delegate tasks to assistants</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>AI-generated daily briefs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>Complete audit trail of all actions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>Upload documents for timeline items</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">✓</span>
                  <span>Granular permission controls</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                variant="default"
                className="flex-1"
                onClick={() => navigate('/settings?tab=billing')}
              >
                Upgrade to Executive Tier
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate(redirectTo)}
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
