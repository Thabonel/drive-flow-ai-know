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
  Upload,
  Menu,
  X
} from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    description: 'Perfect for getting started with AI assistance',
    features: [
      'AI-powered document search',
      '5 GB storage',
      '3 knowledge bases',
      'AI document analysis',
      'Timeline management',
      'Save all conversations',
      'Basic support'
    ],
    popular: false,
    trial: true,
    savings: null,
    priceId: 'price_1SJ242DXysaVZSVh4s8X7pQX',
  },
  {
    name: 'Pro',
    price: '$45',
    period: '/month',
    description: 'For professionals using AI daily',
    features: [
      'Everything in Starter',
      '50 GB storage',
      'Unlimited knowledge bases',
      'All AI features',
      'Advanced timeline features',
      'Daily planning & shutdown rituals',
      'Priority support',
      'AI Chat conversations'
    ],
    popular: true,
    trial: true,
    savings: null,
    priceId: 'price_1SJ24pDXysaVZSVhjWh5Z9dk',
  },
  {
    name: 'Business',
    price: '$150',
    period: '/month',
    description: 'Full team collaboration features',
    features: [
      'Everything in Pro',
      '500 GB storage',
      'Team collaboration features',
      'Team shared documents',
      'Team timeline',
      'Includes 5 team members',
      'Additional users $10/month each',
      'Context fluency across organization',
      'Dedicated account manager'
    ],
    popular: false,
    trial: true,
    savings: null,
    priceId: 'price_1SJ25YDXysaVZSVhyjwdk3HN',
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
    description: 'Use our cloud, or connect Google Drive, Microsoft 365, or S3. Choose where your files live.',
    benefit: 'Keep control of your data',
  },
  {
    icon: Zap,
    title: 'Fast Search',
    description: 'Search through all your documents quickly. Get answers in seconds, not hours.',
    benefit: 'Fast answers',
  },
  {
    icon: Brain,
    title: 'Future-Proof AI Intelligence',
    description: 'Multi-provider architecture with leading AI models. We automatically route to the best available AI and update to the latest frontier models. No switching services, no new accounts, no manual upgrades.',
    benefit: 'Always latest AI',
  },
  {
    icon: Clock,
    title: 'Timeline Manager',
    description: 'Visual timeline that flows in real-time. Schedule tasks, see what\'s logjammed, park items for later. Switch between day, week, and month views.',
    benefit: 'Time flows naturally',
  },
  {
    icon: FileText,
    title: 'Group Your Documents',
    description: 'Make collections from related files. The AI reads them together to answer your questions.',
    benefit: 'Context-aware answers',
  },
  {
    icon: Brain,
    title: 'Persistent Knowledge Base',
    description: 'Upload documents once and they stay forever. Every conversation has access to your entire library. No more re-uploading files.',
    benefit: 'Upload once, use forever',
  },
  {
    icon: Globe,
    title: 'Works Anywhere',
    description: 'Open it in any browser. Desktop, laptop, tablet, phone—doesn\'t matter.',
    benefit: 'No app to install',
  },
  {
    icon: Users,
    title: 'Context Operates at Team Level',
    description: 'Team-shared documents mean everyone\'s AI has access to the same knowledge. No more asking "who has that file?"',
    benefit: 'Shared organizational context',
  },
  {
    icon: Lock,
    title: 'Context is Local',
    description: 'Your team\'s knowledge stays within your organization. AI assistants only see what your team uploads—context that\'s private and controlled.',
    benefit: 'Your data, your boundaries',
  },
  {
    icon: Sparkles,
    title: 'Context Fluency Across Organization',
    description: 'Everyone sings from the same song list. Team members get consistent AI responses because they\'re all working from shared documents.',
    benefit: 'Organization-wide alignment',
  },
  {
    icon: TrendingUp,
    title: 'Meaningfully Upshift Bottom Line',
    description: 'Teams waste hours searching for information. Context fluency eliminates duplicate work and accelerates decision-making.',
    benefit: 'ROI you can measure',
  },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-white/90 hover:text-white transition-colors font-medium">Features</a>
            <a href="#how-it-works" className="text-white/90 hover:text-white transition-colors font-medium">How It Works</a>
            <a href="#pricing" className="text-white/90 hover:text-white transition-colors font-medium">Pricing</a>
          </nav>

          {/* Desktop CTA */}
          <Button asChild className="hidden md:flex bg-accent hover:bg-accent/90 border-0 text-white shadow-lg hover:shadow-xl transition-all hover:scale-105">
            <Link to="/auth">Get Started Free</Link>
          </Button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-primary">
            <nav className="container mx-auto px-4 py-4 flex flex-col space-y-4">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/90 hover:text-white transition-colors font-medium py-2"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/90 hover:text-white transition-colors font-medium py-2"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/90 hover:text-white transition-colors font-medium py-2"
              >
                Pricing
              </a>
              <Button asChild className="w-full bg-accent hover:bg-accent/90 border-0 text-white shadow-lg">
                <Link to="/auth">Get Started Free</Link>
              </Button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-6 pb-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          {/* Headline - Outcome-Based */}
          <div className="text-center space-y-3 mb-4 animate-fade-in">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-primary max-w-4xl mx-auto">
              Get Instant Answers From Your Documents
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              <strong className="text-primary">Upload documents once, they stay forever.</strong> Every conversation has access to your entire library.
              No more re-uploading the same files over and over.
              <span className="text-sm md:text-base block">
                Always running the latest AI, without you ever switching services.
              </span>
            </p>

            {/* CTA Above Fold */}
            <div className="flex flex-wrap gap-4 justify-center items-center pt-2">
              <Button asChild size="lg" className="text-base px-6 py-4 bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-0 text-white">
                <Link to="/auth">
                  Start Free 14-Day Trial
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-3 justify-center items-center pt-2 text-xs">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">Your data stays private</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 backdrop-blur-sm">
                <Zap className="w-4 h-4 text-success" />
                <span className="font-medium text-success">Fast, reliable answers</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-accent" />
                <span className="font-medium text-accent">No credit card required</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="font-medium text-primary">Always latest AI models</span>
              </div>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="flex justify-center mt-6">
            <img
              src="https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/assets/AI%20Qyeryhubhero.jpg"
              alt="AI Query Hub - AI Knowledge Assistant"
              className="max-w-6xl w-full h-auto object-contain rounded-2xl"
            />
          </div>

          {/* Trust Badges - Replacing Disabled Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/20 shadow-card hover:shadow-lg transition-all">
              <Shield className="w-12 h-12 mx-auto mb-3 text-primary" />
              <h3 className="text-xl font-bold text-primary mb-2">Secure & Encrypted</h3>
              <p className="text-sm text-muted-foreground">Your documents are stored securely with industry-standard encryption.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-success/5 border border-success/20 shadow-card hover:shadow-lg transition-all">
              <Lock className="w-12 h-12 mx-auto mb-3 text-success" />
              <h3 className="text-xl font-bold text-success mb-2">100% Private</h3>
              <p className="text-sm text-muted-foreground">Your documents stay private. Use your own storage or ours - you choose.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-accent/5 border border-accent/20 shadow-card hover:shadow-lg transition-all">
              <Zap className="w-12 h-12 mx-auto mb-3 text-accent" />
              <h3 className="text-xl font-bold text-accent mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">Search all your documents in seconds. Get answers without the wait.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-3 text-primary">
              How It Works
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

      {/* Document Context - Key Differentiator */}
      <section className="relative py-16 px-6 bg-primary">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-xl mb-6">
            <Brain className="w-5 h-5 text-accent" />
            <span className="text-sm font-semibold text-accent">
              The Problem With Other AI Chatbots
            </span>
          </div>

          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Your Documents Stay With The AI Forever
          </h2>

          <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-3xl mx-auto">
            Other AI chatbots lose your uploaded files when you start a new conversation.
            <strong className="text-accent"> We keep everything.</strong>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 text-left">
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0">
                  <X className="h-6 w-6 text-red-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Other AI Chatbots</h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-red-300 mt-1">•</span>
                      <span>Upload files separately for each chat</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-300 mt-1">•</span>
                      <span>Files disappear when you start new conversation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-300 mt-1">•</span>
                      <span>Can't search across all your documents</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-300 mt-1">•</span>
                      <span>Re-upload same files over and over</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-accent/20 backdrop-blur-xl border border-accent/30">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/30 border border-accent/40 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">AI Query Hub</h3>
                  <ul className="space-y-2 text-white/80">
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Upload documents once, available forever</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>AI has access to all files in every conversation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Search across your entire document library</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-accent mt-1">•</span>
                      <span>Build persistent knowledge base over time</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
            <p className="text-lg text-white/90 leading-relaxed">
              <strong className="text-white">Upload once, use forever.</strong> Every document you add becomes part of your permanent knowledge base.
              The AI can reference any file you've ever uploaded, in any conversation, at any time. No more re-uploading the same documents.
            </p>
          </div>
        </div>
      </section>

      {/* AI Model Leadership Section */}
      <section className="relative py-16 px-6 bg-primary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-white">
              Powered by the Best AI, Automatically
            </h2>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              We constantly update to the latest frontier models so you never have to switch providers,
              create new accounts, or worry about falling behind.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Multi-Provider Architecture</h3>
              <p className="text-white/80 mb-4">
                We integrate with multiple leading AI providers and cutting-edge models.
                You get the best of all worlds without managing multiple subscriptions.
              </p>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Advanced reasoning capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Access to diverse model capabilities</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Always Up-to-Date</h3>
              <p className="text-white/80 mb-4">
                When new frontier models are released, we update automatically. No action needed on your part.
                You always get state-of-the-art AI performance.
              </p>
              <ul className="space-y-2 text-white/70">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Automatic model updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>Intelligent fallback routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>No vendor lock-in</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 max-w-4xl mx-auto">
            <p className="text-lg text-white/90 text-center leading-relaxed">
              <strong className="text-white">One platform, zero maintenance.</strong> While others force you to chase the latest models across different services,
              we handle everything behind the scenes. Your workflow stays the same, your AI gets better. We ship new features as quickly as we can imagine them.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-3 text-primary">
              What You Get
            </h2>
            <p className="text-lg text-muted-foreground">The stuff that actually matters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => {
              return (
                <div key={i} className={`group p-6 rounded-2xl bg-card border border-border shadow-card backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg`}>
                  <h3 className="text-xl font-bold mb-2 text-primary">{feature.title}</h3>
                  <p className="text-muted-foreground mb-3 text-sm">{feature.description}</p>
                  <div className="inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                    <span className="text-success">{feature.benefit}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof - Join Early Adopters */}
      <section className="relative py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center p-12 rounded-3xl bg-card border border-border shadow-card">
            <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-success/20 border border-success/30 backdrop-blur-xl mb-6">
              <Users className="w-5 h-5 text-success" />
              <span className="text-sm font-semibold text-success">
                Join Early Adopters
              </span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
              Be Among The First
            </h2>

            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Get early access to AI Query Hub and shape the future of document intelligence.
              Early adopters get priority support, exclusive features, and special pricing.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="p-6 rounded-xl bg-primary/5 border border-primary/20">
                <h3 className="font-bold text-primary mb-2">Priority Support</h3>
                <p className="text-sm text-muted-foreground">Direct line to our team for any issues or questions</p>
              </div>
              <div className="p-6 rounded-xl bg-success/5 border border-success/20">
                <h3 className="font-bold text-success mb-2">Exclusive Features</h3>
                <p className="text-sm text-muted-foreground">Get first access to new AI capabilities as we release them</p>
              </div>
              <div className="p-6 rounded-xl bg-accent/5 border border-accent/20">
                <h3 className="font-bold text-accent mb-2">Special Pricing</h3>
                <p className="text-sm text-muted-foreground">Lock in early adopter rates before we raise prices</p>
              </div>
            </div>

            <Button asChild size="lg" className="mt-8 text-lg px-8 py-6 bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-0 text-white">
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
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
            <h2 className="text-4xl md:text-5xl font-bold mb-3 text-primary">
              Pricing
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
              Try any plan free for 14 days. All prices in AUD.
            </p>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Shield className="h-3 w-3" />
              Cancel anytime • 14-day free trial
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
          <div className="mt-8 pt-6">
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
