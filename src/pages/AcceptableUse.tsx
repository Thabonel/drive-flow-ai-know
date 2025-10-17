import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, ShieldAlert } from 'lucide-react';

export default function AcceptableUse() {
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
          <ShieldAlert className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">Acceptable Use Policy</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2025</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Purpose</h2>
            <p>
              This Acceptable Use Policy outlines prohibited uses of AI Query Hub. Violation of this policy
              may result in suspension or termination of your account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Prohibited Activities</h2>
            <p>You may not use AI Query Hub to:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">Illegal Activities</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>Upload or distribute illegal content</li>
              <li>Infringe on intellectual property rights</li>
              <li>Engage in fraud or deceptive practices</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Harmful Content</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload malware, viruses, or malicious code</li>
              <li>Distribute spam or unsolicited communications</li>
              <li>Store or share child sexual abuse material</li>
              <li>Promote violence, terrorism, or hate speech</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Abuse of Service</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Interfere with or disrupt the service</li>
              <li>Circumvent usage limits or access controls</li>
              <li>Use automated tools to scrape or abuse the service</li>
              <li>Share account credentials with unauthorized users</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">Privacy Violations</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li>Upload documents you don't have rights to</li>
              <li>Share other people's private information without consent</li>
              <li>Violate privacy laws or regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Responsible Use</h2>
            <p>When using AI Query Hub, you should:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Only upload documents you own or have permission to use</li>
              <li>Respect intellectual property rights</li>
              <li>Use the service for legitimate business or personal purposes</li>
              <li>Maintain the security of your account credentials</li>
              <li>Report security vulnerabilities responsibly</li>
              <li>Be respectful to other users and our support team</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. AI-Generated Content</h2>
            <p>When using AI-generated responses:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Verify important information independently</li>
              <li>Do not use AI-generated content for professional advice (legal, medical, financial)</li>
              <li>Understand that AI responses may contain errors or biases</li>
              <li>Do not rely solely on AI for critical decisions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Resource Limits</h2>
            <p>You must comply with your plan's resource limits:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Storage quota</li>
              <li>Query limits</li>
              <li>API rate limits</li>
              <li>Upload file size limits</li>
            </ul>
            <p className="mt-2">
              Excessive use may result in throttling or account suspension.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Reporting Violations</h2>
            <p>
              If you believe someone is violating this policy, please report it through our support channels.
              Include as much detail as possible.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Enforcement</h2>
            <p>
              We reserve the right to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Investigate suspected violations</li>
              <li>Remove content that violates this policy</li>
              <li>Suspend or terminate accounts for violations</li>
              <li>Report illegal activity to law enforcement</li>
              <li>Take any other action we deem appropriate</li>
            </ul>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mt-2">
              <p className="font-semibold">
                Account termination for policy violations is at our sole discretion and may occur without warning.
                We are not obligated to provide refunds for terminated accounts.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this Acceptable Use Policy at any time. Continued use of the service after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p>
              For questions about this policy or to report violations, please contact us through our
              support channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
