import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ShoppingCart, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$14/month',
    priceId: 'starter',
    features: ['200 queries/month', '5 GB storage', 'Google Drive sync', 'Knowledge bases (3 max)', 'Email support']
  },
  {
    name: 'Pro',
    price: '$45/month',
    priceId: 'pro',
    features: ['1,000 queries/month', '50 GB storage', 'Unlimited knowledge bases', 'Choice of AI model', 'Priority support', 'API access']
  },
  {
    name: 'Business',
    price: '$150/month',
    priceId: 'business',
    features: ['Includes 5 team members', 'Additional users $10/month each', 'Unlimited queries per user', '500 GB storage', 'Team admin controls', 'Dedicated support']
  }
];

export default function Billing() {
  const { user } = useAuth();

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
        <p className="text-muted-foreground">Choose the plan that\'s right for you</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className="text-center">
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
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
              {plan.name !== 'Free Trial' && (
                <div className="text-center">
                  <Button variant="outline" className="w-full">
                    Choose Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
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
