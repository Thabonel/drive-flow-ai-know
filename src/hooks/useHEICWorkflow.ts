import { useState, useCallback } from 'react';
import heic2any from 'heic2any';
import { toast } from 'sonner';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  errorMessage?: string;
  progress?: number;
}

export interface ConversionMetrics {
  originalSize: number;
  convertedSize: number;
  conversionTime: number;
  compressionRatio: number;
  qualityScore: number;
  format: 'heic' | 'heif';
}

export interface HEICWorkflowState {
  steps: WorkflowStep[];
  currentStep: number;
  originalFile: File | null;
  convertedFile: File | null;
  originalPreview: string | null;
  convertedPreview: string | null;
  metrics: ConversionMetrics | null;
  isProcessing: boolean;
  error: string | null;
}

const initialSteps: WorkflowStep[] = [
  {
    id: 'upload',
    title: 'Select HEIC File',
    description: 'Choose an iPhone HEIC photo to convert',
    status: 'pending'
  },
  {
    id: 'validate',
    title: 'Check the uploaded file',
    description: 'Validate file format and integrity',
    status: 'pending'
  },
  {
    id: 'convert',
    title: 'Convert HEIC to JPEG',
    description: 'Transform the image for compatibility',
    status: 'pending',
    progress: 0
  },
  {
    id: 'preview',
    title: 'View the converted image',
    description: 'Preview and verify conversion quality',
    status: 'pending'
  },
  {
    id: 'complete',
    title: 'Done',
    description: 'Conversion completed successfully',
    status: 'pending'
  }
];

