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
  BarChart3,
  Upload,
  Play
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$14',
    period: '/month',
    description: 'Perfect for individuals getting started',
    features: [
      '200 queries/month',
      '5 GB storage',
      'Google Drive sync',
      'Knowledge bases (3 max)',
      'Gemini AI (fast)',
      'Email support'
    ],
    popular: false,
    trial: false,
    savings: null,
    priceId: 'starter',
  },
  {
    name: 'Pro',
    price: '$45',
    period: '/month',
    description: 'For power users and professionals',
    features: [
      '1,000 queries/month',
      '50 GB storage',
      'Unlimited Google Drive sync',
      'Unlimited knowledge bases',
      'Choice of AI model (Gemini/GPT-4o)',
      'Conversation history',
      'Priority support',
      'API access'
    ],
    popular: true,
    trial: false,
    savings: null,
    priceId: 'pro',
  },
  {
    name: 'Business',
    price: '$150',
    period: '/month',
    description: 'For teams and organizations',
    features: [
      'Includes 5 team members',
      'Additional users $10/month each',
      'Unlimited queries per user',
      '500 GB shared storage',
      'Team collaboration & admin controls',
      'Custom AI models',
      'Advanced analytics',
      'Dedicated support'
    ],
    popular: false,
    trial: false,
    savings: null,
    priceId: 'business',
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
    <div className="min-h-screen relative overflow-hidden">
      {/* White background */}
      <div className="fixed inset-0 bg-white" />
      

      {/* Navigation */}
      <header className="relative border-b border-primary/20 bg-primary/95 backdrop-blur-xl supports-[backdrop-filter]:bg-primary/90 sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-glow">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI Query Hub</span>
            <Badge className="ml-2 hidden sm:inline-flex bg-secondary/30 border-secondary/50 text-white">Remembers Everything</Badge>
          </div>
          
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-white/90 hover:text-white transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-white/90 hover:text-white transition-colors font-medium">How It Works</a>
            <a href="#pricing" className="text-white/90 hover:text-white transition-colors font-medium">Pricing</a>
            <a href="#testimonials" className="text-white/90 hover:text-white transition-colors font-medium">Reviews</a>
          </nav>

          <Button asChild className="bg-accent hover:bg-accent/90 border-0 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Link to="/auth">Get Started Free</Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border border-primary/30 backdrop-blur-xl shadow-glow">
              <Sparkles className="w-5 h-5 text-primary animate-pulse-glow" />
              <span className="text-sm font-semibold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                AI-Powered Document Intelligence
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                An AI Assistant
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">That Remembers Everything.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Connect your documents, chat naturally, and get instant answers. Your AI assistant learns from
              everything you share and never forgets. Perfect memory, infinite knowledge.
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center pt-2">
              <Button size="lg" className="text-lg px-8 py-6 bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-0 text-white">
                Get Instant Answers Now
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-primary/30 bg-background hover:bg-muted hover:border-primary/50">
                Watch Demo
                <Play className="ml-2 w-5 h-5" />
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 justify-center items-center pt-6 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">Bank-level Security</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-success" />
                <span className="font-medium text-success">Instant Results</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 backdrop-blur-sm">
                <Users className="w-4 h-4 text-accent" />
                <span className="font-medium text-accent">10,000+ Happy Users</span>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16 animate-slide-up">
            {stats.map((stat, index) => {
              const colors = ["text-primary", "text-success", "text-success", "text-accent"];
              const bgColors = ["bg-primary/10", "bg-success/10", "bg-success/10", "bg-accent/10"];
              const borderColors = ["border-primary/20", "border-success/20", "border-success/20", "border-accent/20"];
              return (
                <div key={index} className={`text-center p-6 rounded-2xl ${bgColors[index]} border ${borderColors[index]} shadow-card backdrop-blur-xl hover:shadow-lg transition-all hover:scale-105`}>
                  <stat.icon className={`w-8 h-8 mx-auto mb-2 ${colors[index]}`} />
                  <div className={`text-5xl font-bold ${colors[index]} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-foreground/80 font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Three Simple Steps
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Get answers from your documents in seconds</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Upload, title: "Upload", desc: "Drop any document - PDF, Word, Excel, or text file", color: "primary" },
              { icon: MessageSquare, title: "Ask", desc: "Type your question in natural language", color: "secondary" },
              { icon: Sparkles, title: "Get Answers", desc: "Receive instant, accurate responses with sources", color: "success" }
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className={`text-center p-6 rounded-2xl bg-card border border-border shadow-card backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg`}>
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${
                    step.color === 'primary' ? 'bg-primary/10 border-primary/20' :
                    step.color === 'secondary' ? 'bg-secondary/10 border-secondary/20' :
                    'bg-success/10 border-success/20'
                  } flex items-center justify-center group-hover:scale-110 transition-transform border`}>
                    <step.icon className={`w-8 h-8 ${
                      step.color === 'primary' ? 'text-primary' :
                      step.color === 'secondary' ? 'text-secondary' :
                      'text-success'
                    }`} />
                  </div>
                  <div className={`text-7xl font-bold absolute top-4 right-4 ${
                    step.color === 'primary' ? 'text-primary/10' :
                    step.color === 'secondary' ? 'text-secondary/10' :
                    'text-success/10'
                  }`}>
                    {i + 1}
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                Powerful Features
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Everything you need to work smarter with documents</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              const colors = ["success", "secondary", "primary", "success", "secondary", "primary"];
              const iconColor = colors[i];
              return (
                <div key={i} className={`group p-6 rounded-2xl bg-card border border-border shadow-card backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg`}>
                  <div className={`w-14 h-14 rounded-xl ${
                    iconColor === 'primary' ? 'bg-primary/10 border-primary/20' :
                    iconColor === 'secondary' ? 'bg-secondary/10 border-secondary/20' :
                    'bg-success/10 border-success/20'
                  } flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border`}>
                    <feature.icon className={`w-7 h-7 ${
                      iconColor === 'primary' ? 'text-primary' :
                      iconColor === 'secondary' ? 'text-secondary' :
                      'text-success'
                    }`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-primary">{feature.title}</h3>
                  <p className="text-muted-foreground mb-3 text-sm">{feature.description}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-success">{feature.benefit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                Loved by Professionals
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">See what our users are saying</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <div key={i} className={`p-6 rounded-2xl bg-muted/30 border border-border shadow-card backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg`}>
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-success text-success" />
                  ))}
                </div>
                <p className="text-foreground/90 mb-4 italic leading-relaxed text-sm">"{testimonial.content}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                  <div className={`w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-lg text-primary`}>
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-sm text-primary">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
                <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20`}>
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-xs font-semibold text-success">{testimonial.metric}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-success/20 via-accent/20 to-secondary/20 border border-success/30 backdrop-blur-xl shadow-glow mb-4">
              <Sparkles className="w-5 h-5 text-success animate-pulse-glow" />
              <span className="text-sm font-semibold text-success">
                14-Day Free Trial • No Credit Card Required
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                Simple, Transparent Pricing
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Choose the perfect plan for your needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <div key={i} className={`relative p-6 rounded-2xl border transition-all hover:scale-105 backdrop-blur-xl ${
                plan.popular 
                  ? 'bg-card border-secondary/50 shadow-glow scale-105 ring-2 ring-secondary/30' 
                  : 'bg-card border-border shadow-card'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-secondary text-white text-xs font-bold shadow-lg">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2 text-primary">{plan.name}</h3>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    {plan.price !== 'Free' && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  {plan.savings && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold">
                      <TrendingUp className="w-3 h-3" />
                      {plan.savings}
                    </div>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-success" />
                      <span className="text-foreground/80 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  asChild
                  className={`w-full ${
                    plan.popular 
                      ? 'bg-accent hover:bg-accent/90 border-0 shadow-lg hover:shadow-xl text-white' 
                      : ''
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                  size="lg"
                >
                  <Link to={`/auth${plan.trial ? '' : `?plan=${plan.name.toLowerCase()}`}`}>
                    {plan.trial ? 'Start Free Trial' : 'Get Started'}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-8">
            <p className="text-muted-foreground mb-2 text-sm">
              All plans start with a 14-day free trial. Need more queries? Additional queries: $0.02 each
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" />
              Cancel anytime • No long-term contracts • 17% discount on annual plans
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center p-12 rounded-3xl bg-gradient-to-r from-primary to-secondary shadow-glow">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              Join thousands of professionals who save hours every day with AI-powered document intelligence.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6 bg-accent hover:bg-accent/90 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-0">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:border-white/60 backdrop-blur-sm">
                <a href="#pricing">
                  Schedule Demo
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-6 justify-center items-center mt-6 text-sm text-white/90">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Shield className="w-4 h-4" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <CheckCircle2 className="w-4 h-4" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
                <Users className="w-4 h-4" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border bg-muted py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-primary">AI Query Hub</span>
            </div>

            <div className="text-center md:text-left">
              <p className="text-muted-foreground flex items-center gap-2 justify-center md:justify-start text-sm">
                <Shield className="h-4 w-4 text-primary" />
                Private by Design — Your documents stay yours. Choose where your AI runs.
              </p>
            </div>

            <Link to="/settings#model-provider" className="text-sm text-muted-foreground hover:text-primary underline transition-colors">
              Model Provider Settings
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-border text-center text-xs text-muted-foreground">
            <p>© 2024 AI Query Hub. All rights reserved. Built with privacy and security in mind.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
