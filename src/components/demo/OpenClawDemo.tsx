// OpenClaw Integration Demo Component
// Demonstrates Phase 1 implementation capabilities
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  extractTimelineFromText,
  useOpenClawAuth,
  getOpenClawClient,
  OpenClawClient,
  type TimelineEvent,
  type TimelineExtractionResponse
} from '@/integrations/openclaw';

interface HealthStatus {
  gateway: 'connected' | 'disconnected' | 'error';
  authentication: 'active' | 'inactive' | 'error';
  overall: 'excellent' | 'good' | 'fair' | 'poor';
}

const OpenClawDemo: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Demo input and results
  const [inputText, setInputText] = useState(
    'Team standup meeting every Monday at 9am for 30 minutes\n' +
    'Code review session Tuesday 2pm - 3pm\n' +
    'Sprint planning Wednesday 10am-12pm (2 hours)\n' +
    'Client presentation Friday at 3pm, prepare slides (1 hour prep)'
  );
  const [extractionResult, setExtractionResult] = useState<TimelineExtractionResponse | null>(null);

  // Use OpenClaw auth hook
  const { authState } = useOpenClawAuth();

  // Initialize OpenClaw on component mount
  useEffect(() => {
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('Initializing OpenClaw integration...');

      getOpenClawClient(); // Initialize client
      const isAvailable = await OpenClawClient.isAvailable();

      setIsInitialized(isAvailable);

      if (!isAvailable) {
        setError('OpenClaw Gateway not available. This is expected in development mode.');
      }

      // Simple health check
      const currentHealth: HealthStatus = {
        gateway: isAvailable ? 'connected' : 'disconnected',
        authentication: authState?.isAuthenticated ? 'active' : 'inactive',
        overall: isAvailable && authState?.isAuthenticated ? 'good' : 'fair'
      };
      setHealth(currentHealth);

      console.log('OpenClaw initialization complete');

    } catch (error) {
      console.error('Failed to initialize OpenClaw:', error);
      setError(`Initialization failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTextExtraction = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    setError(null);
    setExtractionResult(null);

    try {
      console.log('Extracting timeline from text:', inputText);

      const result = await extractTimelineFromText(inputText, {
        learningEnabled: true,
        contextHints: {
          projectType: 'software_development',
          urgency: 'medium',
          estimationStyle: 'realistic'
        }
      });

      setExtractionResult(result);
      console.log('Extraction result:', result);

    } catch (error) {
      console.error('Timeline extraction failed:', error);
      setError(`Extraction failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'connected':
      case 'active':
        return 'bg-green-500';
      case 'good':
        return 'bg-yellow-500';
      case 'fair':
      case 'disconnected':
      case 'inactive':
        return 'bg-orange-500';
      default:
        return 'bg-red-500';
    }
  };

  const formatTimelineEvent = (event: TimelineEvent) => {
    const startTime = new Date(event.startTime).toLocaleString();
    const duration = event.duration ? `${event.duration}min` : 'No duration';
    const type = event.type || 'task';
    const priority = event.priority || 'medium';

    return (
      <div key={event.id || event.title} className="border rounded p-3 mb-2 bg-gray-50">
        <div className="font-semibold">{event.title}</div>
        {event.description && <div className="text-sm text-gray-600">{event.description}</div>}
        <div className="text-sm mt-2 flex gap-2">
          <Badge variant="outline">{startTime}</Badge>
          <Badge variant="outline">{duration}</Badge>
          <Badge variant="outline">{type}</Badge>
          <Badge variant="outline">{priority}</Badge>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-primary">OpenClaw Integration Demo</h1>
        <p className="text-muted-foreground mt-2">
          Phase 1: Complete Infrastructure Implementation
        </p>
      </div>

      {/* Status Panel */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <div className="text-sm font-medium">Initialized</div>
            <div className="text-xs text-muted-foreground">{isInitialized ? 'Ready' : 'Not Ready'}</div>
          </div>

          {health && Object.entries(health).map(([key, value]) => (
            <div key={key} className="text-center">
              <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getHealthColor(value)}`}></div>
              <div className="text-sm font-medium capitalize">{key}</div>
              <div className="text-xs text-muted-foreground capitalize">{value}</div>
            </div>
          ))}
        </div>

        <Button
          onClick={initializeDemo}
          disabled={loading}
          variant={isInitialized ? "outline" : "default"}
        >
          {loading ? 'Initializing...' : isInitialized ? 'Reinitialize' : 'Initialize OpenClaw'}
        </Button>
      </Card>

      {/* Authentication Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>

        {authState?.isAuthenticated ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">Authenticated</Badge>
              <span>{authState.user?.email}</span>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Permissions:</div>
              <div className="flex flex-wrap gap-1">
                <Badge variant={authState.permissions.canUseOpenClaw ? "default" : "secondary"}>
                  OpenClaw Access: {authState.permissions.canUseOpenClaw ? 'Yes' : 'No'}
                </Badge>
                <Badge variant={authState.permissions.canAccessLearning ? "default" : "secondary"}>
                  Learning: {authState.permissions.canAccessLearning ? 'Yes' : 'No'}
                </Badge>
                <Badge variant="outline">
                  Max Executions: {authState.permissions.maxSkillExecutions === -1 ? 'Unlimited' : authState.permissions.maxSkillExecutions}
                </Badge>
              </div>
            </div>

            {authState.workspace && (
              <div className="text-sm">
                <div className="font-medium">Workspace:</div>
                <div className="text-muted-foreground">
                  ID: {authState.workspace.id}<br/>
                  Session: {authState.workspace.sessionId}<br/>
                  Status: {authState.workspace.isActive ? 'Active' : 'Inactive'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Badge variant="secondary">Not Authenticated</Badge>
        )}
      </Card>

      {/* Timeline Extraction Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Timeline Extraction Demo</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Input Text (Natural Language Schedule)
            </label>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Describe your schedule in natural language..."
              className="min-h-[120px]"
            />
          </div>

          <Button
            onClick={handleTextExtraction}
            disabled={loading || !isInitialized || !authState?.permissions.canUseOpenClaw}
          >
            {loading ? 'Extracting...' : 'Extract Timeline'}
          </Button>

          {!authState?.permissions.canUseOpenClaw && (
            <div className="text-sm text-muted-foreground">
              OpenClaw access required for timeline extraction
            </div>
          )}
        </div>
      </Card>

      {/* Extraction Results */}
      {extractionResult && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Extraction Results</h2>

          <div className="space-y-4">
            <div className="flex gap-4 text-sm">
              <Badge variant="outline">
                Confidence: {Math.round(extractionResult.confidence * 100)}%
              </Badge>
              <Badge variant="outline">
                Events: {extractionResult.events.length}
              </Badge>
              {extractionResult.metadata?.processingTime && (
                <Badge variant="outline">
                  Processing: {extractionResult.metadata.processingTime}ms
                </Badge>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">Extracted Events:</h3>
              {extractionResult.events.length > 0 ? (
                <div className="space-y-2">
                  {extractionResult.events.map(formatTimelineEvent)}
                </div>
              ) : (
                <div className="text-muted-foreground">No events extracted</div>
              )}
            </div>

            {extractionResult.suggestions?.optimizations && extractionResult.suggestions.optimizations.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Suggestions:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {extractionResult.suggestions.optimizations.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-700 text-sm">{error}</p>
          <p className="text-red-600 text-xs mt-2">
            Note: This demo requires OpenClaw Gateway running on ws://127.0.0.1:18789
          </p>
        </Card>
      )}

      {/* Phase 1 Implementation Summary */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">Phase 1 Implementation Complete</h3>
        <div className="text-blue-700 text-sm space-y-2">
          <div className="font-medium">✅ Deliverables Completed:</div>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li><code>src/integrations/openclaw/client.ts</code> - WebSocket gateway client with skill execution</li>
            <li><code>src/integrations/openclaw/session-manager.ts</code> - User workspace isolation & learning profiles</li>
            <li><code>src/integrations/openclaw/skill-executor.ts</code> - Type-safe skill framework with validation</li>
            <li><code>src/integrations/openclaw/auth-bridge.ts</code> - Supabase authentication integration</li>
          </ul>
          <div className="font-medium mt-3">🚀 Ready for Phase 2:</div>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Replace existing regex parsing with OpenClaw timeline extraction</li>
            <li>Integrate with TimelineManager component (reduce from 1,491 to ~300 lines)</li>
            <li>A/B testing framework for parsing accuracy comparison</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default OpenClawDemo;