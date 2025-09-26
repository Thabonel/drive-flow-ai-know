import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const plans = [
  {
    name: 'Free Trial',
    price: 'Free for 14 days',
    features: ['Full access', 'Unlimited documents', '10 GB storage included']
  },
  {
    name: 'Monthly',
    price: '$14/month',
    features: ['Unlimited docs', '10 GB storage included', 'Priority support']
  },
  {
    name: 'Yearly',
    price: '$140/year',
    features: ['Save $28/year', '10 GB storage included', 'All features']
  }
];

export default function Billing() {
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
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="text-center mt-6 text-sm text-muted-foreground">
        <p>All plans include 10 GB storage. Additional storage: $10 per 10 GB</p>
      </div>
    </div>
  );
}
