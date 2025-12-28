import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConversationChat } from '@/components/ConversationChat';
import { PageHelp } from '@/components/PageHelp';
import { MessageSquare, Archive, Search, Trash2, PanelLeftClose, PanelLeftOpen, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  status: string;
  message_count: number;
  created_at: string;
  updated_at: string;
  executive_summary?: string;
  summary_generated_at?: string;
  tags?: string[];
}

export default function Conversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [isCreating, setIsCreating] = useState(true);
  const [useDocuments, setUseDocuments] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('conversations-sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user, activeTab]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', activeTab)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
      return;
    }

    setConversations(data || []);
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.title?.toLowerCase().includes(query) ||
      conv.executive_summary?.toLowerCase().includes(query) ||
      conv.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  });

  const handleNewConversation = () => {
    setSelectedConversation(null);
    setIsCreating(true);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setIsCreating(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this conversation?')) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete conversation');
      return;
    }

    toast.success('Conversation deleted');
    if (selectedConversation === id) {
      setSelectedConversation(null);
      setIsCreating(false);
    }
    loadConversations();
  };

  const handleConversationCreated = (id: string) => {
    setSelectedConversation(id);
    setIsCreating(false);
    loadConversations();
  };

  const handleConversationDeleted = () => {
    // Reset state to show "no conversation selected" screen
    setSelectedConversation(null);
    setIsCreating(false);
    // Reload the conversation list to remove deleted item
    loadConversations();
  };

  const handleConversationSummarized = () => {
    // Switch to archived tab to show the summarized conversation
    setActiveTab('archived');
    // Reset selection to show empty state
    setSelectedConversation(null);
    setIsCreating(false);
    // Reload the conversation list
    loadConversations();
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('conversations-sidebar-collapsed', String(newState));
  };

  return (
    <div className="w-full h-[calc(100vh-48px)] overflow-hidden">
      <div className={`grid grid-cols-1 gap-2 h-full ${sidebarCollapsed ? 'lg:grid-cols-[80px_1fr]' : 'lg:grid-cols-3'}`}>
        {/* Sidebar */}
        <Card className={`h-full flex flex-col overflow-hidden transition-all duration-200 ${sidebarCollapsed ? 'lg:w-20' : 'lg:col-span-1'}`}>
          <CardHeader className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="flex items-center gap-2">
                {!sidebarCollapsed && <CardTitle>Conversations</CardTitle>}
                {!sidebarCollapsed && (
                  <PageHelp
                    title="AI Assistant Help"
                    description="The AI Assistant allows you to have multi-turn conversations with AI. All conversations are automatically saved to your history."
                    tips={[
                      "All conversations are automatically saved and appear in your history",
                      "Use the document toggle to control whether AI has access to your documents",
                      "Use 'Add to Timeline' to extract tasks from AI responses",
                      "Choose to schedule items immediately or save as unscheduled tasks",
                      "Delete unwanted conversations anytime using the trash icon",
                      "Archive completed conversations to keep your active list organized",
                      "Search through conversations using keywords or tags"
                    ]}
                  />
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleSidebar}
                  className="h-8 w-8 p-0 flex-shrink-0"
                  title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                  {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </div>
              {!sidebarCollapsed && (
                <Button
                  size="sm"
                  onClick={handleNewConversation}
                  title="Create new conversation"
                >
                  New Chat
                </Button>
              )}
            </div>
            {!sidebarCollapsed && <CardDescription>Your AI conversation history</CardDescription>}
          </CardHeader>
          <CardContent className={`space-y-4 flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {!sidebarCollapsed && (
              <>
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
                <TabsTrigger value="active">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="h-4 w-4 mr-2" />
                  Archived
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4 flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="space-y-2">
                    {filteredConversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No {activeTab} conversations
                      </p>
                    ) : (
                      filteredConversations.map((conv) => (
                        <Card
                          key={conv.id}
                          className={`cursor-pointer hover:bg-accent transition-colors ${
                            selectedConversation === conv.id ? 'border-primary' : ''
                          }`}
                          onClick={() => handleSelectConversation(conv.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold line-clamp-1">{conv.title || 'Untitled'}</h3>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => handleDeleteConversation(conv.id, e)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">
                              {conv.message_count} messages • {format(new Date(conv.updated_at), 'MMM d, yyyy')}
                            </p>
                            {conv.tags && conv.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {conv.tags.map((tag, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {conv.executive_summary && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {conv.executive_summary.split('\n')[0]}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
              </>
            )}
          </CardContent>
        </Card>

        {/* Chat Area */}
        <div className={`h-full overflow-hidden ${sidebarCollapsed ? 'lg:col-span-1' : 'lg:col-span-2'} flex flex-col`}>
          {selectedConversation || isCreating ? (
            <ConversationChat
              conversationId={selectedConversation || undefined}
              isTemporary={false}
              onConversationCreated={handleConversationCreated}
              onConversationDeleted={handleConversationDeleted}
              onConversationSummarized={handleConversationSummarized}
              onDocumentAccessChange={setUseDocuments}
            />
          ) : (
            <Card className="h-full flex items-center justify-center overflow-hidden">
              <CardContent className="text-center space-y-4">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Conversation Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a conversation from the list or start a new one
                  </p>
                  <Button onClick={handleNewConversation}>
                    Start New Conversation
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
