import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

export default function Terms() {
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
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-slate max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2025</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p>
              By accessing and using AI Query Hub, you accept and agree to be bound by these Terms of Service.
              If you do not agree to these terms, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p>
              AI Query Hub provides AI-powered document intelligence services. We allow users to upload, store,
              and query documents using artificial intelligence technology.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. User Responsibilities</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must maintain backups of all important documents and data</li>
              <li>You are solely responsible for the content you upload to our service</li>
              <li>You must comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Limitation of Liability</h2>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
              <p className="font-semibold text-destructive mb-2">IMPORTANT:</p>
              <p>
                AI Query Hub is provided "AS IS" without warranty of any kind. We are NOT responsible for:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Data loss, corruption, or deletion</li>
                <li>Unauthorized access to your data</li>
                <li>Service interruptions or downtime</li>
                <li>Inaccuracies in AI-generated responses</li>
                <li>Any damages resulting from use of our service</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Backup Policy</h2>
            <p>
              <strong>You are solely responsible for maintaining backups of your data.</strong> While we implement
              reasonable security measures, we do not guarantee the preservation or availability of your data.
              Our service is not intended as a primary data storage solution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Service Modifications</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue any aspect of our service at any time
              without notice. We are not liable for any modifications, suspensions, or discontinuations.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Account Termination</h2>
            <p>
              We reserve the right to terminate or suspend your account at any time for any reason, including
              violation of these terms or for no reason at all.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact</h2>
            <p>
              For questions about these Terms of Service, please contact us through our support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
