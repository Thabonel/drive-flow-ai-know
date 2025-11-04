import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Target, Lightbulb, CheckCircle, Calendar, Sparkles, Play, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const DailyFocusModule = () => {
  const [todaysFocus, setTodaysFocus] = useState('');
  const [dailyGoals, setDailyGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState('');
  const [showResult, setShowResult] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load saved focus and goals from localStorage
  useEffect(() => {
    const today = new Date().toDateString();
    const savedFocus = localStorage.getItem(`focus-${today}`);
    const savedGoals = localStorage.getItem(`goals-${today}`);

    if (savedFocus) setTodaysFocus(savedFocus);
    if (savedGoals) setDailyGoals(JSON.parse(savedGoals));
  }, []);

  // Save focus to localStorage
  const saveFocus = () => {
    const today = new Date().toDateString();
    localStorage.setItem(`focus-${today}`, todaysFocus);
    setIsEditing(false);
  };

  // Add a new goal
  const addGoal = () => {
    if (newGoal.trim()) {
      const updatedGoals = [...dailyGoals, newGoal.trim()];
      setDailyGoals(updatedGoals);
      setNewGoal('');

      const today = new Date().toDateString();
      localStorage.setItem(`goals-${today}`, JSON.stringify(updatedGoals));
    }
  };

  // Remove a goal
  const removeGoal = (index: number) => {
    const updatedGoals = dailyGoals.filter((_, i) => i !== index);
    setDailyGoals(updatedGoals);

    const today = new Date().toDateString();
    localStorage.setItem(`goals-${today}`, JSON.stringify(updatedGoals));
  };

  // Handle AI suggestion click - enter edit mode with suggestion text
  const handleSuggestionClick = (suggestion: string) => {
    setTodaysFocus(suggestion);
    setIsEditing(true);
    setQueryResult('');
    setShowResult(false);
  };

  // Refine the prompt using AI
  const handleRefinePrompt = async () => {
    if (!todaysFocus.trim() || !user) return;

    setIsRefining(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: `Improve this prompt to get better AI results. Make it more specific and actionable. Return ONLY the improved prompt, nothing else:\n\n"${todaysFocus}"`,
          use_documents: false
        }
      });

      if (error) throw error;

      if (data.response) {
        setTodaysFocus(data.response.trim());
        toast({
          title: 'Prompt Refined',
          description: 'Your prompt has been improved by AI',
        });
      }
    } catch (error) {
      console.error('Error refining prompt:', error);
      toast({
        title: 'Refinement Failed',
        description: 'Failed to refine the prompt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefining(false);
    }
  };

  // Execute the AI query
  const handleExecuteQuery = async () => {
    if (!todaysFocus.trim() || !user) return;

    setIsExecuting(true);
    setQueryResult('');
    setShowResult(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: todaysFocus,
          use_documents: true
        }
      });

      if (error) throw error;

      setQueryResult(data.response || 'No response generated');

      // Save to localStorage
      const today = new Date().toDateString();
      localStorage.setItem(`focus-${today}`, todaysFocus);
      setIsEditing(false);

      toast({
        title: 'Query Executed',
        description: 'AI has processed your request',
      });
    } catch (error) {
      console.error('Error executing query:', error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = String(error.message);
      }

      toast({
        title: 'Query Failed',
        description: `Failed to process your query: ${errorMessage}`,
        variant: 'destructive',
      });

      setQueryResult('Sorry, I encountered an error processing your query. Please try again or rephrase your question.');
    } finally {
      setIsExecuting(false);
    }
  };

  const aiSuggestions = [
    "Summarize my recent documents",
    "Query my knowledge bases for insights",
    "Extract action items from my files",
    "Identify key themes across my documents"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Target className="h-5 w-5 mr-2" />
          Daily Focus
        </CardTitle>
        <CardDescription className="flex items-center">
          <Calendar className="h-4 w-4 mr-1" />
          {new Date().toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's Focus */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Today's Main Focus</h4>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : (
              <div className="space-x-2">
                <Button variant="ghost" size="sm" onClick={saveFocus}>
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={todaysFocus}
                onChange={(e) => setTodaysFocus(e.target.value)}
                placeholder="What's your main focus for today?"
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefinePrompt}
                  disabled={!todaysFocus.trim() || isRefining}
                  className="flex items-center gap-1"
                >
                  {isRefining ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  {isRefining ? 'Refining...' : 'Refine Prompt'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteQuery}
                  disabled={!todaysFocus.trim() || isExecuting}
                  className="flex items-center gap-1"
                >
                  {isExecuting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  {isExecuting ? 'Executing...' : 'Execute'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                {todaysFocus || "Click Edit to set your focus for today"}
              </p>
            </div>
          )}
        </div>

        {/* Query Result */}
        {queryResult && (
          <div className="border rounded-lg">
            <button
              onClick={() => setShowResult(!showResult)}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-sm">AI Response</span>
              {showResult ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {showResult && (
              <div className="p-3 border-t bg-muted/20">
                <p className="text-sm whitespace-pre-wrap">{queryResult}</p>
              </div>
            )}
          </div>
        )}

        {/* Daily Goals */}
        <div>
          <h4 className="font-medium text-sm mb-2">Today's Goals</h4>
          <div className="space-y-2">
            {dailyGoals.map((goal, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-sm">{goal}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeGoal(index)}
                  className="h-6 w-6 p-0"
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <div className="flex space-x-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder="Add a goal..."
                className="flex-1 px-3 py-1 text-sm border border-input bg-background text-foreground rounded placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onKeyPress={(e) => e.key === 'Enter' && addGoal()}
              />
              <Button size="sm" onClick={addGoal} disabled={!newGoal.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* AI Suggestions */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center">
            <Lightbulb className="h-4 w-4 mr-1" />
            AI Suggestions
          </h4>
          <div className="flex flex-wrap gap-2">
            {aiSuggestions.map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-accent text-xs p-2 h-auto"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
