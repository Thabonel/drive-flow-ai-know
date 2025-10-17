import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Database } from 'lucide-react';

export default function DataPolicy() {
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
          <Database className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold">Data Policy</h1>
        </div>

        <div className="prose prose-slate max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: January 2025</p>

          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Data Ownership</h2>
            <p>
              You retain full ownership of all documents, files, and data you upload to AI Query Hub.
              We do not claim any ownership rights to your content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Data Storage Options</h2>
            <p>
              AI Query Hub offers flexible storage options:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Our Cloud:</strong> Data stored on our secure servers</li>
              <li><strong>Your Cloud:</strong> Connect your AWS S3, Azure, or Google Cloud storage</li>
              <li><strong>Hybrid:</strong> Metadata on our servers, documents in your storage</li>
            </ul>
            <p className="mt-2">
              Regardless of the storage option, <strong>you are responsible for maintaining backups</strong>
              of all important data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Data Processing</h2>
            <p>
              Your documents are processed by AI models to generate responses to your queries.
              This processing may involve:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Extracting text and metadata from documents</li>
              <li>Creating embeddings for semantic search</li>
              <li>Sending document excerpts to AI model providers</li>
              <li>Storing AI-generated summaries</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Data Retention and Deletion</h2>
            <p>
              <strong>Active Accounts:</strong> Data is retained as long as your account is active.
            </p>
            <p>
              <strong>Account Deletion:</strong> Upon account deletion, we will:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Delete your documents and data within 30 days</li>
              <li>Remove AI-generated summaries and embeddings</li>
              <li>Retain minimal transaction data for legal/regulatory purposes</li>
            </ul>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg mt-2">
              <p className="font-semibold">
                Warning: Data deletion is irreversible. We cannot recover your data once it has been deleted.
                Ensure you have backups before deleting your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Backups</h2>
            <p>
              While we perform regular backups of our systems:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Backups are for disaster recovery purposes only</li>
              <li>We do not guarantee the availability or completeness of backups</li>
              <li>We are not obligated to restore data from backups</li>
              <li><strong>YOU MUST MAINTAIN YOUR OWN BACKUPS</strong></li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Security</h2>
            <p>
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit (TLS/SSL)</li>
              <li>Encryption at rest (AES-256)</li>
              <li>Access controls and authentication</li>
              <li>Regular security audits</li>
            </ul>
            <p className="mt-2">
              However, <strong>no system is completely secure</strong>. We cannot guarantee absolute
              protection against unauthorized access, data breaches, or security incidents.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Data Sharing</h2>
            <p>
              We share your data with third parties only as necessary to provide our services:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>AI Model Providers:</strong> Document excerpts sent for processing</li>
              <li><strong>Cloud Storage Providers:</strong> If you choose external storage</li>
              <li><strong>Payment Processors:</strong> For billing purposes</li>
              <li><strong>Analytics Services:</strong> Anonymized usage data</li>
            </ul>
            <p className="mt-2">
              We do not sell your personal data or documents to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Data Export</h2>
            <p>
              You can export your data at any time:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Download all documents and files</li>
              <li>Export knowledge base data</li>
              <li>Request a copy of your account data</li>
            </ul>
            <p className="mt-2">
              We provide data export in standard formats (JSON, CSV, original file formats).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Data Breach Notification</h2>
            <p>
              In the event of a data breach that affects your personal information, we will:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Notify you within 72 hours of discovery</li>
              <li>Provide details about the breach and affected data</li>
              <li>Explain steps we are taking to address the breach</li>
              <li>Recommend actions you should take</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Disclaimer</h2>
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-lg">
              <p>
                Despite our best efforts, <strong>we are not responsible for data loss, corruption,
                unauthorized access, or breaches</strong>. You use our service at your own risk and must
                maintain independent backups of all important data.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
