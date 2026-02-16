import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  CheckCircle,
  AlertCircle,
  Smartphone,
  Server,
  Eye,
  Download,
  Zap,
  Shield,
  Clock
} from 'lucide-react';
import { HEICWorkflow } from './HEICWorkflow';
import { useHEICWorkflow } from '@/hooks/useHEICWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function HEICWorkflowDemo() {
  const { user } = useAuth();
  const [activeDemo, setActiveDemo] = useState<'client' | 'server' | 'integrated'>('integrated');
  const [serverTestResult, setServerTestResult] = useState<any>(null);
  const [serverTesting, setServerTesting] = useState(false);
  const workflow = useHEICWorkflow();

  const testServerProcessing = useCallback(async (file: File) => {
    if (!user) {
      toast.error('Please sign in to test server processing');
      return;
    }

    setServerTesting(true);
    setServerTestResult(null);

    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      console.log('🚀 Testing server-side HEIC processing...');

      // Call the parse-document function
      const response = await supabase.functions.invoke('parse-document', {
        body: {
          fileName: file.name,
          mimeType: file.type,
          fileData: base64
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Server processing failed');
      }

      console.log('✅ Server processing successful:', response.data);
      setServerTestResult(response.data);

      toast.success('Server-side HEIC processing completed!');

    } catch (error) {
      console.error('❌ Server processing error:', error);
      toast.error(`Server processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setServerTestResult({
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setServerTesting(false);
    }
  }, [user]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!['image/heic', 'image/heif'].includes(file.type)) {
      toast.error('Please select a HEIC or HEIF file');
      return;
    }

    if (activeDemo === 'client') {
      workflow.processFile(file);
    } else if (activeDemo === 'server') {
      testServerProcessing(file);
    }
    // 'integrated' uses the HEICWorkflow component directly
  }, [activeDemo, workflow, testServerProcessing]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="h-8 w-8 text-blue-500" />
          <h1 className="text-3xl font-bold">Complete HEIC Workflow System</h1>
          <Server className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Comprehensive end-to-end iPhone photo processing with client-side conversion,
          server-side safety net, and complete workflow management.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Client-Side Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Instant HEIC to JPEG conversion</li>
              <li>• Privacy-preserving (local processing)</li>
              <li>• Real-time progress tracking</li>
              <li>• Quality optimization</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Server-Side Safety Net
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Handles conversion failures</li>
              <li>• Advanced OCR text extraction</li>
              <li>• HEIC signature validation</li>
              <li>• Comprehensive metadata</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              Complete Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              <li>• Step-by-step progress</li>
              <li>• Image preview & verification</li>
              <li>• Quality metrics & analysis</li>
              <li>• Error handling & recovery</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Demo Tabs */}
      <Tabs value={activeDemo} onValueChange={(v) => setActiveDemo(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="integrated" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Complete Workflow
          </TabsTrigger>
          <TabsTrigger value="client" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Client-Side Only
          </TabsTrigger>
          <TabsTrigger value="server" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Server-Side Only
          </TabsTrigger>
        </TabsList>

        <TabsContent value="integrated" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Complete HEIC Workflow</CardTitle>
              <CardDescription>
                Full end-to-end processing with client conversion, server fallback, and comprehensive UI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HEICWorkflow
                onComplete={(convertedFile, originalFile) => {
                  toast.success(`Workflow completed! ${originalFile.name} → ${convertedFile.name}`);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="client" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client-Side Processing Demo</CardTitle>
              <CardDescription>
                Test the browser-based HEIC conversion using the heic2any library
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                accept="image/heic,image/heif"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />

              {workflow.state.isProcessing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Processing...</Badge>
                    <span className="text-sm text-muted-foreground">
                      Step {workflow.state.currentStep + 1} of {workflow.state.steps.length}
                    </span>
                  </div>

                  {workflow.state.steps.map((step, index) => (
                    <div key={step.id} className={`flex items-center gap-3 p-2 rounded ${
                      step.status === 'completed' ? 'bg-green-50' :
                      step.status === 'in_progress' ? 'bg-blue-50' :
                      step.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        step.status === 'completed' ? 'bg-green-500' :
                        step.status === 'in_progress' ? 'bg-blue-500' :
                        step.status === 'error' ? 'bg-red-500' : 'bg-gray-300'
                      }`} />
                      <span className="text-sm">{step.title}</span>
                      {step.progress !== undefined && step.status === 'in_progress' && (
                        <Progress value={step.progress} className="w-20 h-2" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {workflow.state.convertedFile && workflow.state.metrics && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Client-side conversion completed successfully!
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Original:</strong> {workflow.state.originalFile?.name}<br />
                      <strong>Size:</strong> {(workflow.state.metrics.originalSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <div>
                      <strong>Converted:</strong> {workflow.state.convertedFile.name}<br />
                      <strong>Size:</strong> {(workflow.state.metrics.convertedSize / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>

                  <Button onClick={() => workflow.reset()} variant="outline">
                    Test Another File
                  </Button>
                </div>
              )}

              {workflow.state.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{workflow.state.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="server" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Server-Side Processing Demo</CardTitle>
              <CardDescription>
                Test the server-side HEIC processing with Claude Vision OCR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                accept="image/heic,image/heif"
                onChange={handleFileUpload}
                disabled={serverTesting}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-green-50 file:text-green-700
                  hover:file:bg-green-100
                  disabled:opacity-50"
              />

              {serverTesting && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                  <span className="text-sm">Processing on server...</span>
                </div>
              )}

              {serverTestResult && !serverTestResult.error && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Server-side processing completed with OCR text extraction!
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Processing Results:</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>Title:</strong> {serverTestResult.title}</div>
                      <div><strong>Method:</strong> {serverTestResult.metadata?.extractionMethod}</div>
                      <div><strong>Processing Time:</strong> {serverTestResult.metadata?.processingTime}ms</div>
                      <div><strong>Content Length:</strong> {serverTestResult.content?.length} characters</div>
                    </div>
                  </div>

                  <details className="border rounded p-4">
                    <summary className="cursor-pointer font-medium">View Extracted Content</summary>
                    <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                      {serverTestResult.content}
                    </pre>
                  </details>

                  <Button onClick={() => setServerTestResult(null)} variant="outline">
                    Test Another File
                  </Button>
                </div>
              )}

              {serverTestResult?.error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{serverTestResult.error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Implementation</CardTitle>
          <CardDescription>
            How the complete HEIC workflow system works
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Client-Side Flow</h4>
              <ol className="text-sm space-y-2">
                <li>1. <strong>File Validation:</strong> Check HEIC/HEIF format and size</li>
                <li>2. <strong>heic2any Conversion:</strong> Convert to JPEG with 0.8 quality</li>
                <li>3. <strong>Preview Generation:</strong> Create before/after previews</li>
                <li>4. <strong>Quality Metrics:</strong> Calculate compression ratios</li>
                <li>5. <strong>Upload Ready:</strong> Converted file ready for use</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Server-Side Flow</h4>
              <ol className="text-sm space-y-2">
                <li>1. <strong>Signature Validation:</strong> Verify HEIC file structure</li>
                <li>2. <strong>Claude Vision OCR:</strong> Extract text and analyze image</li>
                <li>3. <strong>HEIC Optimization:</strong> iPhone-specific processing</li>
                <li>4. <strong>Metadata Generation:</strong> Comprehensive file analysis</li>
                <li>5. <strong>Document Ready:</strong> Processed content with OCR</li>
              </ol>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Safety Net Architecture</h4>
            <p className="text-sm text-blue-700">
              The system uses client-side conversion as the primary path for performance and privacy.
              If client-side conversion fails or is unavailable, the server-side processing automatically
              handles the HEIC file with advanced OCR capabilities and comprehensive analysis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}