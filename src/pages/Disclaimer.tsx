import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle } from 'lucide-react';

export default function Disclaimer() {
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
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <h1 className="text-4xl font-bold">Disclaimer</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <div className="bg-destructive/10 border-2 border-destructive/50 p-6 rounded-lg">
            <p className="text-lg font-semibold text-destructive mb-2">
              PLEASE READ THIS DISCLAIMER CAREFULLY BEFORE USING AI QUERY HUB
            </p>
            <p>
              By using our service, you acknowledge and agree to all disclaimers and limitations set forth below.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4">No Warranty</h2>
            <p>
              AI Query Hub is provided "AS IS" and "AS AVAILABLE" without warranty of any kind, either express
              or implied, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Warranties of merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
              <li>Accuracy or completeness of information</li>
              <li>Uninterrupted or error-free service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Loss and Corruption</h2>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
              <p className="font-semibold mb-2">WE ARE NOT RESPONSIBLE FOR:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Loss of data, documents, or files</li>
                <li>Corruption of uploaded documents</li>
                <li>Unauthorized access to your data</li>
                <li>Service outages or downtime</li>
                <li>Hardware or software failures</li>
                <li>Security breaches</li>
              </ul>
            </div>
            <p className="mt-4">
              <strong>YOU MUST MAINTAIN YOUR OWN BACKUPS.</strong> Our service is not a backup solution and
              should not be relied upon as the sole repository for important documents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">AI-Generated Content</h2>
            <p>
              AI-generated responses may contain errors, inaccuracies, or hallucinations. We do not guarantee:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Accuracy of AI-generated answers</li>
              <li>Completeness of information provided</li>
              <li>Suitability for any particular purpose</li>
              <li>Freedom from bias or errors</li>
            </ul>
            <p className="mt-2">
              Always verify important information independently. Do not rely solely on AI-generated content
              for critical decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p>
              We integrate with third-party services (Google Drive, cloud storage providers, AI model providers).
              We are not responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Availability or performance of third-party services</li>
              <li>Third-party data practices or security</li>
              <li>Changes to third-party APIs or pricing</li>
              <li>Loss of access to third-party services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, AI QUERY HUB SHALL NOT BE LIABLE FOR ANY:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Direct, indirect, incidental, or consequential damages</li>
              <li>Loss of profits, data, or business opportunities</li>
              <li>Damages arising from use or inability to use the service</li>
              <li>Damages from unauthorized access or data breaches</li>
            </ul>
            <p className="mt-2">
              Your sole remedy for dissatisfaction with the service is to stop using it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Professional Advice Disclaimer</h2>
            <p>
              AI Query Hub does not provide legal, financial, medical, or other professional advice.
              Consult qualified professionals for specific guidance related to your situation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Responsibility</h2>
            <p>
              You are solely responsible for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintaining backups of all important data</li>
              <li>Verifying the accuracy of AI-generated content</li>
              <li>Compliance with applicable laws and regulations</li>
              <li>Securing your account credentials</li>
              <li>All content you upload to the service</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
