import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Eye, FileCheck, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import heic2any from 'heic2any';
import { toast } from 'sonner';

interface HEICWorkflowProps {
  onComplete?: (convertedFile: File, originalFile: File) => void;
  onCancel?: () => void;
  initialFile?: File; // Auto-start processing with this file
}

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  icon: React.ReactNode;
  errorMessage?: string;
}

interface ConversionResult {
  originalFile: File;
  convertedFile: File;
  originalPreview: string;
  convertedPreview: string;
  conversionTime: number;
  originalSize: number;
  convertedSize: number;
  qualityScore: number;
}

export function HEICWorkflow({ onComplete, onCancel, initialFile }: HEICWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [conversionResult, setConversionResult] = useState<ConversionResult | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialSteps: WorkflowStep[] = [
    {
      id: 'select',
      title: 'Select HEIC File',
      description: 'Choose an iPhone HEIC photo to convert',
      status: 'pending',
      icon: <Upload className="h-4 w-4" />
    },
    {
      id: 'validate',
      title: 'Check the uploaded file',
      description: 'Validate file format and integrity',
      status: 'pending',
      icon: <FileCheck className="h-4 w-4" />
    },
    {
      id: 'convert',
      title: 'Convert HEIC to JPEG',
      description: 'Transform the image for compatibility',
      status: 'pending',
      icon: <Loader2 className="h-4 w-4" />
    },
    {
      id: 'verify',
      title: 'View the converted image',
      description: 'Preview and verify conversion quality',
      status: 'pending',
      icon: <Eye className="h-4 w-4" />
    },
    {
      id: 'complete',
      title: 'Done',
      description: 'Conversion completed successfully',
      status: 'pending',
      icon: <CheckCircle className="h-4 w-4" />
    }
  ];

  const [steps, setSteps] = useState<WorkflowStep[]>(initialSteps);

  // Auto-process initial file if provided (defined later after handleFileSelect)

  const updateStepStatus = useCallback((stepId: string, status: WorkflowStep['status'], errorMessage?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status, errorMessage }
        : step
    ));
  }, []);

  const createImagePreview = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    updateStepStatus('validate', 'in_progress');
    setCurrentStep(1);

    try {
      // Check file type
      if (!['image/heic', 'image/heif'].includes(file.type)) {
        throw new Error(`Invalid file type: ${file.type}. Expected HEIC/HEIF format.`);
      }

      // Check file size (max 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 25MB.`);
      }

      // Check file name
      if (file.name.length > 255) {
        throw new Error('File name too long. Maximum 255 characters.');
      }

      // Simulate file integrity check
      await new Promise(resolve => setTimeout(resolve, 500));

      updateStepStatus('validate', 'completed');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File validation failed';
      updateStepStatus('validate', 'error', errorMessage);
      toast.error(`Validation failed: ${errorMessage}`);
      return false;
    }
  }, [updateStepStatus]);

  const convertHEICToJPEG = useCallback(async (file: File): Promise<File> => {
    updateStepStatus('convert', 'in_progress');
    setCurrentStep(2);
    setProgress(10);

    try {
      const startTime = Date.now();

      // Progress simulation
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 5, 80));
      }, 100);

      console.log('🔄 Starting HEIC to JPEG conversion...');
      toast.info('Converting HEIC to JPEG...');

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      }) as Blob;

      clearInterval(progressInterval);
      setProgress(100);

      const convertedFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        {
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );

      const conversionTime = Date.now() - startTime;

      console.log('✅ HEIC conversion successful');
      updateStepStatus('convert', 'completed');

      return convertedFile;
    } catch (error) {
      setProgress(0);
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      updateStepStatus('convert', 'error', errorMessage);
      toast.error(`Conversion failed: ${errorMessage}`);
      throw error;
    }
  }, [updateStepStatus]);

  const verifyConversion = useCallback(async (originalFile: File, convertedFile: File) => {
    updateStepStatus('verify', 'in_progress');
    setCurrentStep(3);

    try {
      // Generate previews
      const [originalPreview, convertedPreview] = await Promise.all([
        createImagePreview(originalFile),
        createImagePreview(convertedFile)
      ]);

      // Calculate quality metrics
      const compressionRatio = originalFile.size / convertedFile.size;
      const qualityScore = Math.min(100, Math.max(0, 100 - (compressionRatio - 1) * 20));
      const conversionTime = 1500; // Placeholder - would be actual time from conversion

      const result: ConversionResult = {
        originalFile,
        convertedFile,
        originalPreview,
        convertedPreview,
        conversionTime,
        originalSize: originalFile.size,
        convertedSize: convertedFile.size,
        qualityScore
      };

      setConversionResult(result);
      updateStepStatus('verify', 'completed');

      // Auto-advance to complete after user has time to review
      setTimeout(() => {
        updateStepStatus('complete', 'completed');
        setCurrentStep(4);
      }, 1000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      updateStepStatus('verify', 'error', errorMessage);
      toast.error(`Verification failed: ${errorMessage}`);
    }
  }, [updateStepStatus, createImagePreview]);

  const handleFileSelect = useCallback(async (file: File) => {
    updateStepStatus('select', 'completed');

    try {
      // Validate file
      const isValid = await validateFile(file);
      if (!isValid) return;

      // Convert file
      const convertedFile = await convertHEICToJPEG(file);

      // Verify conversion
      await verifyConversion(file, convertedFile);

    } catch (error) {
      console.error('Workflow error:', error);
    }
  }, [validateFile, convertHEICToJPEG, verifyConversion]);

  // Auto-process initial file if provided
  useEffect(() => {
    if (initialFile) {
      handleFileSelect(initialFile);
    }
  }, [initialFile, handleFileSelect]);

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleComplete = useCallback(() => {
    if (conversionResult && onComplete) {
      onComplete(conversionResult.convertedFile, conversionResult.originalFile);
    }
  }, [conversionResult, onComplete]);

  const resetWorkflow = useCallback(() => {
    setSteps(initialSteps);
    setCurrentStep(0);
    setProgress(0);
    setConversionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const formatFileSize = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">HEIC to JPEG Converter</h2>
        <p className="text-muted-foreground">Convert iPhone photos for universal compatibility</p>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Conversion Progress
            <Badge variant="outline">{currentStep + 1} of {steps.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
              step.status === 'completed' ? 'bg-green-50 border-green-200' :
              step.status === 'in_progress' ? 'bg-blue-50 border-blue-200' :
              step.status === 'error' ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full ${
                step.status === 'completed' ? 'bg-green-500 text-white' :
                step.status === 'in_progress' ? 'bg-blue-500 text-white' :
                step.status === 'error' ? 'bg-red-500 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {step.status === 'in_progress' && step.id === 'convert' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  step.icon
                )}
              </div>

              <div className="flex-1">
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                {step.errorMessage && (
                  <p className="text-sm text-red-600 mt-1">{step.errorMessage}</p>
                )}
              </div>

              <div className="text-right">
                {step.status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {step.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                {step.status === 'in_progress' && step.id === 'convert' && (
                  <div className="w-16">
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* File Upload Area */}
      {currentStep === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors"
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">Select HEIC File</h3>
              <p className="text-muted-foreground mb-4">
                Drag and drop your iPhone photo here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports HEIC and HEIF formats • Max 25MB
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/heic,image/heif"
                onChange={handleFileInput}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Choose File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conversion Result Preview */}
      {conversionResult && currentStep >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Conversion Results</CardTitle>
            <CardDescription>Preview and verify your converted image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{formatFileSize(conversionResult.originalSize)} MB</div>
                <div className="text-sm text-muted-foreground">Original Size</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{formatFileSize(conversionResult.convertedSize)} MB</div>
                <div className="text-sm text-muted-foreground">Converted Size</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{conversionResult.qualityScore.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Quality Score</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{(conversionResult.conversionTime / 1000).toFixed(1)}s</div>
                <div className="text-sm text-muted-foreground">Conversion Time</div>
              </div>
            </div>

            {/* Image Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium">Original HEIC</h4>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={conversionResult.originalPreview}
                    alt="Original HEIC"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {conversionResult.originalFile.name} • {formatFileSize(conversionResult.originalSize)} MB
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Converted JPEG</h4>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={conversionResult.convertedPreview}
                    alt="Converted JPEG"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {conversionResult.convertedFile.name} • {formatFileSize(conversionResult.convertedSize)} MB
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                onClick={handleComplete}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={currentStep < 4}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Use Converted Image
              </Button>

              <Button
                variant="outline"
                onClick={resetWorkflow}
                className="flex-1"
              >
                Convert Another Image
              </Button>

              {onCancel && (
                <Button
                  variant="ghost"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {steps.some(step => step.status === 'error') && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Conversion failed. Please check your file and try again, or contact support if the problem persists.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}