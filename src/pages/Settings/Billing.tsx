import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Zap, Loader2, Check, ExternalLink } from 'lucide-react';
import { STRIPE_PRICE_IDS } from '@/lib/stripe-config';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: '$9/month',
    priceId: STRIPE_PRICE_IDS.starter,
    planType: 'starter',
    features: ['200 queries/month', '5 GB storage', 'Google Drive sync', 'Knowledge bases (3 max)', 'Email support']
  },
  {
    name: 'Pro',
    price: '$45/month',
    priceId: STRIPE_PRICE_IDS.pro,
    planType: 'pro',
    features: ['1,000 queries/month', '50 GB storage', 'Unlimited knowledge bases', 'Choice of AI model', 'Priority support', 'API access']
  },
  {
    name: 'Business',
    price: '$150/month',
    priceId: STRIPE_PRICE_IDS.business,
    planType: 'business',
    features: ['Includes 5 team members', 'Additional users $10/month each', 'Unlimited queries per user', '500 GB storage', 'Team admin controls', 'Dedicated support']
  }
];

export default function Billing() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [verifyingSession, setVerifyingSession] = useState(false);

  // Fetch user's active subscription
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    },
    enabled: !!user,
  });

  // Verify checkout session on redirect from Stripe
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const canceled = searchParams.get('canceled');

    if (canceled) {
      toast.error('Payment canceled');
      setSearchParams({});
      return;
    }

    if (sessionId && user && !verifyingSession) {
      setVerifyingSession(true);

      const verifySession = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('verify-checkout-session', {
            body: { session_id: sessionId }
          });

          if (error) throw error;

          toast.success('Subscription activated successfully!');

          // Refresh subscription data
          queryClient.invalidateQueries({ queryKey: ['subscription', user.id] });

          // Clean up URL
          setSearchParams({});
        } catch (error) {
          console.error('Session verification error:', error);
          toast.error('Failed to verify payment. Please contact support.');
        } finally {
          setVerifyingSession(false);
        }
      };

      verifySession();
    }
  }, [searchParams, user, verifyingSession, queryClient, setSearchParams]);

  const handleChoosePlan = async (priceId: string, planType: string) => {
    if (!user) {
      toast.error('Please log in to choose a plan');
      return;
    }

    setLoadingPlan(planType);
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: { priceId, planType }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to start subscription. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user || !subscription) {
      toast.error('No active subscription found');
      return;
    }

    setLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-session');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open subscription management. Please try again.');
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleStorageUpgrade = async () => {
    if (!user) {
      toast.error('Please log in to purchase storage upgrades');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-storage-payment');

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Open Stripe Checkout in a new tab
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Storage upgrade error:', error);
      toast.error('Failed to initiate storage upgrade. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing</h1>
        <p className="text-muted-foreground">
          {subscription ? 'Manage your subscription' : 'Choose the plan that\'s right for you'}
        </p>
      </div>

      {/* Verifying session loading state */}
      {verifyingSession && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-blue-800 dark:text-blue-200">Verifying your payment...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription Status */}
      {subscription && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-primary" />
                  Current Plan: {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)}
                </CardTitle>
                <CardDescription className="mt-2">
                  {subscription.status === 'trialing' ? (
                    <>Trial ends {new Date(subscription.trial_end!).toLocaleDateString()}</>
                  ) : (
                    <>Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}</>
                  )}
                </CardDescription>
              </div>
              <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                {subscription.status === 'trialing' ? 'Trial' : 'Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleManageSubscription}
              disabled={loadingPortal}
              variant="outline"
              className="w-full"
            >
              {loadingPortal ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage Subscription
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Update payment method, cancel, or view invoices
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan_type === plan.planType;

          return (
            <Card
              key={plan.name}
              className={`text-center ${isCurrentPlan ? 'border-primary' : ''}`}
            >
              <CardHeader>
                <div className="flex items-center justify-center gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {isCurrentPlan && (
                    <Badge variant="default" className="text-xs">Current</Badge>
                  )}
                </div>
                <CardDescription className="text-4xl font-bold">{plan.price}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center justify-center">
                      <Badge variant="secondary" className="mr-2" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.name !== 'Free Trial' && !isCurrentPlan && (
                  <div className="text-center">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleChoosePlan(plan.priceId, plan.planType)}
                      disabled={!user || loadingPlan === plan.planType}
                    >
                      {loadingPlan === plan.planType ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        subscription ? 'Upgrade' : 'Choose Plan'
                      )}
                    </Button>
                    {!user && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Please log in to subscribe
                      </p>
                    )}
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="text-center">
                    <Badge variant="outline" className="w-full py-2">
                      <Check className="h-4 w-4 mr-2" />
                      Active Plan
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Storage Upgrade Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Storage Upgrades</h2>
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Additional Storage</CardTitle>
            <CardDescription className="text-2xl font-bold">$10 per 10GB</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <ul className="space-y-2 mb-6 text-sm">
              <li>✓ Instant storage expansion</li>
              <li>✓ No monthly commitment</li>
              <li>✓ Perfect for growing teams</li>
            </ul>
            <Button 
              onClick={handleStorageUpgrade}
              className="w-full"
              disabled={!user}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase 10GB Storage
            </Button>
            {!user && (
              <p className="text-sm text-muted-foreground mt-2">
                Please log in to purchase storage upgrades
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center mt-6 text-sm text-muted-foreground">
        <p>All plans include 10 GB storage. Purchase additional storage as needed.</p>
      </div>
    </div>
  );
}
