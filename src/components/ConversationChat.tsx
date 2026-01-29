import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send, Archive, Trash2, Edit2, Check, X, FileText, Calendar, Printer, Download, ChevronDown, ImageIcon } from 'lucide-react';
import { arrayBufferToBase64 } from '@/lib/base64Utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { DictationButton } from '@/components/DictationButton';
import { AIProgressIndicator } from '@/components/ai/AIProgressIndicator';
import { ExtractToTimelineDialog } from '@/components/ai/ExtractToTimelineDialog';
import { SubAgentResult, SubAgentResultsList } from '@/components/ai/SubAgentResultCard';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ClarifyingOption {
  id: string;
  label: string;
  description?: string;
}

interface ClarifyingQuestion {
  question: string;
  options: ClarifyingOption[];
  multiSelect: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sequence_number: number;
  timestamp: string;
  // Image data for generated graphics
  imageData?: string;
  // Agent mode fields
  agent_mode_available?: boolean;
  agent_metadata?: {
    sub_agent_ids?: string[];
    task_ids?: string[];
    agent_session_id?: string;
    agent_executed?: boolean;
    auto_execute_type?: string;
    execution_timestamp?: string;
  };
  // Interactive options for clarifying questions
  clarifying_options?: ClarifyingQuestion;
  options_answered?: boolean; // Track if user already answered
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
  const [conversationTitle, setConversationTitle] = useState('AI Chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [useDocuments, setUseDocuments] = useState(true); // Toggle for document access
  const [showTimelineDialog, setShowTimelineDialog] = useState(false);
  const [timelineContent, setTimelineContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Image attachment state
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mimeType: string;
    fileName?: string;
  } | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Agent mode state
  const [subAgentResults, setSubAgentResults] = useState<Record<string, SubAgentResult[]>>({});
  const pollingIntervalsRef = useRef<Record<string, NodeJS.Timeout>>({});


  // Interactive options state - tracks selected options per message
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>({});

  // Track messages currently being auto-executed for UI state
  const [autoExecutingMessageIds, setAutoExecutingMessageIds] = useState<Set<string>>(new Set());

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
      setConversationTitle('AI Chat');
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
      setConversationTitle('AI Chat');
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
      setConversationTitle(conversation.title || 'AI Chat');
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sequence_number', { ascending: true })
      .order('created_at', { ascending: true }); // Tiebreaker for duplicate sequence numbers

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

      // Sort by sequence_number, then by created_at as tiebreaker
      // This ensures correct order even if sequence numbers are duplicated
      const sortedData = [...data].sort((a, b) => {
        if (a.sequence_number !== b.sequence_number) {
          return a.sequence_number - b.sequence_number;
        }
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      return sortedData as Message[];
    });

    // Fetch sub-agent results for messages that have them
    // This prevents "Processing..." from showing for completed agents
    if (data) {
      const messagesWithAgents = data.filter(
        msg => msg.agent_metadata?.sub_agent_ids && msg.agent_metadata.sub_agent_ids.length > 0
      );

      for (const message of messagesWithAgents) {
        const subAgentIds = message.agent_metadata.sub_agent_ids;
        const { data: agents } = await supabase
          .from('sub_agents')
          .select('*')
          .in('id', subAgentIds);

        if (agents) {
          setSubAgentResults(prev => ({
            ...prev,
            [message.id]: agents as SubAgentResult[],
          }));
        }
      }
    }
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

  // Stop AI generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toast.info('Generation stopped');
    }
  };

  // ============================================================================
  // AGENT MODE FUNCTIONS
  // ============================================================================

  // Get user's timezone offset in hours from UTC
  const getTimezoneOffset = useCallback(() => {
    return -(new Date().getTimezoneOffset() / 60);
  }, []);



  // Poll for sub-agent completion status
  const pollSubAgentStatus = useCallback(async (subAgentIds: string[], messageId: string) => {
    if (subAgentIds.length === 0) return;

    const { data: agents, error } = await supabase
      .from('sub_agents')
      .select('*')
      .in('id', subAgentIds);

    if (error) {
      console.error('Error polling sub-agents:', error);
      return;
    }

    // Update the results state
    setSubAgentResults(prev => ({
      ...prev,
      [messageId]: (agents || []) as SubAgentResult[],
    }));

    // Check if all agents are completed or failed
    const allDone = agents?.every(a => a.status === 'completed' || a.status === 'failed');

    if (allDone && pollingIntervalsRef.current[messageId]) {
      clearInterval(pollingIntervalsRef.current[messageId]);
      delete pollingIntervalsRef.current[messageId];

      const completed = agents?.filter(a => a.status === 'completed').length || 0;
      const failed = agents?.filter(a => a.status === 'failed').length || 0;

      // Check if any completed agents are calendar agents with event data
      const calendarAgent = agents?.find(
        (a) => a.status === 'completed' && a.agent_type === 'calendar' && a.result_data?.event_start
      );

      if (failed > 0) {
        toast.warning(`Tasks completed: ${completed} succeeded, ${failed} failed`);
      } else if (calendarAgent?.result_data?.event_start) {
        // Calendar task completed - show toast with View in Timeline action
        const eventDate = new Date(calendarAgent.result_data.event_start);
        const formattedDate = eventDate.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });
        // Store event date so Timeline page can auto-navigate to it
        localStorage.setItem('timeline-navigate-to-date', calendarAgent.result_data.event_start);
        toast.success(`Event scheduled for ${formattedDate}`, {
          action: {
            label: 'View in Timeline',
            onClick: () => navigate('/timeline'),
          },
          duration: 8000,
        });
      } else {
        toast.success(`All ${completed} task(s) completed!`);
      }
    }
  }, [navigate]);

  // Update message metadata in database
  const updateMessageAgentMetadata = async (messageId: string, metadata: Message['agent_metadata']) => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ agent_metadata: metadata })
        .eq('id', messageId);

      if (error) {
        console.error('Error updating message metadata:', error);
      }

      // Update local state
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, agent_metadata: metadata } : msg
      ));
    } catch (error) {
      console.error('Error updating message metadata:', error);
    }
  };


  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach(clearInterval);
    };
  }, []);


  // ============================================================================
  // INTERACTIVE OPTIONS HANDLERS
  // ============================================================================

  // Toggle an option selection for a specific message
  const toggleOptionSelection = (messageId: string, optionId: string, multiSelect: boolean) => {
    setSelectedOptions(prev => {
      const currentSelection = prev[messageId] || new Set<string>();
      const newSelection = new Set(currentSelection);

      if (multiSelect) {
        // Multi-select: toggle the option
        if (newSelection.has(optionId)) {
          newSelection.delete(optionId);
        } else {
          newSelection.add(optionId);
        }
      } else {
        // Single-select: replace selection
        newSelection.clear();
        newSelection.add(optionId);
      }

      return { ...prev, [messageId]: newSelection };
    });
  };

  // Send selected options as a user response
  const handleSendSelectedOptions = async (messageId: string, options: ClarifyingQuestion) => {
    const selected = selectedOptions[messageId];
    if (!selected || selected.size === 0) {
      toast.error('Please select at least one option');
      return;
    }

    // Build the response text from selected options
    const selectedLabels = options.options
      .filter(opt => selected.has(opt.id))
      .map(opt => opt.label);

    const responseText = selectedLabels.length === 1
      ? selectedLabels[0]
      : selectedLabels.join(', ');

    // Mark this message's options as answered
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, options_answered: true } : msg
    ));

    // Clear the selection state
    setSelectedOptions(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });

    // Submit as a new user message
    setInput(responseText);

    // Small delay to let state update, then trigger submit
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 50);
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
    if ((!input.trim() && !pendingImage) || isLoading) return;

    // Capture image data before clearing
    const imageData = pendingImage;

    // Store original message for display before any modifications
    const originalMessage = input.trim() || (imageData ? "What's in this image?" : '');
    let userMessage = originalMessage;
    let autoSavedDocId: string | null = null;
    let forceUseDocuments = useDocuments;

    // CRITICAL: Clear input and image IMMEDIATELY for instant UI feedback
    setInput('');
    setPendingImage(null);

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

      // Create AbortController for cancelling the request
      abortControllerRef.current = new AbortController();

      // Get auth session for the request
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      if (!authToken) {
        throw new Error('No authentication token available');
      }

      // Use fetch directly to support AbortController
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/ai-query`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            query: userMessage,
            conversationContext,
            use_documents: forceUseDocuments,
            image: imageData ? {
              base64: imageData.base64,
              media_type: imageData.mimeType,
            } : undefined,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      const data = response.ok ? await response.json() : null;
      const error = !response.ok ? new Error(await response.text()) : null;

      // Clear abort controller after request completes
      abortControllerRef.current = null;

      // Handle errors with specific user-friendly messages
      if (error) {
        console.error('AI query error:', error);

        // Check if request was aborted
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.log('Request was aborted by user');
          return; // Exit silently, user already got toast notification
        }

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
      const agentModeAvailable = data?.agent_mode_available || false;
      const autoExecuteTaskType = data?.auto_execute_task_type || null;
      const clarifyingOptions = data?.clarifying_options || null;
      const responseImageData = data?.imageData || null;

      let savedMessageId: string | null = null;

      if (isTemporary) {
        // For temporary chats, just add the AI message to local state
        const tempAiMessage: Message = {
          id: `temp-ai-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          sequence_number: messagesWithSavedUser.length,
          timestamp: new Date().toISOString(),
          agent_mode_available: agentModeAvailable,
          clarifying_options: clarifyingOptions,
          imageData: responseImageData,
        };
        savedMessageId = tempAiMessage.id;

        // If auto-executing, mark it BEFORE rendering the message (prevents button flash)
        if (autoExecuteTaskType) {
          setAutoExecutingMessageIds(prev => new Set(prev).add(tempAiMessage.id));
        }

        setMessages([...messagesWithSavedUser, tempAiMessage]);
      } else {
        // Save AI response - pass same conversation ID to ensure both messages in same conversation
        const savedAiMsg = await saveMessage('assistant', aiResponse, messagesWithSavedUser, currentConvId);
        if (savedAiMsg) {
          savedMessageId = savedAiMsg.id;
          // Add agent_mode_available and clarifying_options to the saved message for UI
          const messageWithExtras: Message = {
            ...(savedAiMsg as Message),
            agent_mode_available: agentModeAvailable,
            clarifying_options: clarifyingOptions,
            imageData: responseImageData,
          };

          // If auto-executing, mark it BEFORE rendering the message (prevents button flash)
          if (autoExecuteTaskType) {
            setAutoExecutingMessageIds(prev => new Set(prev).add(savedAiMsg.id));
          }

          setMessages([...messagesWithSavedUser, messageWithExtras]);
        }
      }

      // ==========================================================================
      // AUTO-EXECUTE TASKS: Calendar, Briefing, Analysis tasks run immediately
      // ==========================================================================
      if (autoExecuteTaskType && savedMessageId) {
        console.log(`Auto-executing ${autoExecuteTaskType} task...`);
        toast.info(`Executing ${autoExecuteTaskType} task...`);

        // Mark as executed immediately to prevent "Run as Task" button from showing
        const earlyMetadata: Message['agent_metadata'] = {
          agent_executed: true,
          auto_execute_type: autoExecuteTaskType,
        };
        await updateMessageAgentMetadata(savedMessageId, earlyMetadata);

        try {
          // Step 1: Extract and plan tasks via agent-translate
          const { data: translateData, error: translateError } = await supabase.functions.invoke('agent-translate', {
            body: {
              unstructured_input: originalMessage,
              timezone_offset: getTimezoneOffset(),
            },
          });

          if (translateError) {
            throw new Error(translateError.message || 'Failed to process task');
          }

          if (!translateData?.tasks || translateData.tasks.length === 0) {
            console.log('No actionable tasks found for auto-execution');
            // Don't show error - the AI response already explained what to do
            return;
          }

          if (!translateData?.session_id) {
            throw new Error('Failed to create task session');
          }

          // Step 2: Execute via agent-orchestrator (skip confirmation dialog)
          const { data: orchestratorData, error: orchestratorError } = await supabase.functions.invoke(
            'agent-orchestrator',
            { body: { session_id: translateData.session_id } }
          );

          if (orchestratorError) {
            throw new Error(orchestratorError.message || 'Failed to execute task');
          }

          if (orchestratorData?.error) {
            throw new Error(orchestratorData.error);
          }

          const subAgentIds = orchestratorData?.agents?.map((a: { id: string }) => a.id) || [];

          if (subAgentIds.length === 0) {
            throw new Error('No agents were spawned');
          }

          // Step 3: Update message metadata to link to sub-agents (merge with existing)
          const metadata: Message['agent_metadata'] = {
            sub_agent_ids: subAgentIds,
            task_ids: [],
            agent_executed: true,
            auto_execute_type: autoExecuteTaskType,
            agent_session_id: translateData.session_id,
            execution_timestamp: new Date().toISOString(),
          };

          await updateMessageAgentMetadata(savedMessageId, metadata);

          // Step 4: Start polling for sub-agent completion
          const pollInterval = setInterval(() => {
            pollSubAgentStatus(subAgentIds, savedMessageId!);
          }, 2000);

          pollingIntervalsRef.current[savedMessageId] = pollInterval;

          // Initial poll
          pollSubAgentStatus(subAgentIds, savedMessageId);

          toast.success(`${subAgentIds.length} task(s) started!`);
        } catch (autoExecError) {
          console.error('Auto-execution error:', autoExecError);
          toast.error(autoExecError instanceof Error ? autoExecError.message : 'Task execution failed');
          // Remove from auto-executing set so "Run as Task" button appears as fallback
          setAutoExecutingMessageIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(savedMessageId);
            return newSet;
          });
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
        try {
          return new Date(timestamp).toLocaleString();
        } catch {
          return 'Unknown date';
        }
      };

      // Use a safe default title if conversationTitle is empty
      const safeTitle = conversationTitle && conversationTitle.trim()
        ? conversationTitle.trim()
        : 'Conversation';

      const fileName = safeTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();

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
          content = `${safeTitle}\n${'='.repeat(safeTitle.length)}\n\n`;
          messages.forEach((msg, index) => {
            const messageContent = msg.content || '[Empty message]';
            content += `[${msg.role === 'user' ? 'You' : 'AI Assistant'}] - ${formatDate(msg.timestamp)}\n`;
            content += `${messageContent}\n\n`;
            if (index < messages.length - 1) {
              content += '---\n\n';
            }
          });
          mimeType = 'text/plain';
          extension = 'txt';
          break;

        case 'md':
          content = `# ${safeTitle}\n\n`;
          messages.forEach((msg) => {
            const role = msg.role === 'user' ? '👤 You' : '🤖 AI Assistant';
            const messageContent = msg.content || '[Empty message]';
            content += `### ${role}\n`;
            content += `*${formatDate(msg.timestamp)}*\n\n`;
            content += `${messageContent}\n\n`;
            content += `---\n\n`;
          });
          mimeType = 'text/markdown';
          extension = 'md';
          break;

        case 'html':
          const messagesHtml = messages.map(msg => {
            const messageContent = (msg.content || '[Empty message]')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;')
              .replace(/\n/g, '<br>');

            return `
            <div class="message ${msg.role}">
              <div class="message-header">
                <strong>${msg.role === 'user' ? '👤 You' : '🤖 AI Assistant'}</strong>
                <span class="timestamp">${formatDate(msg.timestamp)}</span>
              </div>
              <div class="message-content">${messageContent}</div>
            </div>
          `;
          }).join('');

          content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${safeTitle}</title>
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
  <h1>${safeTitle}</h1>
  <div class="messages">
    ${messagesHtml}
  </div>
