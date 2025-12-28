import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Archive, Trash2, Edit2, Check, X, FileText, MessageCircle, Calendar, Printer, Download, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DictationButton } from '@/components/DictationButton';
import { AIProgressIndicator } from '@/components/ai/AIProgressIndicator';
import { ExtractToTimelineDialog } from '@/components/ai/ExtractToTimelineDialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sequence_number: number;
  timestamp: string;
}

interface ConversationChatProps {
  conversationId?: string;
  isTemporary?: boolean;
  onConversationCreated?: (id: string) => void;
  onConversationDeleted?: () => void;
  onConversationSummarized?: () => void;
  onDocumentAccessChange?: (useDocuments: boolean) => void;
}

export function ConversationChat({ conversationId: initialConversationId, isTemporary = false, onConversationCreated, onConversationDeleted, onConversationSummarized, onDocumentAccessChange }: ConversationChatProps) {
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
  const [useDocuments, setUseDocuments] = useState(true); // Toggle for document access
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);
  const [timelineContent, setTimelineContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    // Don't load messages if we're actively submitting (prevents race condition)
    if (conversationId && !isSubmittingRef.current) {
      loadMessages();
    }
  }, [conversationId]);

  // React to prop changes when user selects a different conversation or starts a new one
  useEffect(() => {
    // Handle switching to a new conversation (initialConversationId becomes undefined)
    if (initialConversationId === undefined && conversationId !== null) {
      console.log('Starting new conversation - resetting state');
      setConversationId(null);
      setMessages([]);
      setInput('');
      setConversationTitle('AI Assistant');
      setIsEditingTitle(false);
      setEditedTitle('');
      return;
    }

    // Handle switching to an existing conversation
    if (initialConversationId && initialConversationId !== conversationId) {
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

  // Notify parent of document access changes
  useEffect(() => {
    onDocumentAccessChange?.(useDocuments);
  }, [useDocuments, onDocumentAccessChange]);

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

  // Auto-save long content as a document and return the doc ID
  const autoSaveAsDocument = async (content: string): Promise<string | null> => {
    if (!user) {
      console.error('Auto-save failed: No user logged in');
      return null;
    }

    console.log(`Auto-save: Starting save of ${content.length} characters for user ${user.id}`);

    try {
      // Generate a title from the first line or first 50 chars
      const firstLine = content.split('\n')[0].trim();
      const title = firstLine.length > 50
        ? firstLine.substring(0, 50) + '...'
        : firstLine || 'Auto-saved content';

      console.log(`Auto-save: Generated title "${title}"`);

      const { data, error } = await supabase
        .from('knowledge_documents')
        .insert({
          user_id: user.id,
          title: `[Auto] ${title}`,
          content: content,
          file_type: 'text',
          category: 'general',
          google_file_id: `auto-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Auto-save: Database error:', error.message, error.details, error.hint);
        toast.error(`Failed to save content: ${error.message}`);
        return null;
      }

      console.log('Auto-save: SUCCESS - Document ID:', data.id);
      toast.success('Long content saved as document for analysis');
      return data.id;
    } catch (err) {
      console.error('Auto-save: Exception:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    // Store original message for display before any modifications
    const originalMessage = input.trim();
    let userMessage = originalMessage;
    let autoSavedDocId: string | null = null;
    let forceUseDocuments = useDocuments;

    // CRITICAL: Clear input IMMEDIATELY for instant UI feedback
    setInput('');

    // If message is very long (>10KB), auto-save as document and reference it
    const LONG_MESSAGE_THRESHOLD = 10000;
    if (userMessage.length > LONG_MESSAGE_THRESHOLD) {
      console.log(`Long message detected (${userMessage.length} chars), auto-saving as document...`);

      // Show loading state while saving document
      setIsLoading(true);

      autoSavedDocId = await autoSaveAsDocument(userMessage);

      if (autoSavedDocId) {
        console.log('Document saved successfully:', autoSavedDocId);
        // Replace the long content with a reference to analyze it
        userMessage = `Please analyze the document I just shared. It contains ${Math.round(originalMessage.length / 1000)}KB of content. Provide a comprehensive summary of the key points, main themes, and any actionable insights.`;
        // Force documents to be enabled for this query
        forceUseDocuments = true;
        if (!useDocuments) {
          setUseDocuments(true);
        }
      } else {
        // Auto-save failed - show error and stop
        console.error('Failed to auto-save document');
        setIsLoading(false);
        toast.error('Could not save your content. Please try copying it to a new document manually.');
        // Restore the input so user doesn't lose their content
        setInput(originalMessage);
        return;
      }
    }

    // Create temporary message for optimistic UI update
    // Show truncated preview for very long messages
    const displayContent = originalMessage.length > 500
      ? originalMessage.substring(0, 500) + `\n\n[... ${Math.round(originalMessage.length / 1000)}KB of content ...]`
      : originalMessage;

    const tempUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'user',
      content: displayContent,
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
      let currentConvId = conversationId;
      let messagesWithSavedUser = updatedMessages;

      if (!isTemporary) {
        // CRITICAL: Ensure conversation exists and get ID ONCE
        // Store in local variable to ensure both messages use the SAME conversation
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

        // Save user message to database - use displayContent for long messages (full content saved as doc)
        const savedUserMsg = await saveMessage('user', displayContent, updatedMessages, currentConvId);

        // Prepare messages array with the saved message
        // FIX: Build from updatedMessages, not stale messages closure
        messagesWithSavedUser = savedUserMsg
          ? updatedMessages.slice(0, -1).concat(savedUserMsg as Message)
          : updatedMessages;

        // Replace temp message with saved one (if successful)
        if (savedUserMsg) {
          setMessages(messagesWithSavedUser);
        }
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
          use_documents: forceUseDocuments,
        },
      });

      // Handle errors with specific user-friendly messages
      if (error) {
        console.error('AI query error:', error);

        // Check for specific error types
        const errorMessage = error.message || '';
        const errorName = error.name || '';

        // Check for 413 Payload Too Large - can come from Supabase gateway or edge function
        // The error object may have a context with status, or error message might indicate payload issues
        const is413Error =
          errorMessage.includes('413') ||
          errorMessage.includes('too large') ||
          errorMessage.includes('Payload Too Large') ||
          errorMessage.includes('Request Entity Too Large') ||
          data?.error === 'Query too long' ||
          data?.error === 'Context too large' ||
          (error as any)?.status === 413 ||
          (error as any)?.context?.status === 413;

        const is429Error =
          errorMessage.includes('429') ||
          errorMessage.includes('rate limit') ||
          data?.error === 'Rate limit exceeded' ||
          data?.error === 'Provider rate limit' ||
          (error as any)?.status === 429;

        const is503Error =
          errorMessage.includes('503') ||
          errorMessage.includes('unavailable') ||
          data?.error === 'Authentication error' ||
          (error as any)?.status === 503;

        if (is413Error) {
          toast.error('Message too large. Try saving long content as a document first, then ask questions about it.');
          return;
        } else if (is429Error) {
          toast.error(data?.response || 'Rate limit exceeded. Please wait a moment before trying again.');
          return;
        } else if (is503Error) {
          toast.error(data?.response || 'The AI service is temporarily unavailable. Please try again later.');
          return;
        }

        // Generic error
        toast.error(data?.response || 'Failed to get response. Please try again.');
        return;
      }

      const aiResponse = data?.response || 'Sorry, I could not process your request.';

      if (isTemporary) {
        // For temporary chats, just add the AI message to local state
        const tempAiMessage: Message = {
          id: `temp-ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          sequence_number: messagesWithSavedUser.length,
          timestamp: new Date().toISOString(),
        };
        setMessages([...messagesWithSavedUser, tempAiMessage]);
      } else {
        // Save AI response - pass same conversation ID to ensure both messages in same conversation
        const savedAiMsg = await saveMessage('assistant', aiResponse, messagesWithSavedUser, currentConvId);
        if (savedAiMsg) {
          setMessages([...messagesWithSavedUser, savedAiMsg as Message]);
        }
      }

      // Update conversation message count and title if first message
      if (!isTemporary && messages.length === 0 && currentConvId) {
        // Generate AI title immediately
        try {
          const { data: titleData } = await supabase.functions.invoke('ai-query', {
            body: {
              query: `Generate a short, descriptive title (maximum 6 words) for a conversation that starts with: "${userMessage.slice(0, 200)}". Respond with ONLY the title, no quotes or extra text.`,
              use_documents: false,
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
    } catch (error: any) {
      console.error('Error:', error);

      // Provide more specific error messages
      const errorStr = String(error?.message || error);
      if (errorStr.includes('Failed to create conversation')) {
        toast.error('Unable to create conversation. Please try again.');
      } else if (errorStr.includes('network') || errorStr.includes('fetch')) {
        toast.error('Network error. Please check your connection and try again.');
      } else {
        toast.error('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
      // Always clear the submission flag, even on error
      isSubmittingRef.current = false;
    }
  };

  const handleSummarize = async () => {
    console.log('handleSummarize called - conversationId:', conversationId, 'messages:', messages.length);

    if (!conversationId || messages.length === 0) {
      console.error('Cannot summarize - conversationId:', conversationId, 'message count:', messages.length);
      toast.error(`No conversation to summarize${!conversationId ? ' (no conversation ID)' : ''}`);
      return;
    }

    setIsSummarizing(true);
    try {
      console.log('Invoking summarize-conversation with ID:', conversationId);
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

        // Notify parent to reload conversation list and switch to archived tab
        if (onConversationSummarized) {
          onConversationSummarized();
        } else {
          // Fallback to navigation if no callback provided
          navigate('/conversations');
        }
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

  const handleAddToTimeline = () => {
    // Get the last AI response
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage) {
      setTimelineContent(lastAssistantMessage.content);
      setShowTimelineDialog(true);
    }
  };

  const handlePrint = () => {
    if (messages.length === 0) {
      toast.error('No messages to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print conversations');
      return;
    }

    const formatDate = (timestamp: string) => {
      return new Date(timestamp).toLocaleString();
    };

    const messagesHtml = messages.map(msg => `
      <div class="message ${msg.role}">
        <div class="message-header">
          <strong>${msg.role === 'user' ? 'You' : 'AI Assistant'}</strong>
          <span class="timestamp">${formatDate(msg.timestamp)}</span>
        </div>
        <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
      </div>
    `).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${conversationTitle}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 20px;
              border-bottom: 2px solid #333;
              padding-bottom: 10px;
            }
            .message {
              margin-bottom: 20px;
              padding: 15px;
              border-radius: 8px;
            }
            .message.user {
              background-color: #f0f0f0;
            }
            .message.assistant {
              background-color: #e8f4f8;
            }
            .message-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .timestamp {
              color: #666;
              font-size: 12px;
            }
            .message-content {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            @media print {
              body { padding: 0; }
              .message.user { background-color: #f5f5f5; }
              .message.assistant { background-color: #f0f8ff; }
            }
          </style>
        </head>
        <body>
          <h1>${conversationTitle}</h1>
          <div class="messages">
            ${messagesHtml}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };

    toast.success('Print dialog opened');
  };

  const handleDownload = (format: 'txt' | 'md' | 'html' | 'pdf' = 'txt') => {
    if (messages.length === 0) {
      toast.error('No messages to download');
      return;
    }

    try {
      const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
      };

      const fileName = conversationTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      if (format === 'pdf') {
        handlePrint();
        toast.success('Use the print dialog to save as PDF');
        return;
      }

      let content = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      switch (format) {
        case 'txt':
          content = `${conversationTitle}\n${'='.repeat(conversationTitle.length)}\n\n`;
          messages.forEach((msg, index) => {
            content += `[${msg.role === 'user' ? 'You' : 'AI Assistant'}] - ${formatDate(msg.timestamp)}\n`;
            content += `${msg.content}\n\n`;
            if (index < messages.length - 1) {
              content += '---\n\n';
            }
          });
          mimeType = 'text/plain';
          extension = 'txt';
          break;

        case 'md':
          content = `# ${conversationTitle}\n\n`;
          messages.forEach((msg) => {
            const role = msg.role === 'user' ? '👤 You' : '🤖 AI Assistant';
            content += `### ${role}\n`;
            content += `*${formatDate(msg.timestamp)}*\n\n`;
            content += `${msg.content}\n\n`;
            content += `---\n\n`;
          });
          mimeType = 'text/markdown';
          extension = 'md';
          break;

        case 'html':
          const messagesHtml = messages.map(msg => `
            <div class="message ${msg.role}">
              <div class="message-header">
                <strong>${msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}</strong>
                <span class="timestamp">${formatDate(msg.timestamp)}</span>
              </div>
              <div class="message-content">${msg.content.replace(/\n/g, '<br>')}</div>
            </div>
          `).join('');

          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${conversationTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 {
      color: #0A2342;
      border-bottom: 3px solid #FFC300;
      padding-bottom: 10px;
    }
    .message {
      margin-bottom: 20px;
      padding: 15px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .message.user {
      border-left: 4px solid #4CAF50;
    }
    .message.assistant {
      border-left: 4px solid #2196F3;
    }
    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }
    .timestamp {
      color: #666;
      font-size: 12px;
    }
    .message-content {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  <h1>${conversationTitle}</h1>
  <div class="messages">
    ${messagesHtml}
  </div>
</body>
</html>`;
          mimeType = 'text/html';
          extension = 'html';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_conversation.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Conversation downloaded as ${extension.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to download conversation');
    }
  };

  // Extract input form to avoid duplication (used in both empty and active states)
  const renderInputForm = () => (
    <form onSubmit={handleSubmit} className="p-3 border-t flex-shrink-0 bg-background">
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="resize-none border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
          rows={2}
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="flex flex-col gap-2">
          <DictationButton
            onTranscription={(text) => setInput(prev => prev ? prev + ' ' + text : text)}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-3 mb-1 flex-shrink-0">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
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
            <h2 className="text-lg font-semibold">{conversationTitle}</h2>
            {conversationId && (
              <Button size="sm" variant="ghost" onClick={handleEditTitle}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          {/* Document Access Toggle */}
          <Button
            size="sm"
            variant={useDocuments ? "default" : "outline"}
            onClick={() => setUseDocuments(!useDocuments)}
            className="gap-2"
            title={useDocuments ? "Documents: ON - AI can access your documents" : "Documents: OFF - General AI chat"}
          >
            <FileText className="h-4 w-4" />
            {useDocuments ? "Docs: ON" : "Docs: OFF"}
          </Button>
          {isTemporary && messages.length > 0 && (
            <div className="text-sm text-muted-foreground bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1.5 rounded-md border border-yellow-200 dark:border-yellow-800">
              Temporary Chat (not saved)
            </div>
          )}
          {messages.length > 0 && (
            <>
              <Button
                onClick={handlePrint}
                size="sm"
                variant="outline"
                title="Print conversation"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    title="Download conversation"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDownload('txt')}>
                    Plain Text (.txt)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('md')}>
                    Markdown (.md)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('html')}>
                    HTML (.html)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                    PDF (via Print)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {messages.length > 0 && messages.some(m => m.role === 'assistant') && (
            <Button
              onClick={handleAddToTimeline}
              size="sm"
              variant="outline"
            >
              <Calendar className="mr-2 h-4 w-4" />
              Add to Timeline
            </Button>
          )}
          {!isTemporary && conversationId && messages.length > 0 && (
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

      {messages.length === 0 ? (
        // Empty state - input in Card (normal flow)
        <Card className="flex flex-col overflow-hidden h-auto">
          <ScrollArea className="p-2 h-20" ref={scrollRef}>
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <p>Start a conversation</p>
            </div>
          </ScrollArea>
          {renderInputForm()}
        </Card>
      ) : (
        // Active conversation - sticky input
        <>
          <Card className="flex-1 flex flex-col overflow-hidden mb-0">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4 pb-6">
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
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <AIProgressIndicator useDocuments={false} />
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Sticky input at bottom */}
          <div className="flex-shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
            {renderInputForm()}
          </div>
        </>
      )}

      {/* Extract to Timeline Dialog */}
      <ExtractToTimelineDialog
        open={showTimelineDialog}
        onClose={() => setShowTimelineDialog(false)}
        content={timelineContent}
        sourceType="ai-response"
      />
    </div>
  );
}
