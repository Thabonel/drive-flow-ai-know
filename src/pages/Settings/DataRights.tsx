import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Trash2,
  Edit,
  Shield,
  Mail,
  Clock,
  FileText,
  MessageSquare,
  Search,
  Settings,
  AlertTriangle,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function DataRightsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isExporting, setIsExporting] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [exportError, setExportError] = useState(false);

  const handleDataExport = async () => {
    if (!user) return;

    setIsExporting(true);
    setExportError(false);

    try {
      const { data, error } = await supabase.functions.invoke('export-user-data', {
        body: { user_id: user.id }
      });

      if (error) {
        throw error;
      }

      setExportRequested(true);
      toast({
        title: 'Export Requested Successfully',
        description: 'Your data export has been requested. You will receive an email when it\'s ready for download.',
      });

    } catch (error) {
      console.error('Export error:', error);
      setExportError(true);
      toast({
        title: 'Export Failed',
        description: 'There was an error requesting your data export. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleAccountDeletion = async () => {
    if (!user || deleteConfirmation !== 'DELETE_MY_ACCOUNT') return;

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        body: {
          user_id: user.id,
          confirmation: deleteConfirmation,
          reason: 'User requested account deletion via data rights portal'
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Account Deletion Scheduled',
        description: `Your account has been scheduled for deletion. You have 30 days to cancel this request if you change your mind.`,
      });

      setShowDeleteDialog(false);

    } catch (error) {
      console.error('Deletion error:', error);
      toast({
        title: 'Deletion Failed',
        description: 'There was an error scheduling your account deletion. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isDeleteConfirmationValid = deleteConfirmation === 'DELETE_MY_ACCOUNT';

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Data Rights Portal</h1>
        <p className="text-muted-foreground">
          Manage your personal data and exercise your privacy rights under GDPR and CCPA.
        </p>
      </div>

      {/* Your Data Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Your Data Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Here's an overview of the personal data we process about you:
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <FileText className="h-4 w-4 text-blue-500" />
              <div>
                <div className="font-medium">Documents</div>
                <div className="text-xs text-muted-foreground">Files you've uploaded</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <div>
                <div className="font-medium">Conversations</div>
                <div className="text-xs text-muted-foreground">AI chat history</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Search className="h-4 w-4 text-purple-500" />
              <div>
                <div className="font-medium">Query History</div>
                <div className="text-xs text-muted-foreground">Search queries</div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Settings className="h-4 w-4 text-gray-500" />
              <div>
                <div className="font-medium">Settings</div>
                <div className="text-xs text-muted-foreground">Preferences & config</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export My Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export My Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Download a complete copy of your personal data in a structured format.
            The export will be available <strong>within 30 days</strong> and will include
            all your documents, conversations, settings, and activity history in a
            <strong>structured format</strong> (JSON).
          </p>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Processing time:</strong> Data exports: up to 30 days
            </AlertDescription>
          </Alert>

          {exportRequested && !exportError && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Export requested! You will receive an email when your data export is ready for download.
              </AlertDescription>
            </Alert>
          )}

          {exportError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Export failed. Please try again or contact support if the issue persists.
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleDataExport}
            disabled={isExporting || exportRequested}
            className="w-full sm:w-auto"
          >
            {isExporting ? 'Requesting Export...' : 'Export My Data'}
          </Button>
        </CardContent>
      </Card>

      {/* Correct My Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Correct My Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Update and correct your personal information. You have the right to rectification
            under GDPR Article 16.
          </p>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Processing time:</strong> Data corrections: immediate
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            <Button variant="outline" asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Update Profile
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/documents">
                <FileText className="mr-2 h-4 w-4" />
                Manage Documents
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Review Settings
                <ExternalLink className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete My Account */}
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
            Delete My Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data. This action
              includes a <strong>30-day grace period</strong> during which you can
              <strong>cancel your request</strong> if you change your mind.
            </p>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This is a <strong>permanent action</strong>.
                After the grace period, all your data will be permanently deleted and cannot be recovered.
              </AlertDescription>
            </Alert>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Processing time:</strong> Account deletion: immediate scheduling
              </AlertDescription>
            </Alert>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            className="w-full sm:w-auto"
          >
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Your Privacy Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Privacy Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Under GDPR and CCPA, you have the following rights regarding your personal data:
          </p>

          <div className="grid gap-3">
            <div className="flex gap-3 p-3 border rounded-lg">
              <Badge variant="outline">GDPR Art. 15</Badge>
              <div>
                <div className="font-medium">Right to Access</div>
                <div className="text-sm text-muted-foreground">
                  Obtain confirmation that we process your data and access to that data
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-3 border rounded-lg">
              <Badge variant="outline">GDPR Art. 16</Badge>
              <div>
                <div className="font-medium">Right to Rectification</div>
                <div className="text-sm text-muted-foreground">
                  Correct inaccurate or incomplete personal data
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-3 border rounded-lg">
              <Badge variant="outline">GDPR Art. 17</Badge>
              <div>
                <div className="font-medium">Right to Erasure</div>
                <div className="text-sm text-muted-foreground">
                  Request deletion of your personal data under certain circumstances
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-3 border rounded-lg">
              <Badge variant="outline">GDPR Art. 20</Badge>
              <div>
                <div className="font-medium">Right to Data Portability</div>
                <div className="text-sm text-muted-foreground">
                  Receive your data in a structured, machine-readable format
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            <h4 className="font-medium">Legal Documents</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/privacy">
                  Privacy Policy
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/terms">
                  Terms of Service
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Protection Officer */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Data Protection Officer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            For privacy-related questions or to exercise your rights, contact our Data Protection Officer:
          </p>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <a
              href="mailto:privacy@aiqueryhub.com"
              className="text-primary hover:underline"
            >
              privacy@aiqueryhub.com
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Account Deletion
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action will:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Schedule your account for deletion in 30 days</li>
              <li>• Delete all your documents, conversations, and data</li>
              <li>• Remove access to all AI Query Hub services</li>
              <li>• Send you a cancellation token for the 30-day grace period</li>
            </ul>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                You will have a <strong>30-day grace period</strong> to cancel this request if you change your mind.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type "DELETE_MY_ACCOUNT" to confirm:
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE_MY_ACCOUNT"
                aria-label="Type DELETE_MY_ACCOUNT to confirm"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="destructive"
                onClick={handleAccountDeletion}
                disabled={!isDeleteConfirmationValid || isDeleting}
                className="flex-1"
              >
                {isDeleting ? 'Processing...' : 'Confirm Deletion'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}