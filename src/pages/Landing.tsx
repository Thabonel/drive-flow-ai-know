import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { DocumentFlowHero } from '@/components/hero';

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
      'AI chat conversations',
      '10 pitch decks/month',
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
      'Unlimited pitch decks',
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
    description: 'Enterprise security + team collaboration',
    features: [
      'Everything in Pro',
      '500 GB storage',
      'Unlimited pitch decks',
      '🔒 Enterprise Security Platform (NEW)',
      'Advanced audit logging',
      'Multi-factor authentication (MFA)',
      'Automated incident response',
      'GDPR/CCPA data rights portal',
      'Team collaboration features',
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
    title: 'AI Memory',
    description: 'Long-running conversations that remember context. Your AI builds on previous discussions without you repeating yourself.',
    benefit: 'Context that persists',
  },
  {
    title: 'Privacy First',
    description: 'Your data is never used for AI training. Your team\'s knowledge stays within your organization - private and controlled.',
    benefit: 'Your data stays yours',
  },
  {
    title: 'Security Features',
    description: 'Multi-factor authentication, incident detection, GDPR/CCPA data rights portal, and comprehensive audit logging to protect your data.',
    benefit: 'Built-in protection',
  },
  {
    title: 'Natural Questions',
    description: 'Type what you want to know. Get answers pulled from your docs. No special keywords needed.',
    benefit: 'Plain English works',
  },
  {
    title: 'Your Storage, Your Choice',
    description: 'Use our cloud, or connect Google Drive, Microsoft 365, or S3. Choose where your files live.',
    benefit: 'Keep control of your data',
  },
  {
    title: 'Multi-Provider AI',
    description: 'Built on multiple AI providers with fallback routing. We regularly update to the latest frontier models.',
    benefit: 'Best available AI',
  },
  {
    title: 'Team Collaboration',
    description: 'Share documents across your team. Everyone gets consistent AI responses from the same knowledge base.',
    benefit: 'Shared context',
  },
];

