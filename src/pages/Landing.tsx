import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Check, 
  FileText, 
  MessageSquare, 
  Shield, 
  Star, 
  Users, 
  Zap, 
  Clock,
  TrendingUp,
  Brain,
  Lock,
  Globe,
  Sparkles,
  CheckCircle2,
  BarChart3
} from 'lucide-react';

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: 'for 14 days',
    description: 'Experience everything with zero risk',
    features: [
      'Full access to all features', 
      'Unlimited documents', 
      'Advanced AI chat', 
      '10 GB storage included', 
      'Custom prompts', 
      'Priority support'
    ],
    popular: false,
    trial: true,
  },
  {
    name: 'Monthly',
    price: '$14',
    period: '/month',
    description: 'Flexible month-to-month billing',
    features: [
      'Unlimited documents', 
      'Advanced AI chat', 
      '10 GB storage included', 
      'Custom prompts', 
      'Priority support', 
      'Analytics dashboard',
      'API access'
    ],
    popular: true,
    savings: null,
  },
  {
    name: 'Yearly',
    price: '$140',
    period: '/year',
    description: 'Best value for committed users',
    features: [
      'Everything in Monthly', 
      '10 GB storage included', 
      '2 months free', 
      'Priority support', 
      'Analytics dashboard', 
      'Custom branding',
      'Advanced integrations'
    ],
    popular: false,
    savings: 'Save $28/year',
  },
];

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager',
    company: 'TechCorp',
    content: 'This has revolutionized how we handle documentation. Our team productivity increased by 40% in the first month.',
    rating: 5,
    metric: '40% faster',
  },
  {
    name: 'Michael Rodriguez',
    role: 'Research Director',
    company: 'InnovateLab',
    content: 'The AI understands context better than any other tool we\'ve tried. Incredible accuracy and time savings.',
    rating: 5,
    metric: '15 hrs/week saved',
  },
  {
    name: 'Emily Thompson',
    role: 'Legal Counsel',
    company: 'LawFirm Plus',
    content: 'Privacy-first approach gives us confidence. No more worrying about data security with sensitive client documents.',
    rating: 5,
    metric: '100% compliant',
  },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Natural Conversations',
    description: 'Ask questions in plain English. Get precise answers instantly, with context from across all your documents.',
    benefit: 'Save 5+ hours per week on research',
  },
  {
    icon: Shield,
    title: 'Your Data, Your Control',
    description: 'Choose local storage, your cloud, or ours. End-to-end encryption. GDPR & SOC 2 compliant.',
    benefit: 'Enterprise-grade security',
  },
  {
    icon: Zap,
    title: 'Lightning Fast Results',
    description: 'Search through thousands of documents in milliseconds. No waiting, no loading screens.',
    benefit: 'Instant answers, every time',
  },
  {
    icon: Brain,
    title: 'AI That Understands',
    description: 'Advanced language models trained on millions of documents. Understands context, nuance, and complex queries.',
    benefit: '95%+ accuracy rate',
  },
  {
    icon: FileText,
    title: 'Every Format Supported',
    description: 'PDFs, Word, Excel, PowerPoint, images, audio files, and more. Upload anything, chat with everything.',
    benefit: '20+ file formats',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    description: 'Cloud-based with offline capabilities. Access from any device, collaborate with your team seamlessly.',
    benefit: 'Desktop & mobile ready',
  },
];

