import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  Calendar,
  TrendingUp,
  Inbox,
  Filter,
  Settings,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useAIEmailParser } from '@/hooks/useAIEmailParser';
import { format, formatDistanceToNow } from 'date-fns';

interface EmailDetailDialogProps {
  email: any;
  onClose: () => void;
  onIgnore: (reason?: string) => void;
  onMarkReviewed: () => void;
}

function EmailDetailDialog({ email, onClose, onIgnore, onMarkReviewed }: EmailDetailDialogProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {email.subject}
          </DialogTitle>
          <DialogDescription>
            From: {email.from_name || email.from_email} • {formatDistanceToNow(new Date(email.received_at))} ago
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Summary */}
          {email.ai_summary && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">AI Summary</span>
              </div>
              <p className="text-sm">{email.ai_summary}</p>
            </div>
          )}

          {/* Category and Priority */}
          <div className="flex items-center gap-2">
            {email.ai_category && (
              <Badge variant="outline">{email.ai_category}</Badge>
            )}
            {email.ai_priority && (
              <Badge variant={email.ai_priority <= 2 ? 'destructive' : 'secondary'}>
                Priority {email.ai_priority}
              </Badge>
            )}
          </div>

          {/* Email Body */}
          <Separator />
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm">{email.body_text}</pre>
          </div>

          {/* Extracted Tasks */}
          {email.ai_extracted_tasks && email.ai_extracted_tasks.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Extracted Tasks ({email.ai_extracted_tasks.length})
                </h4>
                <div className="space-y-2">
                  {email.ai_extracted_tasks.map((task: any, index: number) => (
                    <div key={index} className="p-3 border rounded-lg bg-card">
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {task.priority && (
                          <Badge variant="outline" className="text-xs">
                            P{task.priority}
                          </Badge>
                        )}
                        {task.estimated_duration_minutes && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimated_duration_minutes} min
                          </span>
                        )}
                        {task.category && (
                          <span>{task.category}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onMarkReviewed}>
              Mark as Reviewed
            </Button>
            <Button variant="outline" onClick={() => onIgnore()}>
              Ignore Email
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EmailToTaskManager() {
  const {
    pendingEmails,
    pendingTasks,
    senderPatterns,
    loading,
    approveTask,
    rejectTask,
    updateTask,
    markEmailReviewed,
    ignoreEmail,
    updateSenderPattern,
    approveAllTasks
  } = useAIEmailParser();

  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [taskEdits, setTaskEdits] = useState<any>({});
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleApproveTask = (taskId: string) => {
    const edits = taskEdits[taskId];
    if (edits) {
      updateTask(taskId, edits);
    }
    approveTask(taskId);
    setEditingTask(null);
    setTaskEdits({});
  };

  const handleEditTask = (task: any) => {
    setEditingTask(task.id);
    setTaskEdits({
      ...taskEdits,
      [task.id]: {
        user_edited_title: task.user_edited_title || task.title,
        user_edited_description: task.user_edited_description || task.description,
        user_edited_priority: task.user_edited_priority || task.ai_priority,
        user_edited_deadline: task.user_edited_deadline || task.ai_suggested_deadline
      }
    });
  };

  const handleUpdateTaskEdit = (taskId: string, field: string, value: any) => {
    setTaskEdits({
      ...taskEdits,
      [taskId]: {
        ...taskEdits[taskId],
        [field]: value
      }
    });
  };

  const filteredTasks = filterCategory === 'all'
    ? pendingTasks
    : pendingTasks.filter(t => t.ai_category === filterCategory);

  const categories = Array.from(new Set(pendingTasks.map(t => t.ai_category).filter(Boolean)));

  if (loading && pendingEmails.length === 0 && pendingTasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Mail className="h-8 w-8" />
            Email to Task
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered email processing and task extraction
          </p>
        </div>
        <div className="flex gap-2">
          {pendingTasks.length > 0 && (
            <Button onClick={approveAllTasks}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve All ({pendingTasks.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Inbox className="h-4 w-4 text-blue-500" />
              Pending Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEmails.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting your review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Extracted Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ready to approve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Learned Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{senderPatterns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Sender patterns recognized
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Tasks ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="emails">
            <Mail className="h-4 w-4 mr-2" />
            Emails ({pendingEmails.length})
          </TabsTrigger>
          <TabsTrigger value="patterns">
            <Settings className="h-4 w-4 mr-2" />
            Patterns ({senderPatterns.length})
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {/* Filter */}
          {categories.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory('all')}
              >
                All
              </Button>
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={filterCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(cat as string)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <Alert>
              <Inbox className="h-4 w-4" />
              <AlertDescription>
                No pending tasks. AI will extract tasks from incoming emails automatically.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="pt-6">
                    {editingTask === task.id ? (
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Title</label>
                          <Input
                            value={taskEdits[task.id]?.user_edited_title || ''}
                            onChange={(e) => handleUpdateTaskEdit(task.id, 'user_edited_title', e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Description</label>
                          <Textarea
                            value={taskEdits[task.id]?.user_edited_description || ''}
                            onChange={(e) => handleUpdateTaskEdit(task.id, 'user_edited_description', e.target.value)}
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Priority (1-5)</label>
                            <Input
                              type="number"
                              min="1"
                              max="5"
                              value={taskEdits[task.id]?.user_edited_priority || ''}
                              onChange={(e) => handleUpdateTaskEdit(task.id, 'user_edited_priority', parseInt(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Deadline</label>
                            <Input
                              type="datetime-local"
                              value={taskEdits[task.id]?.user_edited_deadline ? new Date(taskEdits[task.id].user_edited_deadline).toISOString().slice(0, 16) : ''}
                              onChange={(e) => handleUpdateTaskEdit(task.id, 'user_edited_deadline', e.target.value ? new Date(e.target.value).toISOString() : null)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleApproveTask(task.id)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Save & Approve
                          </Button>
                          <Button variant="outline" onClick={() => setEditingTask(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold">{task.user_edited_title || task.title}</h3>
                            {(task.user_edited_description || task.description) && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {task.user_edited_description || task.description}
                              </p>
                            )}
                          </div>
                          <Badge variant={task.ai_priority <= 2 ? 'destructive' : task.ai_priority <= 3 ? 'default' : 'secondary'}>
                            P{task.user_edited_priority || task.ai_priority}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {task.estimated_duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {task.estimated_duration_minutes} min
                            </span>
                          )}
                          {(task.user_edited_deadline || task.ai_suggested_deadline) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(task.user_edited_deadline || task.ai_suggested_deadline!), 'MMM d, h:mm a')}
                            </span>
                          )}
                          {task.ai_category && (
                            <Badge variant="outline" className="text-xs">
                              {task.ai_category}
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button size="sm" onClick={() => approveTask(task.id)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleEditTask(task)}>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => rejectTask(task.id)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Emails Tab */}
        <TabsContent value="emails" className="space-y-4">
          {pendingEmails.length === 0 ? (
            <Alert>
              <Inbox className="h-4 w-4" />
              <AlertDescription>
                No pending emails to review.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {pendingEmails.map((email) => (
                <Card key={email.id} className="cursor-pointer hover:bg-accent/50" onClick={() => setSelectedEmail(email)}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{email.from_name || email.from_email}</span>
                          {email.ai_category && (
                            <Badge variant="outline" className="text-xs">{email.ai_category}</Badge>
                          )}
                        </div>
                        <h4 className="font-medium">{email.subject}</h4>
                        {email.ai_summary && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {email.ai_summary}
                          </p>
                        )}
                      </div>
                      {email.ai_priority && (
                        <Badge variant={email.ai_priority <= 2 ? 'destructive' : 'secondary'}>
                          P{email.ai_priority}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(email.received_at))} ago</span>
                      {email.ai_extracted_tasks && email.ai_extracted_tasks.length > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {email.ai_extracted_tasks.length} tasks extracted
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          {senderPatterns.length === 0 ? (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                No sender patterns learned yet. Patterns will be created as you process emails.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {senderPatterns.map((pattern) => (
                <Card key={pattern.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{pattern.sender_email}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                          <span>{pattern.total_emails_received} emails received</span>
                          <span>{pattern.actionable_count} actionable</span>
                          <span>{pattern.ignored_count} ignored</span>
                          {pattern.spam_count > 0 && <span>{pattern.spam_count} spam</span>}
                        </div>
                        {pattern.auto_category && (
                          <div className="mt-2">
                            <Badge variant="outline">Auto: {pattern.auto_category}</Badge>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {pattern.auto_ignore && (
                          <Badge variant="destructive">Auto-Ignore</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateSenderPattern(pattern.sender_email, {
                            auto_ignore: !pattern.auto_ignore
                          })}
                        >
                          {pattern.auto_ignore ? 'Stop Ignoring' : 'Auto-Ignore'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Email Detail Dialog */}
      {selectedEmail && (
        <EmailDetailDialog
          email={selectedEmail}
          onClose={() => setSelectedEmail(null)}
          onIgnore={(reason) => {
            ignoreEmail(selectedEmail.id, reason);
            setSelectedEmail(null);
          }}
          onMarkReviewed={() => {
            markEmailReviewed(selectedEmail.id);
            setSelectedEmail(null);
          }}
        />
      )}
    </div>
  );
}
