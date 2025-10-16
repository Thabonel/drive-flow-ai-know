import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sequence_number: number;
  timestamp: string;
}

interface ConversationChatProps {
  conversationId?: string;
  onConversationCreated?: (id: string) => void;
}

export function ConversationChat({ conversationId: initialConversationId, onConversationCreated }: ConversationChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load conversation');
      return;
    }

    setMessages((data || []) as Message[]);
  };

  const createConversation = async () => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: user.id,
        title: 'New Conversation',
        status: 'active',
        message_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
      return null;
    }

    setConversationId(data.id);
    onConversationCreated?.(data.id);
    return data.id;
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    const currentConvId = conversationId || await createConversation();
    if (!currentConvId) return null;

    const sequenceNumber = messages.length;

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: currentConvId,
        role,
        content,
        sequence_number: sequenceNumber,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Save user message
      const savedUserMsg = await saveMessage('user', userMessage);
      if (savedUserMsg) {
        setMessages(prev => [...prev, savedUserMsg as Message]);
      }

      // Get AI response with conversation context
      const conversationContext = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query: userMessage,
          conversationContext,
        },
      });

      if (error) throw error;

      const aiResponse = data?.response || 'Sorry, I could not process your request.';

      // Save AI response
      const savedAiMsg = await saveMessage('assistant', aiResponse);
      if (savedAiMsg) {
        setMessages(prev => [...prev, savedAiMsg as Message]);
      }

      // Update conversation message count and title if first message
      if (messages.length === 0 && conversationId) {
        await supabase
          .from('conversations')
          .update({
            title: userMessage.slice(0, 100),
            message_count: 2,
          })
          .eq('id', conversationId);
      } else if (conversationId) {
        await supabase
          .from('conversations')
          .update({
            message_count: messages.length + 2,
          })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!conversationId || messages.length === 0) {
      toast.error('No conversation to summarize');
      return;
    }

    setIsSummarizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('summarize-conversation', {
        body: { conversationId },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Conversation saved and summarized!');
        navigate('/conversations');
      } else {
        throw new Error(data?.error || 'Summarization failed');
      }
    } catch (error) {
      console.error('Error summarizing:', error);
      toast.error('Failed to summarize conversation');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleDelete = async () => {
    if (!conversationId) return;

    if (!confirm('Are you sure you want to delete this conversation?')) return;

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to delete conversation');
      return;
    }

    toast.success('Conversation deleted');
    navigate('/conversations');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">AI Assistant</h2>
        <div className="flex gap-2">
          {conversationId && messages.length > 0 && (
            <>
              <Button
                onClick={handleSummarize}
                disabled={isSummarizing}
                size="sm"
                variant="outline"
              >
                {isSummarizing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Summarizing...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Save & Summarize
                  </>
                )}
              </Button>
              <Button
                onClick={handleDelete}
                size="sm"
                variant="outline"
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Start a conversation with your AI assistant</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="resize-none"
              rows={3}
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
