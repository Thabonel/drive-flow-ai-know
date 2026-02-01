import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Shield, Eye, Scale } from 'lucide-react';

interface TermsAcceptance {
  version: string;
  accepted: boolean;
  timestamp: string;
}

const TermsModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has already accepted terms
    const existingAcceptance = localStorage.getItem('terms-acceptance-v1');
    if (existingAcceptance) {
      try {
        const parsed = JSON.parse(existingAcceptance);
        if (parsed.accepted) {
          setShowModal(false);
          return;
        }
      } catch {
        // Invalid data, show modal
      }
    }
    setShowModal(true);
  }, []);

  const handleScroll = () => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance

    setHasScrolledToBottom(isAtBottom);
  };

  const handleAccept = () => {
    const acceptance: TermsAcceptance = {
      version: 'v1',
      accepted: true,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('terms-acceptance-v1', JSON.stringify(acceptance));
    setShowModal(false);
  };

  if (!showModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-labelledby="terms-title"
        className="w-full max-w-4xl max-h-[90vh] bg-background rounded-2xl shadow-neu-raised overflow-hidden"
      >
        <CardHeader className="pb-4">
          <CardTitle id="terms-title" className="flex items-center gap-2 text-2xl">
            <Scale className="h-6 w-6 text-primary" />
            Terms of Service
          </CardTitle>
          <p className="text-muted-foreground">
            Please read and accept our terms of service to continue using AI Query Hub.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div
            ref={scrollRef}
            data-testid="terms-content"
            onScroll={handleScroll}
            className="max-h-96 overflow-y-auto space-y-6 pr-4"
          >
            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Service Description
              </h3>
              <p className="text-muted-foreground">
                AI Query Hub ("Service") provides AI-powered document analysis and knowledge management
                capabilities. We enable users to upload documents, create knowledge bases, and query
                information using advanced language models including Claude, OpenAI GPT, and other providers.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                User Obligations
              </h3>
              <div className="text-muted-foreground space-y-2">
                <p><strong>Acceptable Use:</strong> You agree to use the Service only for lawful purposes and in compliance with applicable laws.</p>
                <p><strong>Content Responsibility:</strong> You are solely responsible for any documents, data, or content you upload to our Service.</p>
                <p><strong>Account Security:</strong> You must maintain the confidentiality of your account credentials and notify us immediately of any unauthorized access.</p>
                <p><strong>Prohibited Activities:</strong> You may not use the Service to store or process illegal content, malware, or content that violates third-party rights.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Privacy Policy
              </h3>
              <p className="text-muted-foreground">
                Your privacy is important to us. Our comprehensive Privacy Policy details how we collect,
                use, and protect your information. By accepting these terms, you also agree to our Privacy
                Policy. We implement GDPR and CCPA-compliant data protection practices.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Data Processing and AI Services</h3>
              <div className="text-muted-foreground space-y-2">
                <p><strong>AI Processing:</strong> Your documents and queries may be processed by third-party AI providers (Anthropic Claude, OpenAI) to provide our services.</p>
                <p><strong>Data Retention:</strong> We retain your data only as long as necessary to provide services or as required by law.</p>
                <p><strong>User Rights:</strong> You have rights to access, correct, delete, and export your data under applicable privacy laws.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Payment and Subscription</h3>
              <div className="text-muted-foreground space-y-2">
                <p><strong>Billing:</strong> Subscription fees are charged in advance and are non-refundable except as required by law.</p>
                <p><strong>Usage Limits:</strong> Your account may be subject to usage limits based on your subscription tier.</p>
                <p><strong>Price Changes:</strong> We may modify pricing with 30 days' notice to existing subscribers.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Limitation of Liability</h3>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>IMPORTANT LEGAL NOTICE:</strong> To the maximum extent permitted by law, AI Query Hub
                  shall not be liable for any indirect, incidental, special, consequential, or punitive damages,
                  including without limitation, loss of profits, data, use, goodwill, or other intangible losses,
                  resulting from your use of the Service.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Our total liability to you for any claim arising out of or relating to these terms or the Service
                  shall not exceed the amount you paid us in the 12 months preceding the claim.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Intellectual Property</h3>
              <div className="text-muted-foreground space-y-2">
                <p><strong>Service Ownership:</strong> AI Query Hub and its technology remain our intellectual property.</p>
                <p><strong>Your Content:</strong> You retain ownership of your uploaded content. You grant us a limited license to process and store your content to provide our services.</p>
                <p><strong>AI-Generated Content:</strong> AI-generated responses and analysis are provided as-is and may not be used to train competing AI systems.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Termination</h3>
              <div className="text-muted-foreground space-y-2">
                <p><strong>By You:</strong> You may cancel your account at any time through your account settings.</p>
                <p><strong>By Us:</strong> We may suspend or terminate accounts that violate these terms or for legal compliance reasons.</p>
                <p><strong>Effect of Termination:</strong> Upon termination, we will delete your personal data within 30 days, except where retention is required by law.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Dispute Resolution</h3>
              <div className="text-muted-foreground space-y-2">
                <p><strong>Governing Law:</strong> These terms are governed by the laws of [Your Jurisdiction].</p>
                <p><strong>Dispute Resolution:</strong> Most disputes can be resolved through our support team. For formal disputes, we prefer arbitration over litigation where legally permissible.</p>
                <p><strong>Contact:</strong> For legal matters, contact us at legal@aiqueryhub.com.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3">Changes to Terms</h3>
              <p className="text-muted-foreground">
                We may update these terms from time to time. Material changes will be communicated via email
                or through the Service. Continued use after changes constitutes acceptance of new terms.
              </p>
            </section>

            <section className="border-t pt-4">
              <p className="text-sm text-muted-foreground">
                <strong>Last Updated:</strong> February 2026<br />
                <strong>Version:</strong> 1.0<br />
                <strong>Contact:</strong> For questions about these terms, please contact us at support@aiqueryhub.com
              </p>
            </section>
          </div>

          <div className="pt-4 border-t">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleAccept}
                disabled={!hasScrolledToBottom}
                className="flex-1"
                size="lg"
              >
                I Accept the Terms of Service
              </Button>
              {!hasScrolledToBottom && (
                <p className="text-sm text-muted-foreground text-center sm:text-left">
                  Please scroll to the bottom to review all terms
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </div>
  );
};

export default TermsModal;