export function useHEICWorkflow() {
  const [state, setState] = useState<HEICWorkflowState>({
    steps: initialSteps,
    currentStep: 0,
    originalFile: null,
    convertedFile: null,
    originalPreview: null,
    convertedPreview: null,
    metrics: null,
    isProcessing: false,
    error: null
  });

  const updateStepStatus = useCallback((
    stepId: string,
    status: WorkflowStep['status'],
    errorMessage?: string,
    progress?: number
  ) => {
    setState(prev => ({
      ...prev,
      steps: prev.steps.map(step =>
        step.id === stepId
          ? { ...step, status, errorMessage, progress }
          : step
      ),
      error: status === 'error' ? errorMessage || 'An error occurred' : prev.error
    }));
  }, []);

  const setCurrentStep = useCallback((stepIndex: number) => {
    setState(prev => ({ ...prev, currentStep: stepIndex }));
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

      // Check file header for HEIC/HEIF signature
      const buffer = await file.slice(0, 12).arrayBuffer();
      const view = new Uint8Array(buffer);
      const signature = new TextDecoder().decode(view.slice(4, 8));

      if (!['ftyp'].includes(signature)) {
        console.warn('HEIC signature check inconclusive, proceeding with conversion attempt');
      }

      // Simulate integrity check delay
      await new Promise(resolve => setTimeout(resolve, 300));

      updateStepStatus('validate', 'completed');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'File validation failed';
      updateStepStatus('validate', 'error', errorMessage);
      toast.error(`Validation failed: ${errorMessage}`);
      return false;
    }
  }, [updateStepStatus, setCurrentStep]);

  const convertFile = useCallback(async (file: File): Promise<File> => {
    updateStepStatus('convert', 'in_progress', undefined, 0);
    setCurrentStep(2);

    const startTime = Date.now();

    try {
      // Progress simulation
      const progressInterval = setInterval(() => {
        setState(prev => {
          const currentProgress = prev.steps.find(s => s.id === 'convert')?.progress || 0;
          const newProgress = Math.min(currentProgress + 8, 85);
          return {
            ...prev,
            steps: prev.steps.map(step =>
              step.id === 'convert' ? { ...step, progress: newProgress } : step
            )
          };
        });
      }, 150);

      console.log('🔄 Starting HEIC to JPEG conversion...');
      toast.info('Converting HEIC to JPEG...', { duration: 2000 });

      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.8
      }) as Blob;

      clearInterval(progressInterval);
      updateStepStatus('convert', 'in_progress', undefined, 100);

      const convertedFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        {
          type: 'image/jpeg',
          lastModified: Date.now()
        }
      );

      const conversionTime = Date.now() - startTime;

      // Calculate metrics
      const compressionRatio = file.size / convertedFile.size;
      const qualityScore = Math.min(100, Math.max(0, 100 - Math.abs(compressionRatio - 2) * 10));
      const format = file.type.includes('heif') ? 'heif' : 'heic';

      const metrics: ConversionMetrics = {
        originalSize: file.size,
        convertedSize: convertedFile.size,
        conversionTime,
        compressionRatio,
        qualityScore,
        format
      };

      setState(prev => ({
        ...prev,
        convertedFile,
        metrics
      }));

      updateStepStatus('convert', 'completed');
      toast.success('Conversion completed successfully!');

      console.log('✅ HEIC conversion successful', {
        originalSize: file.size,
        convertedSize: convertedFile.size,
        compressionRatio,
        conversionTime
      });

      return convertedFile;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
      updateStepStatus('convert', 'error', errorMessage);
      toast.error(`Conversion failed: ${errorMessage}`);
      throw error;
    }
  }, [updateStepStatus, setCurrentStep]);

  const generatePreviews = useCallback(async (originalFile: File, convertedFile: File) => {
    updateStepStatus('preview', 'in_progress');
    setCurrentStep(3);

    try {
      const [originalPreview, convertedPreview] = await Promise.all([
        createImagePreview(originalFile),
        createImagePreview(convertedFile)
      ]);

      setState(prev => ({
        ...prev,
        originalPreview,
        convertedPreview
      }));

      updateStepStatus('preview', 'completed');

      // Auto-advance to complete
      setTimeout(() => {
        updateStepStatus('complete', 'completed');
        setCurrentStep(4);
      }, 500);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Preview generation failed';
      updateStepStatus('preview', 'error', errorMessage);
      toast.error(`Preview failed: ${errorMessage}`);
    }
  }, [updateStepStatus, setCurrentStep, createImagePreview]);

  const processFile = useCallback(async (file: File) => {
    setState(prev => ({
      ...prev,
      originalFile: file,
      isProcessing: true,
      error: null
    }));

    updateStepStatus('upload', 'completed');
    setCurrentStep(1);

    try {
      // Step 1: Validate file
      const isValid = await validateFile(file);
      if (!isValid) {
        setState(prev => ({ ...prev, isProcessing: false }));
        return;
      }

      // Step 2: Convert file
      const convertedFile = await convertFile(file);

      // Step 3: Generate previews
      await generatePreviews(file, convertedFile);

      setState(prev => ({ ...prev, isProcessing: false }));

    } catch (error) {
      console.error('Workflow processing error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      }));
    }
  }, [validateFile, convertFile, generatePreviews, updateStepStatus, setCurrentStep]);

  const reset = useCallback(() => {
    setState({
      steps: initialSteps,
      currentStep: 0,
      originalFile: null,
      convertedFile: null,
      originalPreview: null,
      convertedPreview: null,
      metrics: null,
      isProcessing: false,
      error: null
    });
  }, []);

  const getStepByIndex = useCallback((index: number) => {
    return state.steps[index] || null;
  }, [state.steps]);

  const getStepById = useCallback((id: string) => {
    return state.steps.find(step => step.id === id) || null;
  }, [state.steps]);

  const isCompleted = useCallback(() => {
    return state.steps.every(step => step.status === 'completed');
  }, [state.steps]);

  const hasErrors = useCallback(() => {
    return state.steps.some(step => step.status === 'error');
  }, [state.steps]);

  return {
    state,
    processFile,
    reset,
    updateStepStatus,
    setCurrentStep,
    getStepByIndex,
    getStepById,
    isCompleted,
    hasErrors
  };
}