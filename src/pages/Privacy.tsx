import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Shield } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-primary bg-primary sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI Query Hub</span>
          </Link>
          <Button asChild variant="ghost" className="text-white hover:bg-white/10">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2025</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            <p>We collect the following types of information:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Account information (email address, name)</li>
              <li>Documents and files you upload</li>
              <li>Usage data and analytics</li>
              <li>Payment information (processed securely through third-party providers)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>Your information is used to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and improve our AI-powered services</li>
              <li>Process your queries and generate responses</li>
              <li>Maintain and secure your account</li>
              <li>Send service-related communications</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Storage and Security</h2>
            <p>
              We implement industry-standard security measures to protect your data. However:
            </p>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mt-2">
              <p className="font-semibold">
                No security system is impenetrable. We cannot guarantee the absolute security of your data.
                You acknowledge and accept the risks associated with storing data online.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Third-Party Services</h2>
            <p>We use third-party services for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cloud storage (you can choose your own provider)</li>
              <li>AI model providers (Claude, OpenAI, etc.)</li>
              <li>Payment processing</li>
              <li>Analytics and monitoring</li>
            </ul>
            <p className="mt-2">
              These providers have their own privacy policies. We are not responsible for their practices.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your personal data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Choose your storage provider</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p>
              We retain your data as long as your account is active. Upon account deletion, we will delete
              your data within 30 days. However, some data may be retained for legal or regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Children's Privacy</h2>
            <p>
              Our service is not intended for children under 13. We do not knowingly collect information
              from children under 13.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of significant changes
              via email or through the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p>
              For privacy-related questions or requests, please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