</body>
</html>`;
          mimeType = 'text/html';
          extension = 'html';
          break;
      }

      // Validate content before creating blob
      if (!content || content.trim().length === 0) {
        toast.error('Cannot download empty conversation');
        return;
      }

      // Create and download the file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}_conversation.${extension}`;

      // Add to DOM, click, and immediate cleanup
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Conversation downloaded as ${extension.toUpperCase()}`);
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide browser-specific guidance
      if (errorMessage.includes('SecurityError')) {
        toast.error('Download blocked by browser security. Please check settings.');
      } else if (errorMessage.includes('NotAllowedError')) {
        toast.error('Download permission denied. Try allowing downloads in browser settings.');
      } else {
        toast.error(`Failed to download: ${errorMessage}`);
      }
    }
  };

  // Image handling utilities
  const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    return arrayBufferToBase64(new Uint8Array(arrayBuffer));
  };

  const isValidImageFile = (file: File): boolean => {
    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    return validTypes.includes(file.type) && file.size <= maxSize;
  };

  const handleImageFile = async (file: File) => {
    if (!isValidImageFile(file)) {
      toast.error('Invalid image. Supported: PNG, JPEG, GIF, WebP (max 5MB)');
      return;
    }
    setIsProcessingImage(true);
    try {
      const base64 = await fileToBase64(file);
      setPendingImage({ base64, mimeType: file.type, fileName: file.name });
      toast.success('Image ready to send');
    } catch (error) {
      console.error('Image processing error:', error);
      toast.error('Failed to process image');
    } finally {
      setIsProcessingImage(false);
    }
  };

  // Extract input form to avoid duplication (used in both empty and active states)
  const renderInputForm = () => (
    <form onSubmit={handleSubmit} className="p-2 border-t flex-shrink-0 bg-background">
      <div
        className={`relative ${pendingImage ? 'ring-2 ring-primary ring-offset-2 rounded-lg' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!pendingImage) {
            e.currentTarget.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
          }
        }}
        onDrop={async (e) => {
          e.preventDefault();
          e.currentTarget.classList.remove('ring-2', 'ring-primary', 'ring-offset-2', 'rounded-lg');
          const files = Array.from(e.dataTransfer.files);
          const imageFile = files.find(f => f.type.startsWith('image/'));
          if (imageFile) {
            await handleImageFile(imageFile);
          }
        }}
      >
        {/* Image preview indicator */}
        {pendingImage && (
          <div className="flex items-center gap-2 p-2 mb-2 bg-primary/10 rounded-lg">
            <ImageIcon className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary flex-1 truncate">
              {pendingImage.fileName || 'Pasted image'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setPendingImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={pendingImage ? "Describe what you want to know about this image..." : "Type your message..."}
            className="resize-none border-2 border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20"
            rows={2}
            disabled={isLoading || isProcessingImage}
            onPaste={async (e) => {
              const items = e.clipboardData?.items;
              if (!items) return;
              for (const item of Array.from(items)) {
                if (item.type.startsWith('image/')) {
                  e.preventDefault();
                  const file = item.getAsFile();
                  if (file) {
                    await handleImageFile(file);
                  }
                  break;
                }
              }
            }}
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
            {isLoading ? (
              <Button
                type="button"
                onClick={handleStopGeneration}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim() && !pendingImage}>
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );

  return (
    <TooltipProvider delayDuration={300}>
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-col gap-3 flex-shrink-0 max-h-[200px] overflow-y-auto">
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDelete}
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Delete conversation
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        // Empty state - input in Card (normal flow)
        <Card className="flex flex-col overflow-hidden h-auto">
          <div className="p-2 h-20 overflow-y-auto" ref={scrollRef}>
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              <p>Start a conversation</p>
            </div>
          </div>
          {renderInputForm()}
        </Card>
      ) : (
        // Active conversation - sticky input
        <div className="flex flex-col flex-1 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden mb-0">
            <div className="flex-1 min-h-0 p-4 overflow-y-auto" ref={scrollRef}>
              <div className="space-y-3">
                {messages.map((message, messageIndex) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
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

                      {/* Inline Image Display */}
                      {message.imageData && (
                        <div className="mt-4 mb-2">
                          <img
                            src={`data:image/png;base64,${message.imageData}`}
                            alt="AI generated image"
                            className="max-w-full rounded-lg shadow-neu-raised hover:shadow-neu-flat transition-shadow duration-200"
                            style={{ maxHeight: '400px', objectFit: 'contain' }}
                          />
                        </div>
                      )}

                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>

                    {/* Interactive Options: Clickable checkboxes for clarifying questions */}
                    {message.role === 'assistant' &&
                      message.clarifying_options &&
                      !message.options_answered && (
                        <div className="mt-3 max-w-[80%] p-3 rounded-lg border border-primary/20 bg-primary/5">
                          <p className="text-sm font-medium mb-2 text-primary">
                            Select your choice{message.clarifying_options.multiSelect ? 's' : ''}:
                          </p>
                          <div className="space-y-2">
                            {message.clarifying_options.options.map((option) => {
                              const isSelected = selectedOptions[message.id]?.has(option.id) || false;
                              return (
                                <div
                                  key={option.id}
                                  className={`flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-primary/10 border border-primary/30'
                                      : 'hover:bg-muted border border-transparent'
                                  }`}
                                  onClick={() => toggleOptionSelection(
                                    message.id,
                                    option.id,
                                    message.clarifying_options?.multiSelect || false
                                  )}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleOptionSelection(
                                      message.id,
                                      option.id,
                                      message.clarifying_options?.multiSelect || false
                                    )}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{option.label}</p>
                                    {option.description && (
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {option.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            disabled={!selectedOptions[message.id] || selectedOptions[message.id].size === 0}
                            onClick={() => handleSendSelectedOptions(message.id, message.clarifying_options!)}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Selection{(selectedOptions[message.id]?.size || 0) > 1 ? 's' : ''}
                          </Button>
                        </div>
                      )}


                    {/* Agent Mode: Sub-agent results */}
                    {message.agent_metadata?.agent_executed && subAgentResults[message.id] && (
                      <div className="mt-3 w-full max-w-[90%]">
                        <SubAgentResultsList
                          subAgents={subAgentResults[message.id]}
                          onRevisionComplete={(updatedAgent) => {
                            setSubAgentResults(prev => ({
                              ...prev,
                              [message.id]: prev[message.id].map(a =>
                                a.id === updatedAgent.id ? updatedAgent : a
                              ),
                            }));
                          }}
                        />
                      </div>
                    )}

                    {/* Agent Mode: Processing indicator */}
                    {message.agent_metadata?.agent_executed &&
                      message.agent_metadata.sub_agent_ids &&
                      message.agent_metadata.sub_agent_ids.length > 0 &&
                      (!subAgentResults[message.id] ||
                        subAgentResults[message.id].some(a => a.status === 'pending' || a.status === 'running')) && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing {message.agent_metadata.sub_agent_ids.length} task(s)...</span>
                        </div>
                      )}
                  </div>
                ))}
                {isLoading && (
                  <AIProgressIndicator useDocuments={false} />
                )}
              </div>
            </div>
          </Card>

          {/* Sticky input at bottom */}
          <div className="flex-shrink-0 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
            {renderInputForm()}
          </div>
        </div>
      )}

      {/* Extract to Timeline Dialog */}
      <ExtractToTimelineDialog
        open={showTimelineDialog}
        onClose={() => setShowTimelineDialog(false)}
        content={timelineContent}
        sourceType="ai-response"
      />

    </div>
    </TooltipProvider>
  );
}
