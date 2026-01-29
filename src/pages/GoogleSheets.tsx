import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileSpreadsheet, Plus, RefreshCw, ExternalLink, Calendar, Eye, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGoogleSheets, GoogleSheet } from '@/hooks/useGoogleSheets';
import { SpreadsheetViewer } from '@/components/SpreadsheetViewer';

const GoogleSheets = () => {
  const { toast } = useToast();
  const {
    isAuthenticated,
    sheets,
    isLoading,
    isSigningIn,
    signIn,
    disconnect,
    listSheets,
    getSheetMetadata,
    readSheetData,
    createSheet,
    checkConnection,
  } = useGoogleSheets();

  const [newSheetTitle, setNewSheetTitle] = useState('');
  const [newSheetHeaders, setNewSheetHeaders] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState<GoogleSheet | null>(null);
  const [sheetData, setSheetData] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Load sheets on authentication
  useEffect(() => {
    if (isAuthenticated) {
      listSheets();
    }
  }, [isAuthenticated, listSheets]);

  // Handle new sheet creation
  const handleCreateSheet = async () => {
    if (!newSheetTitle.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for the new sheet',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      const headers = newSheetHeaders
        .split(',')
        .map(h => h.trim())
        .filter(h => h.length > 0);

      const result = await createSheet(
        newSheetTitle.trim(),
        headers.length > 0 ? headers : undefined
      );

      if (result) {
        setNewSheetTitle('');
        setNewSheetHeaders('');
        await listSheets(); // Refresh the list
      }
    } catch (error) {
      // Error already handled by the hook
    } finally {
      setIsCreating(false);
    }
  };

  // Handle sheet viewing
  const handleViewSheet = async (sheet: GoogleSheet) => {
    setSelectedSheet(sheet);
    setIsViewerOpen(true);

    try {
      const data = await readSheetData(sheet.id);
      if (data && data.values) {
        // Convert to SpreadsheetViewer format
        const headers = data.values[0] || [];
        const rows = data.values.slice(1) || [];

        const spreadsheetData = {
          sheets: [{
            name: sheet.name,
            data: rows.map(row => {
              const rowObject: Record<string, any> = {};
              headers.forEach((header, index) => {
                rowObject[header || `Column ${index + 1}`] = row[index] || '';
              });
              return rowObject;
            })
          }],
          metadata: {
            totalSheets: 1,
            hasFormulas: false,
            hasCharts: false,
            dataTypes: ['string']
          }
        };

        setSheetData(spreadsheetData);
      }
    } catch (error) {
      // Error already handled by the hook
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Google Sheets</h1>
          <p className="text-muted-foreground mt-2">
            Connect and manage your Google Sheets for AI analysis
          </p>
        </div>
      </div>

      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isAuthenticated ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            Google Sheets Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={isAuthenticated ? "default" : "secondary"}>
                {isAuthenticated ? "Connected" : "Not Connected"}
              </Badge>
              {isAuthenticated && (
                <p className="text-sm text-muted-foreground mt-2">
                  {sheets.length} sheets available
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {isAuthenticated ? (
                <Button variant="outline" onClick={disconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button onClick={signIn} disabled={isSigningIn}>
                  {isSigningIn ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Google Sheets'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {isAuthenticated ? (
        <div className="space-y-6">
          {/* Actions Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-2">
              <Button
                onClick={listSheets}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Create New Sheet Button */}
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Sheet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Google Sheet</DialogTitle>
                  <DialogDescription>
                    Create a new Google Sheet that you can query with AI
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Sheet Title</Label>
                    <Input
                      id="title"
                      value={newSheetTitle}
                      onChange={(e) => setNewSheetTitle(e.target.value)}
                      placeholder="My New Sheet"
                    />
                  </div>
                  <div>
                    <Label htmlFor="headers">Column Headers (optional)</Label>
                    <Input
                      id="headers"
                      value={newSheetHeaders}
                      onChange={(e) => setNewSheetHeaders(e.target.value)}
                      placeholder="Name, Email, Status (comma-separated)"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Leave empty to create a blank sheet
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateSheet}
                    disabled={isCreating || !newSheetTitle.trim()}
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Sheet
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sheets List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5" />
                Your Google Sheets ({sheets.length})
              </CardTitle>
              <CardDescription>
                Manage and analyze your Google Sheets with AI
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="ml-2">Loading sheets...</span>
                </div>
              ) : sheets.length === 0 ? (
                <div className="text-center py-8">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No sheets found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a new sheet or check your Google Drive for existing spreadsheets
                  </p>
                  <Button onClick={listSheets}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheets.map((sheet) => (
                      <TableRow key={sheet.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{sheet.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(sheet.modifiedTime)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewSheet(sheet)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                            >
                              <a
                                href={sheet.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-1" />
                                Open
                              </a>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Usage Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Using Google Sheets with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">Query Your Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Ask AI questions like "What's the total revenue in my Sales sheet?" or "Show me tasks due this week"
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Update Data</h4>
                  <p className="text-sm text-muted-foreground">
                    Say "Add a new expense: Office supplies, $150" and AI will update your expense tracker
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Analyze Trends</h4>
                  <p className="text-sm text-muted-foreground">
                    Get insights like "Summarize my Q1 budget performance" or "What are the top performing products?"
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">Create Reports</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate new sheets with "Create a project status report with columns: Task, Owner, Due Date"
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Connect Google Sheets</h3>
              <p className="text-muted-foreground mb-4">
                Connect your Google account to access and analyze your spreadsheets with AI
              </p>
              <Button onClick={signIn} disabled={isSigningIn}>
                {isSigningIn ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Connect Google Sheets
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sheet Viewer Modal */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {selectedSheet?.name}
            </DialogTitle>
            <DialogDescription>
              Preview of your Google Sheet data
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[60vh]">
            {sheetData && (
              <SpreadsheetViewer
                data={sheetData}
                title={selectedSheet?.name || 'Sheet'}
              />
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => selectedSheet && window.open(selectedSheet.webViewLink, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Sheets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleSheets;