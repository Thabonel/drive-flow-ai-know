import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  Upload
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    description: 'Good if you are just trying this out',
    features: [
      '200 questions/month',
      '5 GB storage',
      'Google Drive sync',
      'Up to 3 knowledge bases',
      'Fast AI model (Gemini)',
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
    description: 'For people who use this daily',
    features: [
      '1,000 questions/month',
      '50 GB storage',
      'Unlimited Google Drive sync',
      'Unlimited knowledge bases',
      'Pick your AI (Gemini or GPT-4o)',
      'Full conversation history',
      'Faster support',
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
    description: 'For teams',
    features: [
      '5 team members included',
      '+$10/month per extra person',
      'Unlimited questions per person',
      '500 GB shared storage',
      'Team admin tools',
      'Your own AI models if you want',
      'Usage analytics',
      'Dedicated support person'
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
    content: 'We use this to search our company docs. Finds answers way faster than scrolling through Drive folders.',
    rating: 5,
    metric: 'Saves 2 hrs/day',
  },
  {
    name: 'Michael Rodriguez',
    role: 'Research Director',
    company: 'InnovateLab',
    content: 'Actually understands what I\'m asking. No more keyword searches that miss the point.',
    rating: 5,
    metric: '15 hrs/week saved',
  },
  {
    name: 'Emily Thompson',
    role: 'Legal Counsel',
    company: 'LawFirm Plus',
    content: 'Works with our sensitive files. Can keep everything on our own servers if we want.',
    rating: 5,
    metric: 'Client data stays private',
  },
];

const features = [
  {
    icon: MessageSquare,
    title: 'Ask Questions Like Normal',
    description: 'Type what you want to know. Get answers pulled from your docs. No special keywords needed.',
    benefit: 'Plain English works',
  },
  {
    icon: Shield,
    title: 'Your Files, Your Rules',
    description: 'Use our cloud, or connect Google Drive, Microsoft 365, S3. You can even run the AI on your own computer.',
    benefit: 'Keep control of your data',
  },
  {
    icon: Zap,
    title: 'Fast Search',
    description: 'Scan thousands of documents in under a second. No more waiting around.',
    benefit: 'Answers in milliseconds',
  },
  {
    icon: Brain,
    title: 'Group Your Documents',
    description: 'Make collections from related files. The AI reads them together to answer your questions.',
    benefit: 'Context-aware answers',
  },
  {
    icon: FileText,
    title: 'Save Your Chats',
    description: 'Every conversation gets saved. Search through old questions and answers anytime.',
    benefit: 'Nothing gets lost',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    description: 'Open it in any browser. Desktop, laptop, tablet, phone—doesn\'t matter.',
    benefit: 'No app to install',
  },
];

export default function Landing() {
  const [stats, setStats] = useState([
    { value: '0', label: 'Questions Answered', icon: MessageSquare },
    { value: '0', label: 'Hours Saved', icon: Clock },
    { value: '0', label: 'Active Users', icon: Users },
    { value: '4.9/5', label: 'User Rating', icon: Star },
  ]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch real stats from database
        const [queriesResult, usersResult] = await Promise.all([
          supabase.from('ai_query_history').select('id', { count: 'exact', head: true }),
          supabase.from('profiles').select('id', { count: 'exact', head: true })
        ]);

        const totalQueries = queriesResult.count || 0;
        const totalUsers = usersResult.count || 0;

        // Estimate hours saved (assuming 15 minutes saved per query)
        const hoursSaved = Math.floor(totalQueries * 0.25);

        setStats([
          {
            value: totalQueries >= 1000000 ? `${(totalQueries / 1000000).toFixed(1)}M+` :
                   totalQueries >= 1000 ? `${(totalQueries / 1000).toFixed(1)}K+` :
                   totalQueries.toString(),
            label: 'Questions Answered',
            icon: MessageSquare
          },
          {
            value: hoursSaved >= 1000000 ? `${(hoursSaved / 1000000).toFixed(1)}M+` :
                   hoursSaved >= 1000 ? `${(hoursSaved / 1000).toFixed(1)}K+` :
                   hoursSaved.toString(),
            label: 'Hours Saved',
            icon: Clock
          },
          {
            value: totalUsers >= 1000000 ? `${(totalUsers / 1000000).toFixed(1)}M+` :
                   totalUsers >= 1000 ? `${(totalUsers / 1000).toFixed(1)}K+` :
                   totalUsers.toString(),
            label: 'Active Users',
            icon: Users
          },
          { value: '4.9/5', label: 'User Rating', icon: Star },
        ]);
      } catch (error) {
        console.error('Error fetching stats:', error);
        // Keep fallback values if fetch fails
      }
    };

    fetchStats();
  }, []);
  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Navigation */}
      <header className="relative border-b border-primary bg-primary sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-glow">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI Query Hub</span>
            <Badge className="ml-2 hidden sm:inline-flex bg-secondary border-secondary text-white">Chat With Your Docs</Badge>
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
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-xl shadow-glow">
              <Sparkles className="w-5 h-5 text-primary animate-pulse-glow" />
              <span className="text-sm font-semibold text-primary">
                Search your documents with AI
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                Ask Questions.
              </span>
              <br />
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">Get Answers From Your Files.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Upload your documents. Ask questions in plain English. The AI reads through everything and
              tells you what's there. No more digging through folders.
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center pt-2">
              <Button asChild size="lg" className="text-lg px-8 py-6 bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-0 text-white">
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 justify-center items-center pt-6 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary border border-primary">
                <Shield className="w-4 h-4 text-white" />
                <span className="font-medium text-white">Your data stays private</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success border border-success">
                <Zap className="w-4 h-4 text-white" />
                <span className="font-medium text-white">Searches in under 1 second</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent border border-accent">
                <Users className="w-4 h-4 text-white" />
                <span className="font-medium text-white">Free 14-day trial</span>
              </div>
            </div>
          </div>

          {/* Stats Section - Commented out until we have real user numbers
          Showing "0 Questions Answered, 0 Hours Saved, 0 Active Users" kills credibility
          Will uncomment when we have actual usage data to showcase
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16 animate-slide-up">
            {stats.map((stat, index) => {
              const colors = ["text-white", "text-white", "text-white", "text-white"];
              const bgColors = ["bg-primary", "bg-success", "bg-success", "bg-accent"];
              const borderColors = ["border-primary", "border-success", "border-success", "border-accent"];
              return (
                <div key={index} className={`text-center p-6 rounded-2xl ${bgColors[index]} border ${borderColors[index]} shadow-card hover:shadow-lg transition-all hover:scale-105`}>
                  <stat.icon className={`w-8 h-8 mx-auto mb-2 ${colors[index]}`} />
                  <div className={`text-5xl font-bold ${colors[index]} mb-2`}>
                    {stat.value}
                  </div>
                  <div className="text-white font-medium">{stat.label}</div>
                </div>
              );
            })}
          </div>
          */}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                How It Works
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Three steps. That's it.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Upload, title: "Upload", desc: "Drop in your files (PDFs, docs, whatever)", color: "primary" },
              { icon: MessageSquare, title: "Ask", desc: "Type your question like texting a friend", color: "secondary" },
              { icon: Sparkles, title: "Get Answers", desc: "AI pulls exact answers from your docs", color: "success" }
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
                What You Get
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">The stuff that actually matters</p>
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
                What People Say
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Real feedback from early users</p>
            <p className="text-xs text-muted-foreground/60 mt-2 italic">*Example testimonials for demonstration</p>
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
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-success/20 border border-success/30 backdrop-blur-xl shadow-glow mb-4">
              <Sparkles className="w-5 h-5 text-success animate-pulse-glow" />
              <span className="text-sm font-semibold text-success">
                14-Day Free Trial • No Credit Card Required
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-gradient-shift bg-[length:200%_auto]">
                Pricing
              </span>
            </h2>
            <p className="text-lg text-muted-foreground">Pick what works for you</p>
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
              Try any plan free for 14 days. Need more questions? $0.02 per extra question.
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" />
              Cancel anytime • Pay annually, save 17%
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center p-12 rounded-3xl bg-gradient-to-r from-primary to-secondary shadow-glow">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Try It Free For 14 Days
            </h2>
            <p className="text-lg text-white/90 mb-6 max-w-2xl mx-auto">
              No credit card. No commitment. Just upload some docs and ask questions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-6 bg-accent hover:bg-accent/90 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-0">
                <Link to="/auth">
                  Start Free Trial
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              {/* Schedule Demo - Commented out until we have significant user numbers to showcase
              <Button asChild size="lg" variant="outline" className="text-lg px-8 py-6 border-2 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:border-white/60 backdrop-blur-sm">
                <a href="#pricing">
                  Schedule Demo
                </a>
              </Button>
              */}
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
                Your files stay yours. Run the AI on our servers or your own.
              </p>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <a href="/terms" className="text-xs text-muted-foreground hover:text-primary underline transition-colors">
                Terms of Service
              </a>
              <a href="/privacy" className="text-xs text-muted-foreground hover:text-primary underline transition-colors">
                Privacy Policy
              </a>
              <a href="/disclaimer" className="text-xs text-muted-foreground hover:text-primary underline transition-colors">
                Disclaimer
              </a>
              <a href="/data-policy" className="text-xs text-muted-foreground hover:text-primary underline transition-colors">
                Data Policy
              </a>
              <a href="/acceptable-use" className="text-xs text-muted-foreground hover:text-primary underline transition-colors">
                Acceptable Use Policy
              </a>
            </div>

            <div className="text-center text-xs text-muted-foreground max-w-4xl mx-auto space-y-2">
              <p className="font-semibold text-foreground">Legal Stuff</p>
              <p>
                AI Query Hub is provided "as is." We use standard security, but
                <strong className="text-foreground"> we are not liable for data loss, unauthorized access, or security breaches.</strong> Back up your important files somewhere else.
              </p>
              <p>
                You upload files at your own risk. Keep backups of anything critical. This isn't a backup service.
                See our Terms of Service and Data Policy for the full legal version.
              </p>
              <p className="pt-2">© 2024 AI Query Hub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
