import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

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
      <header className="flex justify-end p-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/login">Login</Link>
        </Button>
      </header>

      <img
        src="https://source.unsplash.com/1600x600/?workspace"
        alt="Modern workspace"
        className="w-full object-cover mb-8 rounded-b-lg"
      />

      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold max-w-3xl">
          Talk to your documents — without limits, seats, or spying.
        </h1>
        <div className="space-x-4">
          <Button asChild size="lg">
            <Link to="/register">Try Free</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <a href="https://github.com/your-org/your-repo" target="_blank" rel="noopener noreferrer">
              Install Locally
            </a>
          </Button>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="grid md:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className="text-center hover:shadow-lg transition">
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
                  {plan.name === 'Free' && (
                    <Button asChild className="w-full mt-2">
                      <Link to="/register">Get Started</Link>
                    </Button>
                  )}
                  {plan.name === 'Starter' && (
                    <Button asChild className="w-full mt-2">
                      <Link to="/register?plan=starter">Choose Starter</Link>
                    </Button>
                  )}
                  {plan.name === 'Pro' && (
                    <Button asChild className="w-full mt-2">
                      <Link to="/register?plan=pro">Choose Pro</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <img
            src="https://source.unsplash.com/800x400/?ai"
            alt="AI illustration"
            className="hidden md:block rounded-lg"
          />
        </div>
      </section>

      <img
        src="https://source.unsplash.com/1200x300/?technology"
        alt="Footer illustration"
        className="w-full object-cover mt-auto"
      />
    </div>
  );
}
