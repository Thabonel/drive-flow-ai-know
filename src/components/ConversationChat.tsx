import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Archive, Trash2, Edit2, Check, X } from 'lucide-react';
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
  onConversationDeleted?: () => void;
}

export function ConversationChat({ conversationId: initialConversationId, onConversationCreated, onConversationDeleted }: ConversationChatProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [conversationTitle, setConversationTitle] = useState('AI Assistant');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    // Don't load messages if we're actively submitting (prevents race condition)
    if (conversationId && !isSubmittingRef.current) {
      loadMessages();
    }
  }, [conversationId]);

  // React to prop changes when user selects a different conversation
  useEffect(() => {
    // Only update if the prop is defined and different from current state
    // Don't reset when initialConversationId becomes defined from undefined (new conversation creation)
    if (initialConversationId && initialConversationId !== conversationId && conversationId !== null) {
      console.log('Switching conversation from', conversationId, 'to', initialConversationId);
      // Reset state for the new conversation
      setConversationId(initialConversationId);
      setMessages([]);
      setInput('');
      setConversationTitle('AI Assistant');
      setIsEditingTitle(false);
      setEditedTitle('');

      // Load messages if conversation ID exists
      // loadMessages will be triggered by the conversationId useEffect above
    }
  }, [initialConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async () => {
    if (!conversationId) return;

    console.log('Loading messages for conversation:', conversationId);

    // Load conversation details to get the title
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('title')
      .eq('id', conversationId)
      .single();

    if (!convError && conversation) {
      setConversationTitle(conversation.title || 'AI Assistant');
    }

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

    console.log('Loaded messages:', data?.length, data);

    // Defensive: only update if DB has equal/more messages than local state
    // This prevents overwriting newer local messages during submission race conditions
    setMessages(currentMessages => {
      if (!data) return currentMessages;

      // If we're submitting and have more messages locally, keep local state
      if (isSubmittingRef.current && currentMessages.length > data.length) {
        console.log('Skipping loadMessages overwrite - submission in progress with newer local state');
        return currentMessages;
      }

      return data as Message[];
    });
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

  const saveMessage = async (role: 'user' | 'assistant', content: string, currentMessages: Message[] = messages, explicitConvId?: string) => {
    // Use explicit conversation ID if provided, otherwise fall back to state or create new
    const currentConvId = explicitConvId || conversationId || await createConversation();
    if (!currentConvId) return null;

    // Use the current messages array length for accurate sequence numbering
    const sequenceNumber = currentMessages.length;

    console.log(`Saving ${role} message with sequence ${sequenceNumber}:`, content.substring(0, 50));

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

    console.log('Message saved successfully:', data.id, 'sequence:', data.sequence_number);
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();

    // CRITICAL: Clear input IMMEDIATELY before any async operations
    // This makes the UI feel instant, just like Claude
    setInput('');

    // Create temporary message for optimistic UI update
    const tempUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      sequence_number: messages.length,
      timestamp: new Date().toISOString(),
    };

    // Show user message immediately in the UI
    const updatedMessages = [...messages, tempUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // Guard against loadMessages race condition
    isSubmittingRef.current = true;

    try {
      // CRITICAL: Ensure conversation exists and get ID ONCE
      // Store in local variable to ensure both messages use the SAME conversation
      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = await createConversation();
        if (!currentConvId) {
          toast.error('Failed to create conversation');
          return;
        }
        console.log('Created new conversation:', currentConvId);
      } else {
        console.log('Using existing conversation:', currentConvId);
      }

      // Save user message to database - pass explicit conversation ID
      const savedUserMsg = await saveMessage('user', userMessage, updatedMessages, currentConvId);

      // Prepare messages array with the saved message
      // FIX: Build from updatedMessages, not stale messages closure
      const messagesWithSavedUser = savedUserMsg
        ? updatedMessages.slice(0, -1).concat(savedUserMsg as Message)
        : updatedMessages;

      // Replace temp message with saved one (if successful)
      if (savedUserMsg) {
        setMessages(messagesWithSavedUser);
      }

      // Get AI response with conversation context - include the current user message
      const conversationContext = messagesWithSavedUser.map(msg => ({
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

      // Save AI response - pass same conversation ID to ensure both messages in same conversation
      const savedAiMsg = await saveMessage('assistant', aiResponse, messagesWithSavedUser, currentConvId);
      if (savedAiMsg) {
        setMessages([...messagesWithSavedUser, savedAiMsg as Message]);
      }

      // Update conversation message count and title if first message
      if (messages.length === 0 && currentConvId) {
        // Generate AI title immediately
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-query', {
            body: {
              query: `Generate a short, descriptive title (maximum 6 words) for a conversation that starts with: "${userMessage.slice(0, 200)}". Respond with ONLY the title, no quotes or extra text.`,
            },
          });

          let finalTitle = 'New Conversation';

          if (titleData?.response) {
            // Clean up the AI response - remove quotes and extra text
            finalTitle = titleData.response
              .trim()
              .replace(/^["']|["']$/g, '') // Remove surrounding quotes
              .split('\n')[0] // Take first line only
              .slice(0, 60); // Max 60 chars
          }

          // If AI title is too short or looks wrong, use fallback
          if (finalTitle.length < 3 || finalTitle.toLowerCase() === 'new conversation') {
            finalTitle = userMessage.slice(0, 50) + (userMessage.length > 50 ? '…' : '');
          }

          await supabase
            .from('conversations')
            .update({
              title: finalTitle,
              message_count: 2,
            })
            .eq('id', currentConvId);

          setConversationTitle(finalTitle);
        } catch (error) {
          // If AI title generation fails, use first message as fallback
          const fallbackTitle = userMessage.slice(0, 50) + (userMessage.length > 50 ? '…' : '');

          await supabase
            .from('conversations')
            .update({
              title: fallbackTitle,
              message_count: 2,
            })
            .eq('id', currentConvId);

          setConversationTitle(fallbackTitle);
        }
      } else if (currentConvId) {
        await supabase
          .from('conversations')
          .update({
            message_count: messages.length + 2,
          })
          .eq('id', currentConvId);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to get response');
    } finally {
      setIsLoading(false);
      // Always clear the submission flag, even on error
      isSubmittingRef.current = false;
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

      if (error) {
        console.error('Supabase function error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));

        // Show detailed error message
        const errorMsg = error.message || 'Edge Function returned an error';
        toast.error(`Summarization failed: ${errorMsg}`);
        throw error;
      }

      console.log('Summarize response:', data);

      if (data?.success) {
        toast.success('Conversation saved and summarized!');
        navigate('/conversations');
      } else {
        const errorMessage = data?.error || 'Summarization failed';
        console.error('Summarization failed:', data);
        console.error('Error details from function:', data?.details);

        // Show the actual error from the Edge Function
        toast.error(`Failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error summarizing:', error);

      // Only show toast if we haven't already shown one above
      if (error instanceof Error && !error.message.includes('Edge Function')) {
        const errorMessage = error.message || 'Failed to summarize conversation';
        toast.error(errorMessage);
      }
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

    // Notify parent component to handle cleanup
    if (onConversationDeleted) {
      onConversationDeleted();
    } else {
      // Fallback to navigation if no callback provided
      navigate('/conversations');
    }
  };

  const handleEditTitle = () => {
    setEditedTitle(conversationTitle);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!conversationId || !editedTitle.trim()) {
      setIsEditingTitle(false);
      return;
    }

    const { error } = await supabase
      .from('conversations')
      .update({ title: editedTitle.trim() })
      .eq('id', conversationId);

    if (error) {
      toast.error('Failed to update title');
      return;
    }

    setConversationTitle(editedTitle.trim());
    setIsEditingTitle(false);
    toast.success('Title updated');
  };

  const handleCancelEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle('');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 flex-1 mr-4">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="max-w-md"
              placeholder="Conversation title..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">{conversationTitle}</h2>
            {conversationId && (
              <Button size="sm" variant="ghost" onClick={handleEditTitle}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
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

      <Card className="flex-1 flex flex-col overflow-hidden">
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

        <form onSubmit={handleSubmit} className="p-4 border-t flex-shrink-0">
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
