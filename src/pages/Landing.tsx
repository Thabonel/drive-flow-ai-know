import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, FileText, MessageSquare, Shield, Star, Users, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: 'for 14 days',
    description: 'Try everything with no commitment',
    features: ['Full access to all features', 'Unlimited documents', 'Advanced AI chat', '10 GB storage included', 'Custom prompts', 'Priority support'],
    popular: false,
    trial: true,
  },
  {
    name: 'Monthly',
    price: '$14',
    period: '/month',
    description: 'Pay as you go',
    features: ['Unlimited documents', 'Advanced AI chat', '10 GB storage included', 'Custom prompts', 'Priority support', 'Analytics dashboard'],
    popular: true,
  },
  {
    name: 'Yearly',
    price: '$140',
    period: '/year',
    description: 'Save with annual billing',
    features: ['Everything in Monthly', '10 GB storage included', '2 months free', 'Priority support', 'Analytics dashboard', 'Custom branding'],
    popular: false,
    savings: 'Save $28',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechCorp',
    content: 'This has revolutionized how we handle documentation. Our team productivity increased by 40%.',
    rating: 5,
  },
  {
    name: 'Michael Rodriguez',
    role: 'Research Director',
    company: 'InnovateLab',
    content: 'The AI understands context better than any other tool we\'ve tried. Incredible accuracy.',
    rating: 5,
  },
  {
    name: 'Emily Thompson',
    role: 'Legal Counsel',
    company: 'LawFirm Plus',
    content: 'Privacy-first approach gives us confidence. No more worrying about data security.',
    rating: 5,
  },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Intelligent Conversations',
    description: 'Chat naturally with your documents using advanced AI that understands context and nuance.',
  },
  {
    icon: Shield,
    title: 'You Control Your Data',
    description: 'Choose where your documents are stored - on your local drive, your cloud storage, or our secure cloud. You decide.',
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Get instant answers from thousands of documents. No waiting, no loading screens.',
  },
  {
    icon: FileText,
    title: 'Any Format',
    description: 'Support for PDFs, Word docs, Excel spreadsheets, PowerPoint presentations, audio files, images, and more. Upload anything, chat with everything.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">DocChat</span>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors">Features</a>
            <a href="#pricing" className="text-foreground/80 hover:text-foreground transition-colors">Pricing</a>
            <a href="#testimonials" className="text-foreground/80 hover:text-foreground transition-colors">Reviews</a>
          </nav>

          <Button asChild variant="default">
            <Link to="/auth">Log In</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="secondary" className="mb-6">
            🚀 No limits, no seats, no spying
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Talk to your documents
            <span className="text-primary block">like never before</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Upload any document and chat with it using AI. Get instant answers, insights, and summaries. 
            You choose where your documents stay - local drive, your cloud, or our secure cloud.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link to="/auth">
                Try Free Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-3">
              <a href="#storage" onClick={(e) => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>
                Choose Your Storage
              </a>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>10,000+ users</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              <span>4.9/5 rating</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span>SOC 2 compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose DocChat?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for teams who value privacy, speed, and intelligent document interaction.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center p-6 hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <feature.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by professionals</h2>
            <p className="text-xl text-muted-foreground">See what our users are saying about DocChat</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground">Choose the plan that's right for you</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative hover:shadow-lg transition-shadow ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                 <CardHeader className="text-center pb-4">
                   <CardTitle className="text-2xl">{plan.name}</CardTitle>
                   <CardDescription>{plan.description}</CardDescription>
                   <div className="text-4xl font-bold">
                     {plan.price}<span className="text-lg font-normal text-muted-foreground">{plan.period}</span>
                   </div>
                   {plan.savings && (
                     <div className="text-sm text-primary font-medium">{plan.savings}</div>
                   )}
                 </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                   <Button asChild className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                     <Link to={`/auth${plan.trial ? '' : `?plan=${plan.name.toLowerCase()}`}`}>
                       {plan.trial ? 'Start Free Trial' : `Choose ${plan.name}`}
                     </Link>
                   </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-8 text-sm text-muted-foreground">
            <p>All plans include 10 GB storage. Additional storage: $10 per 10 GB</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to transform your document workflow?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who trust DocChat for intelligent document interaction.
          </p>
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link to="/auth">
              Start Your Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 py-8 px-4">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2024 DocChat. Private by design — Your documents stay yours.</p>
        </div>
      </footer>
    </div>
  );
}