export default function Landing() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Navigation */}
      <header className="relative border-b border-primary bg-primary sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
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
          <Button asChild className="hidden md:flex bg-accent hover:bg-accent/90 border-0 text-white transition-all hover:scale-105 [box-shadow:none] hover:[box-shadow:none]">
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
                <strong className="text-accent">Built with security in mind</strong> - MFA, audit logging, incident detection, and GDPR/CCPA data rights.
              </span>
            </p>

            {/* CTA Above Fold */}
            <div className="flex flex-wrap gap-4 justify-center items-center pt-2">
              <Button asChild size="lg" className="text-base px-6 py-4 bg-accent hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all hover:scale-105 border-0 text-white">
                <Link to="/auth">
                  Start Free 14-Day Trial
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-3 justify-center items-center pt-2 text-xs">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
                <span className="font-medium text-primary">MFA & audit logging</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 backdrop-blur-sm">
                <span className="font-medium text-success">GDPR/CCPA compliant</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 backdrop-blur-sm">
                <span className="font-medium text-accent">No credit card required</span>
              </div>
            </div>
          </div>

          {/* Animated Hero - Document Flow Visualization */}
          <div className="flex justify-center mt-6">
            <DocumentFlowHero className="max-w-4xl w-full" />
          </div>

          {/* Trust Badges - Enterprise Security */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/20 shadow-card hover:shadow-lg transition-all">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h3 className="text-xl font-bold text-primary">Security Built In</h3>
              </div>
              <p className="text-sm text-muted-foreground">Multi-factor authentication, incident detection, audit logging, and comprehensive data rights management.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-success/5 border border-success/20 shadow-card hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold text-success mb-2">GDPR/CCPA Data Rights</h3>
              <p className="text-sm text-muted-foreground">Data export, account deletion, and consent management. Your data stays under your control.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-accent/5 border border-accent/20 shadow-card hover:shadow-lg transition-all">
              <h3 className="text-xl font-bold text-accent mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">Search all your documents in seconds. Get answers without the wait. Multi-provider AI architecture.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">Three steps. That's it.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Upload", desc: "Drop in your files (PDFs, docs, whatever)", color: "primary" },
              { title: "Ask", desc: "Type your question like texting a friend", color: "secondary" },
              { title: "Get Answers", desc: "AI pulls exact answers from your docs", color: "success" }
            ].map((step, i) => (
              <div key={i} className="relative group h-full">
                <div className={`text-center p-6 rounded-2xl bg-card border border-border shadow-card backdrop-blur-xl transition-all hover:scale-105 hover:shadow-lg h-full`}>
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

      {/* Enterprise Security & Privacy Section */}
      <section className="py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Security & Privacy Features</h2>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Incident detection, GDPR/CCPA data rights, and comprehensive audit logging.
              Unlike other AI tools, we don't use your data to train AI models.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            <div className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl">
              <h3 className="font-semibold mb-2 text-lg">🔐 Multi-Factor Auth</h3>
              <p className="opacity-80 text-sm">TOTP-based MFA with automated security monitoring and incident response.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl">
              <h3 className="font-semibold mb-2 text-lg">📊 Audit Logging</h3>
              <p className="opacity-80 text-sm">Comprehensive audit trail for security events and compliance reporting.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl">
              <h3 className="font-semibold mb-2 text-lg">🌍 GDPR/CCPA</h3>
              <p className="opacity-80 text-sm">Complete data rights portal with automated export, deletion, and consent management.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl">
              <h3 className="font-semibold mb-2 text-lg">🚨 Incident Detection</h3>
              <p className="opacity-80 text-sm">Automated brute force detection with security alerts when suspicious activity is identified.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl">
              <h3 className="font-semibold mb-2 text-lg">🛡️ XSS Protection</h3>
              <p className="opacity-80 text-sm">Content Security Policy headers and comprehensive audit logging for all events.</p>
            </div>
            <div className="text-center p-6 rounded-2xl bg-white/10 backdrop-blur-xl">
              <h3 className="font-semibold mb-2 text-lg">🔒 No AI Training</h3>
              <p className="opacity-80 text-sm">Your data is never used to train AI models. Enterprise data protection guaranteed.</p>
            </div>
          </div>

          </div>
      </section>

      {/* AI Memory & Long Conversations Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">AI That Remembers</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Long-running conversations that maintain context across sessions.
                Your AI assistant remembers previous discussions and builds on them -
                no more repeating yourself every time you start a new chat.
              </p>
              <ul className="space-y-3 text-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">—</span>
                  <span>Context persists across conversations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">—</span>
                  <span>Reference previous discussions naturally</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">—</span>
                  <span>Build on insights over time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary font-medium">—</span>
                  <span>Memory wiped after 30 days for privacy</span>
                </li>
              </ul>
            </div>
            <div className="bg-card rounded-2xl shadow-card border border-border p-8">
              <div className="space-y-4">
                <div className="bg-primary/5 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">You</p>
                  <p className="text-sm text-muted-foreground">"Remember that budget analysis we discussed last week?"</p>
                </div>
                <div className="bg-accent/10 rounded-lg p-4">
                  <p className="text-xs text-accent mb-1 font-medium">AI</p>
                  <p className="text-sm text-foreground">"Yes! You mentioned the Q3 projections were 15% higher than expected. Would you like me to update those figures with the latest data from your documents?"</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">AI remembers context from previous conversations</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Pitch Deck Generator Showcase */}
      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              Turn Docs Into Pitch Decks
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AI analyzes your documents and creates professional pitch decks in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <img
                src="https://fskwutnoxbbflzqrphro.supabase.co/storage/v1/object/public/assets/wheels.jpg"
                alt="AI Pitch Deck Generator"
                className="rounded-2xl shadow-card border border-border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const placeholder = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              />
              <div className="hidden rounded-2xl shadow-card border border-border bg-muted/20 items-center justify-center h-[400px]">
                <p className="text-muted-foreground">Pitch Deck Preview</p>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  AI Determines Perfect Length
                </h3>
                <p className="text-muted-foreground">
                  Analyzes complexity and recommends 8-15 slides following industry standards.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  Professional 16:9 Format
                </h3>
                <p className="text-muted-foreground">
                  Export to PDF, PowerPoint, or present directly in your browser. No formatting issues.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-primary mb-2">
                  Uses Your Document Data
                </h3>
                <p className="text-muted-foreground">
                  AI pulls metrics and insights from your uploaded documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Document Context - Key Differentiator */}
      <section className="relative py-24 px-6 bg-primary">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-accent/20 border border-accent/30 backdrop-blur-xl mb-6">
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
              <h3 className="text-xl font-bold text-white mb-4">Other AI Chatbots</h3>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">×</span>
                  <span>Upload files separately for each chat</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">×</span>
                  <span>Files disappear when you start new conversation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">×</span>
                  <span>Can't search across all your documents</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-300 mt-1">×</span>
                  <span>Re-upload same files over and over</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-2xl bg-accent/20 backdrop-blur-xl border border-accent/30">
              <h3 className="text-xl font-bold text-white mb-4">AI Query Hub</h3>
              <ul className="space-y-2 text-white/80">
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Upload documents once, available forever</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>AI has access to all files in every conversation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Search across your entire document library</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent mt-1">✓</span>
                  <span>Build persistent knowledge base over time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* AI Model Leadership Section */}
      <section className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
              Powered by Leading AI Models
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We integrate with multiple AI providers and regularly update to the latest frontier models,
              so you get the best performance without managing multiple subscriptions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl bg-card border border-border shadow-card">
              <h3 className="text-xl font-bold text-primary mb-4">Multi-Provider Architecture</h3>
              <p className="text-muted-foreground mb-4">
                We integrate with multiple leading AI providers and cutting-edge models.
                You get the best of all worlds without managing multiple subscriptions.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success font-medium">—</span>
                  <span>Advanced reasoning capabilities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-medium">—</span>
                  <span>Access to diverse model capabilities</span>
                </li>
              </ul>
            </div>

            <div className="p-8 rounded-2xl bg-card border border-border shadow-card">
              <h3 className="text-xl font-bold text-primary mb-4">Regularly Updated</h3>
              <p className="text-muted-foreground mb-4">
                When new frontier models are released, we evaluate and integrate them.
                Built-in fallback routing ensures you always have a working AI, even if a provider has downtime.
              </p>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-success font-medium">—</span>
                  <span>Regular model updates</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-medium">—</span>
                  <span>Intelligent fallback routing</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-medium">—</span>
                  <span>Multiple AI providers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
              What You Get
            </h2>
            <p className="text-lg text-muted-foreground">The essentials, nothing more</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-card border border-border shadow-card transition-all hover:shadow-lg">
                <h3 className="text-xl font-bold mb-3 text-primary">{feature.title}</h3>
                <p className="text-muted-foreground mb-4 leading-relaxed">{feature.description}</p>
                <span className="text-sm font-medium text-success">{feature.benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative py-24 px-6 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-primary">
              Pricing
            </h2>
            <p className="text-lg text-muted-foreground">14-day free trial, no credit card required</p>
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
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-primary">{plan.name}</h3>
                    {plan.name === 'Business' && (
                      <span className="text-xs bg-accent text-white px-2 py-1 rounded-full font-semibold">TEAMS</span>
                    )}
                  </div>
                  <div className="mb-3">
                    <span className="text-4xl font-bold text-primary">{plan.price}</span>
                    {plan.price !== 'Free' && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  {plan.savings && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-xs font-bold">
                      {plan.savings}
                    </div>
                  )}
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className="text-success font-medium">—</span>
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
              Cancel anytime • 14-day free trial
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-primary">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            No credit card. No commitment. Just upload some docs and ask questions.
          </p>
          <Button asChild size="lg" className="text-lg px-10 py-6 bg-accent hover:bg-accent/90 text-white shadow-lg hover:shadow-xl transition-all border-0">
            <Link to="/auth">
              Start Free Trial
            </Link>
          </Button>
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

            <div className="text-center text-xs text-muted-foreground max-w-4xl mx-auto space-y-3">
              <p className="font-semibold text-foreground">Security & Legal Information</p>

              <div className="grid md:grid-cols-3 gap-4 py-2">
                <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="font-semibold text-primary text-xs">MFA & Audit Logging</p>
                  <p className="text-xs">Security Features</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-success/5 border border-success/20">
                  <p className="font-semibold text-success text-xs">Incident Detection</p>
                  <p className="text-xs">Automated Monitoring</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="font-semibold text-accent text-xs">GDPR/CCPA</p>
                  <p className="text-xs">Data Rights Portal</p>
                </div>
              </div>

              <p className="leading-relaxed">
                <strong className="text-foreground">Security:</strong> AI Query Hub includes
                multi-factor authentication, incident detection, comprehensive audit logging, and GDPR/CCPA data rights.
                Your data is protected by encryption and privacy controls.
              </p>

              <p className="leading-relaxed">
                <strong className="text-foreground">Professional Service:</strong> We recommend following standard business practices including regular backups of critical data.
                AI Query Hub is designed as a document intelligence platform, not a primary backup service.
                See our Terms of Service and Data Policy for complete details.
              </p>

              <p className="pt-2 text-muted-foreground/80">© 2025 AI Query Hub. All rights reserved. AI-powered document intelligence.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
