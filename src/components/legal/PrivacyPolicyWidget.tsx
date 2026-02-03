import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Shield, Eye, Cookie, FileText } from 'lucide-react';

interface ConsentData {
  version: string;
  accepted: boolean;
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

interface PrivacyPolicyWidgetProps {
  showFullPolicy?: boolean;
}

const PrivacyPolicyWidget = ({ showFullPolicy = false }: PrivacyPolicyWidgetProps) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [consent, setConsent] = useState<ConsentData>({
    version: 'v1',
    accepted: false,
    essential: true, // Always required
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString()
  });

  useEffect(() => {
    // Check existing consent
    const existingConsent = localStorage.getItem('privacy-consent-v1');
    if (existingConsent) {
      try {
        const parsed = JSON.parse(existingConsent);
        setConsent(parsed);
        setShowBanner(false);
      } catch {
        setShowBanner(true);
      }
    } else {
      setShowBanner(true);
    }
  }, []);

  const saveConsent = (consentData: ConsentData) => {
    const consentRecord = {
      ...consentData,
      timestamp: new Date().toISOString()
    };

    localStorage.setItem('privacy-consent-v1', JSON.stringify(consentRecord));
    setConsent(consentRecord);
    setShowBanner(false);
    setShowPreferences(false);
  };

  const acceptAll = () => {
    saveConsent({
      version: 'v1',
      accepted: true,
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    });
  };

  const acceptSelected = () => {
    saveConsent({
      ...consent,
      accepted: true,
      timestamp: new Date().toISOString()
    });
  };

  const withdrawConsent = () => {
    localStorage.removeItem('privacy-consent-v1');
    setConsent({
      version: 'v1',
      accepted: false,
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    });
    setShowBanner(true);
  };

  if (showFullPolicy) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Data Collection
            </h2>
            <p className="text-muted-foreground">
              We collect information you provide directly to us, such as when you create an account,
              upload documents, or use our AI query features. This includes your email address,
              documents you upload, and your interactions with our AI services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Cookie className="h-5 w-5" />
              Cookies
            </h2>
            <p className="text-muted-foreground">
              We use cookies and similar tracking technologies to provide and improve our services.
              Essential cookies are required for the application to function. Analytics cookies help
              us understand how you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Third-Party Services
            </h2>
            <p className="text-muted-foreground">
              We work with third-party providers including Anthropic (Claude AI), Google (Drive integration),
              and Supabase (data storage). These services process your data according to their own privacy
              policies and our data processing agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your Rights
            </h2>
            <p className="text-muted-foreground">
              Under GDPR and CCPA, you have rights to access, correct, delete, and export your personal data.
              You can exercise these rights through your account settings or by contacting our support team.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <p className="text-muted-foreground">
              If you have questions about this privacy policy, please contact us at privacy@aiqueryhub.com.
            </p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Consent Banner */}
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
          <div className="max-w-7xl mx-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  We use cookies and collect data to improve your experience. Read our{' '}
                  <a
                    href="/privacy"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </a>{' '}
                  for details.
                </p>

                {showPreferences ? (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Essential</h4>
                          <p className="text-sm text-muted-foreground">
                            Required for the application to function
                          </p>
                        </div>
                        <Switch
                          checked={consent.essential}
                          disabled={true}
                          aria-label="Essential cookies (required)"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Analytics</h4>
                          <p className="text-sm text-muted-foreground">
                            Help us improve the service
                          </p>
                        </div>
                        <Switch
                          checked={consent.analytics}
                          onCheckedChange={(checked) =>
                            setConsent({ ...consent, analytics: checked })
                          }
                          aria-label="Analytics cookies"
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Marketing</h4>
                          <p className="text-sm text-muted-foreground">
                            Personalized content and ads
                          </p>
                        </div>
                        <Switch
                          checked={consent.marketing}
                          onCheckedChange={(checked) =>
                            setConsent({ ...consent, marketing: checked })
                          }
                          aria-label="Marketing cookies"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={acceptSelected} className="flex-1">
                        Save Preferences
                      </Button>
                      <Button
                        onClick={() => setShowPreferences(false)}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={acceptAll}>Accept All</Button>
                    <Button
                      onClick={() => setShowPreferences(true)}
                      variant="outline"
                    >
                      Customize
                    </Button>
                    <Button
                      onClick={() => setShowBanner(false)}
                      variant="ghost"
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Manage Preferences Button removed - now available in Settings > Security */}

      {/* Preferences Modal */}
      {showPreferences && consent.accepted && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Privacy Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Essential</h4>
                    <p className="text-sm text-muted-foreground">
                      Required for the application to function
                    </p>
                  </div>
                  <Switch checked={true} disabled={true} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-muted-foreground">
                      Help us improve the service
                    </p>
                  </div>
                  <Switch
                    checked={consent.analytics}
                    onCheckedChange={(checked) =>
                      setConsent({ ...consent, analytics: checked })
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={acceptSelected}>Save Preferences</Button>
                <Button
                  onClick={withdrawConsent}
                  variant="destructive"
                  size="sm"
                >
                  Withdraw Consent
                </Button>
                <Button
                  onClick={() => setShowPreferences(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default PrivacyPolicyWidget;