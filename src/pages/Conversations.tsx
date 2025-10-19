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
import { Plus, MessageSquare, Archive, Search, Trash2 } from 'lucide-react';
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
  const [isCreating, setIsCreating] = useState(false);

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

  return (
    <div className="container mx-auto p-6 h-[calc(100vh-4rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full pb-24">
        {/* Sidebar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Conversations</CardTitle>
              <Button size="sm" onClick={handleNewConversation}>
                <Plus className="h-4 w-4 mr-2" />
                New
              </Button>
            </div>
            <CardDescription>Your AI conversation history</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'active' | 'archived')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Active
                </TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="h-4 w-4 mr-2" />
                  Archived
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                <ScrollArea className="h-[calc(100vh-20rem)]">
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
          </CardContent>
        </Card>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedConversation || isCreating ? (
            <ConversationChat
              conversationId={selectedConversation || undefined}
              onConversationCreated={handleConversationCreated}
              onConversationDeleted={handleConversationDeleted}
            />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center space-y-4">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold mb-2">No Conversation Selected</h3>
                  <p className="text-muted-foreground mb-4">
                    Select a conversation from the list or start a new one
                  </p>
                  <Button onClick={handleNewConversation}>
                    <Plus className="h-4 w-4 mr-2" />
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
