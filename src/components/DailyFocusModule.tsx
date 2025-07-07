import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Target, Lightbulb, CheckCircle, Calendar } from 'lucide-react';

export const DailyFocusModule = () => {
  const [todaysFocus, setTodaysFocus] = useState('');
  const [dailyGoals, setDailyGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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

  const aiSuggestions = [
    "Ask AI to summarize your recent documents",
    "Query your knowledge bases for insights", 
    "Have AI extract action items from your files",
    "Get AI to identify key themes across documents"
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
            <Textarea
              value={todaysFocus}
              onChange={(e) => setTodaysFocus(e.target.value)}
              placeholder="What's your main focus for today?"
              className="min-h-[60px]"
            />
          ) : (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                {todaysFocus || "Click Edit to set your focus for today"}
              </p>
            </div>
          )}
        </div>

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
                className="flex-1 px-3 py-1 text-sm border rounded"
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
          <div className="space-y-2">
            {aiSuggestions.map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-accent text-xs p-2 h-auto justify-start"
                onClick={() => setTodaysFocus(suggestion)}
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