import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PlanTier = 'entry' | 'business' | 'enterprise';

interface FeatureGateProps {
  children: React.ReactNode;
  requiredTier: PlanTier;
  fallback?: React.ReactNode;
}

/**
 * FeatureGate component - Shows/hides features based on subscription tier
 *
 * Tiers:
 * - entry: Starter/Pro ($9-45/month) - Solo users
 * - business: Business ($150/month) - Team features (5 members, shared docs, team timeline)
 * - enterprise: Enterprise ($299/month) - Executive assistant + team features
 *
 * Admin Override:
 * - Users with role = "admin" in user_roles table have full access to ALL features
 * - Bypasses all tier restrictions for testing and administration
 *
 * Features are COMPLETELY INVISIBLE until the required tier is subscribed.
 * No "upgrade" banners or locked feature teasers - pay to see.
 */
export function FeatureGate({ children, requiredTier, fallback = null }: FeatureGateProps) {
  const { user } = useAuth();

  // Check user role
  const { data: userRole } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Don't render anything while loading
  if (isLoading) {
    return null;
  }

  // Admins have full access to everything
  if (userRole?.role === 'admin') {
    return <>{children}</>;
  }

  // No subscription = entry tier (free/trial)
  const currentTier: PlanTier = (subscription?.plan_tier as PlanTier) || 'entry';

  // Tier hierarchy: entry < business < enterprise
  const tierHierarchy: Record<PlanTier, number> = {
    entry: 1,
    business: 2,
    enterprise: 3,
  };

  const hasAccess = tierHierarchy[currentTier] >= tierHierarchy[requiredTier];

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