const stats = [
  { value: '2M+', label: 'Questions Answered', icon: MessageSquare },
  { value: '500K+', label: 'Hours Saved', icon: Clock },
  { value: '10K+', label: 'Active Users', icon: Users },
  { value: '4.9/5', label: 'User Rating', icon: Star },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Navigation */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">DocChat</span>
            <Badge variant="secondary" className="ml-2 hidden sm:inline-flex">AI-Powered</Badge>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-foreground/80 hover:text-foreground transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors font-medium">How It Works</a>
            <a href="#pricing" className="text-foreground/80 hover:text-foreground transition-colors font-medium">Pricing</a>
            <a href="#testimonials" className="text-foreground/80 hover:text-foreground transition-colors font-medium">Reviews</a>
          </nav>

          <Button asChild variant="default">
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section - Enhanced */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-accent/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }} />
        
        <div className="container mx-auto text-center max-w-5xl relative z-10">
          <Badge variant="secondary" className="mb-6 animate-fade-in">
            <Sparkles className="h-3 w-3 mr-1" />
            Trusted by 10,000+ professionals worldwide
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            Stop Reading.
            <span className="block mt-2 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">Start Asking.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto animate-fade-in">
            Turn your documents into intelligent conversations. Get instant answers, insights, and summaries from any file—all while keeping your data completely private.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 animate-slide-up">
            <Button asChild size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all duration-300 hover:scale-105">
              <Link to="/auth">
                Get Instant Answers Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-2 hover:bg-primary/5 hover:border-primary transition-all duration-300">
              <a href="#how-it-works">
                See How It Works
              </a>
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>Cancel anytime</span>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 animate-fade-in">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-4 rounded-lg bg-card/80 backdrop-blur border hover:shadow-card transition-all hover:scale-105 group">
                <stat.icon className="h-6 w-6 text-primary mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section - New */}
      <section id="how-it-works" className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Simple Process</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Three Steps to Smarter Documents</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your document workflow in minutes, not hours
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload Your Documents',
                description: 'Drag and drop any file—PDFs, Word docs, spreadsheets, presentations, images, or audio files.',
                icon: FileText,
              },
              {
                step: '2',
                title: 'Ask Questions',
                description: 'Type your questions in plain English. No complex search syntax or technical knowledge required.',
                icon: MessageSquare,
              },
              {
                step: '3',
                title: 'Get Instant Answers',
                description: 'Receive accurate answers with citations. Copy, share, or dive deeper with follow-up questions.',
                icon: Zap,
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <Card className="h-full hover:shadow-glow transition-all duration-300 hover:-translate-y-2 bg-gradient-to-br from-card to-card/50 border-2">
                  <CardContent className="p-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-card">
                        {item.step}
                      </div>
                      <item.icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-2xl font-semibold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Powerful Features</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Everything You Need to Work Smarter</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Purpose-built for professionals who value privacy, speed, and intelligent insights
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-glow transition-all duration-300 hover:-translate-y-2 border-2 hover:border-primary/50 bg-gradient-to-br from-card via-card to-card/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                <CardContent className="p-8 relative z-10">
                  <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-all shadow-card">
                    <feature.icon className="h-7 w-7 text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground mb-4">{feature.description}</p>
                  <div className="flex items-center gap-2 text-sm font-medium bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span>{feature.benefit}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section - Enhanced */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/5 to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Trusted Worldwide</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Join Thousands of Happy Users</h2>
          </div>
          
          {/* Security badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-medium">SOC 2 Type II Certified</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-6 w-6 text-primary" />
              <span className="font-medium">GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-medium">256-bit Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section - Enhanced */}
      <section id="testimonials" className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-glow transition-all duration-300 hover:scale-105 border-2 bg-gradient-to-br from-card to-card/80">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Badge className="bg-gradient-to-r from-primary/10 to-secondary/10">{testimonial.metric}</Badge>
                  </div>
                  <p className="text-foreground mb-6 text-lg leading-relaxed">"{testimonial.content}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Enhanced */}
      <section id="pricing" className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-accent/5 to-transparent" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Simple Pricing</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-xl text-muted-foreground">Start free, upgrade when you're ready. No hidden fees.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative transition-all duration-300 ${
                  plan.popular 
                    ? 'border-primary border-2 shadow-glow scale-105 bg-gradient-to-br from-primary/5 via-card to-card' 
                    : 'hover:scale-105 hover:shadow-card bg-gradient-to-br from-card to-card/80'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-primary to-secondary text-primary-foreground px-4 py-1 text-sm font-semibold shadow-glow animate-pulse-glow">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{plan.price}</span>
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  </div>
                  {plan.savings && (
                    <Badge variant="secondary" className="mt-3">
                      {plan.savings}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="px-6 pb-8">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    asChild 
                    className={`w-full py-6 text-lg font-semibold ${plan.popular ? 'bg-gradient-to-r from-primary to-secondary hover:shadow-glow' : ''}`}
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    <Link to={`/auth${plan.trial ? '' : `?plan=${plan.name.toLowerCase()}`}`}>
                      {plan.trial ? 'Start Free Trial' : 'Get Started'}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              All plans include 10 GB storage. Need more? Additional storage: $10 per 10 GB
            </p>
            <p className="text-sm text-muted-foreground">
              <Shield className="h-4 w-4 inline mr-1" />
              30-day money-back guarantee • No long-term contracts • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA Section - Enhanced */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        
        <div className="container mx-auto text-center max-w-4xl relative z-10">
          <Badge variant="secondary" className="mb-6 bg-gradient-to-r from-primary/10 to-secondary/10">
            <Sparkles className="h-3 w-3 mr-1" />
            Join 10,000+ professionals
          </Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Ready to Transform Your Document Workflow?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop wasting time searching through documents. Start getting instant answers with AI-powered intelligence.
          </p>
          
          {/* Value props */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Set up in 60 seconds</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Save 5+ hours per week</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span>Your data stays private</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-10 py-6 bg-gradient-to-r from-primary to-secondary hover:shadow-glow transition-all duration-300 hover:scale-105">
              <Link to="/auth">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-lg px-10 py-6 border-2 hover:bg-primary/5 hover:border-primary transition-all duration-300">
              <a href="#pricing">
                View Pricing
                <BarChart3 className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-8">
            No credit card required • 14-day free trial • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer - Enhanced */}
      <footer className="border-t bg-muted/30 py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">DocChat</span>
            </div>
            
            <div className="text-center md:text-left">
              <p className="text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                <Shield className="h-4 w-4 text-primary" />
                Private by Design — Your documents stay yours. Choose where your AI runs.
              </p>
            </div>
            
            <Link to="/settings#model-provider" className="text-sm text-muted-foreground hover:text-foreground underline transition-colors">
              Model Provider Settings
            </Link>
          </div>
          
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2024 DocChat. All rights reserved. Built with privacy and security in mind.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}