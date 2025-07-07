import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, CheckSquare, Clock, Sparkles, PlusCircle } from 'lucide-react';

export const AIAssistantSidebar = () => {
  const [activeTools, setActiveTools] = useState<string[]>([]);

  const quickAITools = [
    { id: 'summarize', name: 'Summarize', icon: Brain, description: 'Create quick summaries' },
    { id: 'brainstorm', name: 'Brainstorm', icon: Sparkles, description: 'Generate ideas' },
    { id: 'actions', name: 'Action Steps', icon: CheckSquare, description: 'Extract action items' },
    { id: 'insights', name: 'Insights', icon: Zap, description: 'Find key insights' },
  ];

  const recentAIOutputs = [
    {
      id: 1,
      type: 'summary',
      title: 'Q1 Marketing Strategy Summary',
      timestamp: '2 hours ago',
      preview: 'Key focus areas: digital transformation, customer retention...'
    },
    {
      id: 2,
      type: 'brainstorm',
      title: 'Product Feature Ideas',
      timestamp: '5 hours ago',
      preview: 'Generated 8 new feature concepts based on user feedback...'
    },
    {
      id: 3,
      type: 'actions',
      title: 'Meeting Action Items',
      timestamp: '1 day ago',
      preview: 'Extracted 5 action items from team meeting notes...'
    }
  ];

  const activeTasks = [
    { id: 1, task: 'Analyze competitor research docs', status: 'in-progress' },
    { id: 2, task: 'Generate marketing copy variations', status: 'pending' },
    { id: 3, task: 'Summarize customer feedback', status: 'completed' }
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'in-progress': 'bg-blue-100 text-blue-700 border-blue-200',
      'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      summary: Brain,
      brainstorm: Sparkles,
      actions: CheckSquare,
      insights: Zap
    };
    const IconComponent = icons[type as keyof typeof icons] || Brain;
    return <IconComponent className="h-3 w-3" />;
  };

  return (
    <div className="w-80 space-y-6 h-full overflow-y-auto">
      {/* Quick AI Tools */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Quick AI Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quickAITools.map((tool) => {
            const IconComponent = tool.icon;
            return (
              <Button
                key={tool.id}
                variant="outline"
                size="sm"
                className="w-full justify-start h-auto p-3"
              >
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium text-sm">{tool.name}</div>
                    <div className="text-xs text-muted-foreground">{tool.description}</div>
                  </div>
                </div>
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Active AI Tasks */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <CheckSquare className="h-4 w-4 mr-2" />
            Active Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {activeTasks.map((item) => (
            <div key={item.id} className="p-2 border rounded text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium truncate">{item.task}</span>
                <Badge variant="outline" className={`${getStatusColor(item.status)} text-xs`}>
                  {item.status}
                </Badge>
              </div>
            </div>
          ))}
          
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add New Task
          </Button>
        </CardContent>
      </Card>

      {/* Recent AI Outputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            Recent AI Outputs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentAIOutputs.map((output) => (
            <div key={output.id} className="p-2 border rounded cursor-pointer hover:bg-accent/50">
              <div className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {getTypeIcon(output.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{output.title}</div>
                  <div className="text-xs text-muted-foreground mb-1">{output.timestamp}</div>
                  <div className="text-xs text-muted-foreground truncate">{output.preview}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Daily AI Prompt */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Sparkles className="h-4 w-4 mr-2 text-blue-600" />
            AI Suggestion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700 mb-3">
            "What should I work on now?"
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Based on your recent activity, consider reviewing your marketing knowledge base and updating any outdated strategies.
          </p>
          <Button size="sm" variant="outline" className="w-full">
            Get More Suggestions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};