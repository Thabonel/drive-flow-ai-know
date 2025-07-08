import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const plans = [
  {
    name: 'Free',
    price: '$0',
    features: ['100 documents', 'Community support'],
  },
  {
    name: 'Starter',
    price: '$19',
    features: ['Unlimited docs', 'Custom prompts'],
  },
  {
    name: 'Pro',
    price: '$49',
    features: ['Branding', 'Analytics', 'API access'],
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl">
          Talk to your documents — without limits, seats, or spying.
        </h1>
        <div className="space-x-4">
          <Button size="lg">Try Free</Button>
          <Button size="lg" variant="secondary">
            Install Locally
          </Button>
        </div>
      </section>
      <section className="px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className="text-center">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription className="text-4xl font-bold">
                  {plan.price}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
