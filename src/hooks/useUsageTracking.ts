import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { trackUsageLimit } from '@/lib/analytics';

interface UsageData {
  ai_queries_used: number;
  ai_queries_limit: number;
  ai_queries_percentage: number;
  ai_daily_briefs_used: number;
  ai_daily_briefs_limit: number;
  storage_used_gb: number;
  storage_limit_gb: number;
  plan_tier: string;
}

interface Subscription {
  plan_tier: string;
  status: string;
  trial_ends_at?: string;
  current_period_end?: string;
}

export function useUsageTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current usage
  const fetchUsage = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get current usage
      const { data: usageData, error: usageError } = await supabase
        .rpc('get_current_usage', { p_user_id: user.id })
        .single();

      if (usageError) throw usageError;

      setUsage(usageData);

      // Get subscription
      const { data: subData, error: subError } = await supabase
        .from('user_subscriptions')
        .select('plan_tier, status, trial_ends_at, current_period_end')
        .eq('user_id', user.id)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;

      setSubscription(subData);
    } catch (err) {
      console.error('Error fetching usage:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user can use a feature
  const canUseFeature = useCallback(async (
    featureType: string,
    showToast = true
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('can_use_feature', {
          p_user_id: user.id,
          p_feature_type: featureType,
          p_increment: true
        });

      if (error) throw error;

      if (!data && showToast) {
        toast({
          title: 'Usage Limit Reached',
          description: `You've reached your monthly ${featureType.replace('_', ' ')} limit. Upgrade to continue.`,
          variant: 'destructive',
          action: <a href="/settings/billing" className="underline">Upgrade Now</a>,
        });

        // Track limit hit
        trackUsageLimit(featureType, usage?.ai_queries_used || 0, usage?.ai_queries_limit || 0, 'blocked');
      }

      return data;
    } catch (err) {
      console.error('Error checking feature usage:', err);
      return false;
    }
  }, [user, usage, toast]);

  // Warn if nearing limit
  const checkUsageWarning = useCallback((featureType: string) => {
    if (!usage) return;

    const percentage = usage.ai_queries_percentage;

    if (percentage >= 80 && percentage < 100) {
      toast({
        title: 'Approaching Usage Limit',
        description: `You've used ${Math.round(percentage)}% of your monthly AI queries.`,
        action: <a href="/settings/billing" className="underline">Upgrade</a>,
      });

      trackUsageLimit(
        featureType,
        usage.ai_queries_used,
        usage.ai_queries_limit,
        'warning'
      );
    }
  }, [usage, toast]);

  // Refresh usage data
  useEffect(() => {
    if (user) {
      fetchUsage();
    }
  }, [user, fetchUsage]);

  return {
    usage,
    subscription,
    loading,
    canUseFeature,
    checkUsageWarning,
    fetchUsage,
    isTrialing: subscription?.status === 'trialing',
    isPaid: subscription?.plan_tier !== 'free',
    planTier: subscription?.plan_tier || 'free',
  };
}
