import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
const braveSearchApiKey = Deno.env.get('BRAVE_SEARCH_API_KEY');

// Web search function using Brave Search API
async function searchWeb(query: string): Promise<string> {
  if (!braveSearchApiKey) {
    return "Web search is not configured. Please add BRAVE_SEARCH_API_KEY to environment variables.";
  }

  try {
    // Detect time-sensitive queries that need fresh results
    const timeSensitiveKeywords = ['today', 'current', 'now', 'latest', 'recent', 'weather', 'price', 'news', 'stock'];
    const needsFreshness = timeSensitiveKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );

    // Build search URL with freshness parameter for time-sensitive queries
    let searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    if (needsFreshness) {
      searchUrl += '&freshness=pd'; // Past day for time-sensitive queries
      console.log('Time-sensitive query detected, adding freshness=pd filter');
    }

    const response = await fetch(searchUrl, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': braveSearchApiKey,
      },
    });

    if (!response.ok) {
      console.error('Brave Search API error:', response.status);
      return "Web search failed. Please try again.";
    }

    const data = await response.json();

    if (!data.web?.results || data.web.results.length === 0) {
      return "No search results found.";
    }

    // Format search results with metadata
    const results = data.web.results.slice(0, 5).map((result: any, index: number) => {
      // Extract domain from URL
      let domain = '';
      try {
        domain = new URL(result.url).hostname.replace('www.', '');
      } catch {
        domain = 'unknown';
      }

      // Build result with metadata
      let resultText = `${index + 1}. ${result.title}\n   ${result.description}`;

      // Add source and age metadata if available
      const metadata = [];
      if (domain) metadata.push(`Source: ${domain}`);
      if (result.age) metadata.push(`Age: ${result.age}`);
      if (result.page_age) metadata.push(`Published: ${result.page_age}`);

      if (metadata.length > 0) {
        resultText += `\n   ${metadata.join(' | ')}`;
      }

      resultText += `\n   URL: ${result.url}`;

      return resultText;
    }).join('\n\n');

    const freshnessNote = needsFreshness
      ? '\n(Results filtered for freshness - showing pages from the past day)'
      : '';

    return `Web Search Results:${freshnessNote}\n\n${results}`;
  } catch (error) {
    console.error('Web search error:', error);
    return "Web search encountered an error.";
  }
}

// Token estimation utilities
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const PROVIDER_TOKEN_LIMITS = {
  claude: 200000, // Claude 4.x Sonnet
  'gpt-5': 200000, // GPT-5 family
  gemini: 100000, // Gemini 2.5
  openrouter: 200000,
} as const;

function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function calculateConversationTokens(messages: Message[]): number {
  let totalTokens = 0;
  for (const message of messages) {
    totalTokens += estimateTokens(message.role) + 2;
    totalTokens += estimateTokens(message.content);
    totalTokens += 4;
  }
  return totalTokens;
}

function chunkConversationContext(messages: Message[], maxTokens: number): Message[] {
  if (messages.length === 0) return [];

  const chunkedMessages: Message[] = [];
  let currentTokens = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    const messageTokens = estimateTokens(message.role) + estimateTokens(message.content) + 6;

    if (currentTokens + messageTokens > maxTokens) {
      if (chunkedMessages.length === 0) {
        chunkedMessages.unshift(message);
      }
      break;
    }

    chunkedMessages.unshift(message);
    currentTokens += messageTokens;
  }

  return chunkedMessages;
}

function getProviderTokenLimit(providerName: string): number {
  const lowerProvider = providerName?.toLowerCase() || '';

  if (lowerProvider.includes('claude')) return PROVIDER_TOKEN_LIMITS.claude;
  if (lowerProvider.includes('gpt-5') || lowerProvider.includes('gpt-4')) return PROVIDER_TOKEN_LIMITS['gpt-5'];
  if (lowerProvider.includes('gemini')) return PROVIDER_TOKEN_LIMITS.gemini;

  return PROVIDER_TOKEN_LIMITS.openrouter;
}

async function claudeCompletion(messages: Message[], systemMessage: string) {
  if (!anthropicApiKey) {
    throw new Error('Anthropic API key not available');
  }

  // Filter out system messages from the messages array
  const userMessages = messages.filter(m => m.role !== 'system');

  // Define web search tool
  const tools = [{
    name: "web_search",
    description: "Search the internet for current information, news, product reviews, pricing, or any real-time data. Use this when you need up-to-date information beyond your training data.\n\nQUERY CONSTRUCTION BEST PRACTICES:\n- For time-sensitive queries (weather, news, prices), include temporal qualifiers like 'today', 'current', '2025'\n- For location-specific queries, specify city AND country (e.g., 'Sydney Australia' not just 'Sydney')\n- Use specific, detailed queries rather than vague ones\n- Time-sensitive keywords (today/current/now/latest/weather/price/news) automatically trigger freshness filtering\n\nEXAMPLES:\n- Good: 'Sydney Australia weather today' → Bad: 'Sydney weather'\n- Good: 'iPhone 16 price Australia 2025' → Bad: 'iPhone price'\n- Good: 'Tesla stock price today' → Bad: 'Tesla stock'",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to find information on the internet. Include location and time qualifiers for better results."
        }
      },
      required: ["query"]
    }
  }];

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemMessage,
      messages: userMessages,
      tools: tools,
    }),
  });

  if (!response.ok) {
    console.error('Claude API error:', response.status, response.statusText);
    const errorData = await response.text();
    console.error('Claude error details:', errorData);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  console.log('Claude response structure:', Object.keys(data));

  // Handle tool use
  if (data.stop_reason === 'tool_use') {
    const toolUse = data.content.find((block: any) => block.type === 'tool_use');

    if (toolUse && toolUse.name === 'web_search') {
      console.log('Claude requested web search:', toolUse.input.query);

      // Perform the search
      const searchResults = await searchWeb(toolUse.input.query);

      // Continue conversation with search results
      const followUpMessages = [
        ...userMessages,
        {
          role: 'assistant',
          content: data.content
        },
        {
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: searchResults
          }]
        }
      ];

      const followUpResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemMessage,
          messages: followUpMessages,
          tools: tools,
        }),
      });

      if (!followUpResponse.ok) {
        console.error('Follow-up API error:', followUpResponse.status, followUpResponse.statusText);
        const errorText = await followUpResponse.text();
        console.error('Follow-up error details:', errorText);
        throw new Error(`Follow-up Claude API error: ${followUpResponse.status}`);
      }

      const followUpData = await followUpResponse.json();
      console.log('Follow-up response stop_reason:', followUpData.stop_reason);
      console.log('Follow-up content blocks:', followUpData.content?.map((b: any) => ({ type: b.type, hasText: !!b.text })));

      const textBlock = followUpData.content?.find((block: any) => block.type === 'text');
      if (!textBlock || !textBlock.text) {
        console.error('No text block in follow-up response. Full content:', JSON.stringify(followUpData.content));
        return "I found search results but had trouble generating a response. Please try rephrasing your question.";
      }
      console.log('Extracted text length:', textBlock.text.length);
      return textBlock.text;
    }
  }

  return data.content?.find((block: any) => block.type === 'text')?.text ?? data.content?.[0]?.text ?? '';
}


async function openRouterCompletion(messages: Message[], systemMessage: string) {
  // Build messages array with system message at start
  const allMessages = [
    { role: 'system', content: systemMessage },
    ...messages.filter(m => m.role !== 'system')
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5',
      messages: allMessages,
    }),
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}


export async function getLLMResponse(messages: Message[], systemMessage: string, providerOverride?: string) {
  const providerEnv = providerOverride || Deno.env.get('MODEL_PROVIDER');
  const useOpenRouter = Deno.env.get('USE_OPENROUTER') === 'true';

  // Define fallback order - Claude first, then OpenRouter
  const providers = [];

  if (providerEnv) {
    providers.push(providerEnv);
  } else if (useOpenRouter) {
    providers.push('openrouter');
  } else {
    providers.push('claude'); // Default to Claude
  }

  // Add fallbacks based on available API keys
  if (!providers.includes('claude') && anthropicApiKey) {
    providers.push('claude');
  }
  if (!providers.includes('openrouter') && openRouterApiKey) {
    providers.push('openrouter');
  }

  console.log('Available providers to try:', providers);

  // Try each provider in order
  for (const provider of providers) {
    try {
      console.log('Trying AI provider:', provider);

      switch (provider) {
        case 'claude':
          if (!anthropicApiKey) {
            console.log('Anthropic API key not available, skipping');
            continue;
          }
          return await claudeCompletion(messages, systemMessage);
        case 'openrouter':
          if (!openRouterApiKey) {
            console.log('OpenRouter API key not available, skipping');
            continue;
          }
          return await openRouterCompletion(messages, systemMessage);
        default:
          continue;
      }
    } catch (error) {
      console.error(`Provider ${provider} failed:`, error);
      if (provider === providers[providers.length - 1]) {
        // Last provider failed, throw the error
        throw error;
      }
      // Continue to next provider
      continue;
    }
  }

  throw new Error('All AI providers failed');
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI Query function called');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('Authorization header is required');
    }

    // Create service role client for database operations
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract user from JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(token);
    
    console.log('User authentication result:', { user: !!user, error: userError?.message });
    
    if (userError || !user) {
      throw new Error(`User not authenticated: ${userError?.message || 'No user found'}`);
    }

    const user_id = user.id;
    console.log('Authenticated user ID:', user_id);

    const { data: settings } = await supabaseService
      .from('user_settings')
      .select('model_preference, personal_prompt')
      .eq('user_id', user_id)
      .maybeSingle();
    const providerOverride = settings?.model_preference;
    const personalPrompt = settings?.personal_prompt || '';

    const body = await req.json();
    const { query, knowledge_base_id, conversationContext, use_documents } = body;

    // Input validation
    if (!query || typeof query !== 'string') {
      throw new Error('Query is required and must be a string');
    }

    if (query.length > 10000) {
      return new Response(
        JSON.stringify({
          error: 'Query too long',
          response: "Your query is too long (maximum 10,000 characters). Please shorten your message and try again."
        }),
        {
          status: 413, // Payload Too Large
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (knowledge_base_id && typeof knowledge_base_id !== 'string') {
      throw new Error('Knowledge base ID must be a string');
    }

    // Validate conversation context if provided
    if (conversationContext && !Array.isArray(conversationContext)) {
      throw new Error('Conversation context must be an array');
    }

    console.log('Query received:', query);
    console.log('Knowledge base ID:', knowledge_base_id);
    console.log('Conversation context messages:', conversationContext?.length || 0);
    console.log('Use documents flag:', use_documents);

    if (!query) {
      throw new Error('Query is required');
    }

    let contextDocuments: any[] = [];
    let contextText = '';

    // IMPORTANT: Only fetch documents if EXPLICITLY requested (use_documents === true) or if knowledge_base_id is provided
    // Default behavior (when use_documents is undefined or false) is to NOT search documents
    const shouldFetchDocuments = (use_documents === true) || (knowledge_base_id !== undefined && knowledge_base_id !== null);

    // TEAM CONTEXT SUPPORT: Fetch user's team memberships for team document access
    const { data: teamMemberships, error: teamError } = await supabaseService
      .from('team_members')
      .select('team_id, teams(name)')
      .eq('user_id', user_id);

    if (teamError) {
      console.error('Error fetching team memberships:', teamError);
      // Continue without team context rather than failing
    }

    const teamIds = (teamMemberships || []).map(m => m.team_id).filter(Boolean);
    const teamNamesMap = new Map((teamMemberships || []).map(m => [m.team_id, m.teams?.name]) || []);
    console.log('User is member of teams:', teamIds.length, 'teams');

    if (shouldFetchDocuments && knowledge_base_id) {
      console.log('Searching for specific knowledge base:', knowledge_base_id);
      
      // Get specific knowledge base content (personal OR team)
      const { data: knowledgeBase, error: kbError } = await supabaseService
        .from('knowledge_bases')
        .select('*')
        .eq('id', knowledge_base_id)
        .or(teamIds.length > 0
          ? `user_id.eq.${user_id},and(team_id.in.(${teamIds.join(',')}),visibility.eq.team)`
          : `user_id.eq.${user_id}`)
        .single();

      console.log('Knowledge base query result:', { found: !!knowledgeBase, error: kbError?.message });

      if (kbError) {
        throw new Error(`Knowledge base not found: ${kbError.message}`);
      }

      // Get documents from the knowledge base  
      if (knowledgeBase.source_document_ids && knowledgeBase.source_document_ids.length > 0) {
        console.log('Fetching documents from knowledge base, count:', knowledgeBase.source_document_ids.length);
        
        // Fetch documents (personal OR team)
        const { data: documents, error: docsError } = await supabaseService
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags, file_type, user_id, team_id')
          .in('id', knowledgeBase.source_document_ids)
          .or(teamIds.length > 0
            ? `user_id.eq.${user_id},and(team_id.in.(${teamIds.join(',')}),visibility.eq.team)`
            : `user_id.eq.${user_id}`);

        console.log('Knowledge base documents result:', { found: documents?.length || 0, error: docsError?.message });

        if (!docsError && documents) {
          contextDocuments = documents;
        }
      }

      // Use AI-generated content from knowledge base if available
      if (knowledgeBase.ai_generated_content) {
        contextText = knowledgeBase.ai_generated_content;
        console.log('Using AI-generated content from knowledge base');
      }
    } else if (shouldFetchDocuments) {
      console.log('Searching all user documents');
      
      // First, get total document count for this user
      const { count: totalDocs, error: countError } = await supabaseService
        .from('knowledge_documents')
        .select('id', { count: 'exact' })
        .eq('user_id', user_id);
        
      console.log('Total documents for user:', totalDocs, 'Count error:', countError?.message);

      // Search all user's documents with more robust logic
      const queryLower = query.toLowerCase();
      console.log('Query keywords:', queryLower);
      
      // Check for marketing-related terms
      const isMarketingQuery = queryLower.includes('marketing') || queryLower.includes('market') || 
                             queryLower.includes('campaign') || queryLower.includes('brand') || 
                             queryLower.includes('promotion') || queryLower.includes('wheels') || 
                             queryLower.includes('wins');
      
      console.log('Is marketing query:', isMarketingQuery);
      
      if (isMarketingQuery) {
        console.log('Searching for marketing documents...');
        
        // Cast query for marketing documents with broader search (personal OR team)
        const { data: marketingDocs, error: marketingError} = await supabaseService
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags, file_type, user_id, team_id')
          .or(teamIds.length > 0
            ? `and(user_id.eq.${user_id},or(title.ilike.%marketing%,content.ilike.%marketing%,tags.cs.["marketing"],title.ilike.%wheels%,title.ilike.%wins%,file_type.eq.json)),and(team_id.in.(${teamIds.join(',')}),visibility.eq.team,or(title.ilike.%marketing%,content.ilike.%marketing%,tags.cs.["marketing"]))`
            : `user_id.eq.${user_id},or(title.ilike.%marketing%,content.ilike.%marketing%,tags.cs.["marketing"],title.ilike.%wheels%,title.ilike.%wins%,file_type.eq.json)`)
          .limit(30);
        
        console.log('Marketing documents found:', marketingDocs?.length || 0, 'Error:', marketingError?.message);
        
        if (!marketingError && marketingDocs && marketingDocs.length > 0) {
          contextDocuments = marketingDocs;
        }
      }
      
      // If no marketing docs or general query, get recent documents
      if (contextDocuments.length === 0) {
        console.log('Getting recent documents as fallback...');
        
        // Get recent documents (personal OR team)
        const { data: documents, error: docsError } = await supabaseService
          .from('knowledge_documents')
          .select('title, content, ai_summary, tags, file_type, user_id, team_id')
          .or(teamIds.length > 0
            ? `user_id.eq.${user_id},and(team_id.in.(${teamIds.join(',')}),visibility.eq.team)`
            : `user_id.eq.${user_id}`)
          .order('updated_at', { ascending: false })
          .limit(30);

        console.log('Recent documents found:', documents?.length || 0, 'Error:', docsError?.message);

        if (!docsError && documents) {
          contextDocuments = documents;
        }
      }
    }

    console.log('Final context documents count:', contextDocuments.length);

    // Prepare context for AI with source attribution (Personal vs Team)
    let documentContext = '';
    if (contextDocuments.length > 0) {
      documentContext = contextDocuments.map((doc, index) => {
        // Use full content if no summary, but limit to reasonable size for AI
        const content = doc.ai_summary || doc.content?.substring(0, 3000) || 'No content available';

        // Determine source: Personal or Team
        const isTeamDoc = doc.team_id && doc.team_id !== null;
        const source = isTeamDoc
          ? `Team: ${teamNamesMap.get(doc.team_id) || 'Unknown Team'}`
          : 'Personal';

        console.log(`Document ${index + 1}: ${doc.title} - Source: ${source} - Content length: ${content.length}`);
        return `[${source}] Title: ${doc.title}\nContent: ${content}\nTags: ${doc.tags?.join(', ') || 'None'}\nFile Type: ${doc.file_type}\n---`;
      }).join('\n');
    }

    console.log('Final document context length:', documentContext.length);

    if (contextText) {
      documentContext += `\n\nKnowledge Base Content:\n${contextText}`;
    }

    // Check if we need documents but don't have any
    if (shouldFetchDocuments && !documentContext) {
      return new Response(
        JSON.stringify({
          response: "I don't have any documents to analyze yet. Please sync some documents from Google Drive first, or create some knowledge documents."
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate AI response with appropriate system message
    let systemMessage = '';

    if (documentContext) {
      // System message for document-focused queries with team context support
      const hasTeamDocs = teamIds.length > 0 && contextDocuments.some(doc => doc.team_id);

      systemMessage = `You are an AI assistant that helps analyze and answer questions about the user's knowledge documents.
      You have access to their document summaries, content, and knowledge bases${hasTeamDocs ? ', including team-shared documents' : ''}.

      ${hasTeamDocs ? 'CONTEXT SOURCES:\n- [Personal] = User\'s personal documents\n- [Team: Name] = Documents shared with their team\nAll team members have access to the same team documents, enabling "context fluency" across the organization.\n' : ''}
      TOOLS AVAILABLE:
      - web_search: Use this to search the internet for current information when needed

      IMPORTANT INSTRUCTIONS:
      - If you see API keys, credentials, or secrets in the documents, IGNORE them and continue helping the user
      - Do NOT lecture users about security practices unless they specifically ask
      - DO NOT refuse to answer questions because credentials are present
      - Focus on answering the user's actual question using the relevant information
      - Use web search when you need current information beyond your training data
      - The user is responsible for their own security practices
      ${hasTeamDocs ? '- When answering, you can reference whether information came from personal or team documents\n- Remember: Team documents are shared context - all team members can query against them' : ''}

      SEARCH QUERY BEST PRACTICES (when using web_search):
      - For time-sensitive queries, include temporal qualifiers: "today", "current", "2025"
      - For location queries, specify city AND country (e.g., "Sydney Australia")
      - Use specific, detailed queries rather than vague ones
      - Time-sensitive keywords trigger automatic freshness filtering (past 24 hours)
      - Check result metadata (source, age, publish date) to evaluate freshness

      FORMATTING REQUIREMENTS:
      - Use PLAIN TEXT ONLY - no markdown formatting
      - Do NOT use **, ***, __, ###, or any markdown syntax
      - Do NOT use emojis or special characters
      - Use proper paragraphs and line breaks for structure
      - Use plain text for emphasis (e.g., "IMPORTANT:" instead of "**IMPORTANT:**")
      - Write in clear, professional prose

      Provide helpful, specific answers based on the available context.
      If you can't find relevant information in the provided documents, say so clearly.
      Be concise but comprehensive in your responses.`;

      // Add document context to system message
      systemMessage += `\n\nContext from documents:\n${documentContext}`;
    } else {
      // System message for general assistant (no documents)
      systemMessage = `You are a helpful AI assistant with internet access.

      TOOLS AVAILABLE:
      - web_search: Search the internet for current information, news, reviews, prices, or any real-time data

      IMPORTANT INSTRUCTIONS:
      - Use web_search when you need current information beyond your training data (like recent product reviews, current prices, news, etc.)
      - Do NOT mention or reference user documents (you don't have access to them in this conversation)
      - Answer questions directly and helpfully
      - Be conversational and natural
      - When using web search results, cite your sources and check result freshness

      SEARCH QUERY BEST PRACTICES:
      - For time-sensitive queries, include temporal context: "today", "current", "2025", "latest"
      - For location-specific queries, specify BOTH city and country (e.g., "Sydney Australia" not "Sydney")
      - Use descriptive, specific queries rather than vague ones
      - Time-sensitive keywords automatically trigger freshness filtering (past 24 hours)
      - Examples of good queries:
        * "Sydney Australia weather today" (not "Sydney weather")
        * "iPhone 16 price Australia 2025" (not "iPhone price")
        * "Tesla stock price current" (not "Tesla stock")

      EVALUATING SEARCH RESULTS:
      - Check result metadata: source domain, age, and publish date
      - For weather/news/prices, prioritize results from the past day
      - For product reviews, look for recent sources (2024-2025)
      - Trust authoritative sources (government sites, major news outlets, official company pages)
      - If results seem outdated, consider the query might need refinement

      FORMATTING REQUIREMENTS:
      - Use PLAIN TEXT ONLY - no markdown formatting
      - Do NOT use **, ***, __, ###, or any markdown syntax
      - Do NOT use emojis or special characters
      - Use proper paragraphs and line breaks for structure
      - Use plain text for emphasis (e.g., "IMPORTANT:" instead of "**IMPORTANT:**")
      - Write in clear, professional prose

      You have internet access through web search. Use it when needed to provide accurate, current information.`;
    }

    // Add personal prompt if user has one
    if (personalPrompt) {
      systemMessage += `\n\nUSER PREFERENCES:\n${personalPrompt}`;
    }

    // Build messages array with conversation history
    const messages: Message[] = [];

    // Add conversation context if provided
    if (conversationContext && Array.isArray(conversationContext) && conversationContext.length > 0) {
      console.log('Processing conversation context with', conversationContext.length, 'messages');

      // Determine provider token limit
      const providerName = providerOverride || 'claude';
      const maxTokens = getProviderTokenLimit(providerName);
      console.log('Provider:', providerName, 'Max tokens:', maxTokens);

      // Calculate token budget (reserve space for system message, current query, and response)
      const systemTokens = estimateTokens(systemMessage);
      const queryTokens = estimateTokens(query);
      const reservedTokens = systemTokens + queryTokens + 3000; // Reserve 3000 for response
      const conversationBudget = Math.floor((maxTokens - reservedTokens) * 0.7);

      console.log('Token budget - System:', systemTokens, 'Query:', queryTokens, 'Conversation budget:', conversationBudget);

      // Chunk conversation if needed
      const conversationTokens = calculateConversationTokens(conversationContext);
      console.log('Conversation tokens:', conversationTokens);

      if (conversationTokens > conversationBudget) {
        console.log('Chunking conversation context - exceeds budget');
        const chunkedContext = chunkConversationContext(conversationContext, conversationBudget);
        console.log('Chunked to', chunkedContext.length, 'messages');
        messages.push(...chunkedContext);
      } else {
        messages.push(...conversationContext);
      }
    }

    // Add current query as the last user message
    messages.push({
      role: 'user',
      content: query
    });

    console.log('Calling AI model for response generation with', messages.length, 'messages...');
    let aiAnswer;
    try {
      aiAnswer = await getLLMResponse(messages, systemMessage, providerOverride);
      console.log('AI response generated successfully:', aiAnswer ? 'Yes' : 'No', 'Length:', aiAnswer?.length || 0);
    } catch (aiError) {
      console.error('AI model error details:', {
        error: aiError,
        message: aiError instanceof Error ? aiError.message : String(aiError),
        stack: aiError instanceof Error ? aiError.stack : undefined
      });
      const errorStr = String(aiError);

      // Better error categorization
      if (errorStr.includes('401') || errorStr.includes('unauthorized')) {
        return new Response(
          JSON.stringify({
            error: 'Authentication error',
            response: "There's an authentication issue with the AI provider. Please contact support."
          }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else if (errorStr.includes('429') || errorStr.includes('rate limit')) {
        return new Response(
          JSON.stringify({
            error: 'Provider rate limit',
            response: "The AI provider is rate limiting requests. Please try again in a few moments."
          }),
          {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else if (errorStr.includes('413') || errorStr.includes('too large') || errorStr.includes('token')) {
        return new Response(
          JSON.stringify({
            error: 'Context too large',
            response: "Your conversation or documents are too large for the AI provider. Try starting a new conversation or using fewer documents."
          }),
          {
            status: 413,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      aiAnswer = "I'm having trouble generating a response right now. Please try again in a moment.";
    }

    if (!aiAnswer || aiAnswer.trim() === '') {
      console.warn('Empty AI response received');
      aiAnswer = "I'm sorry, I couldn't generate a response to your question. Please try rephrasing or try again.";
    }

    // Save query to history
    try {
      console.log('Saving query to history...');

      await supabaseService
        .from('ai_query_history')
        .insert({
          user_id,
          query_text: query,
          response_text: aiAnswer,
          knowledge_base_id: knowledge_base_id || null,
          context_documents_count: contextDocuments.length
        });

      console.log('Query history saved successfully');
    } catch (historyError) {
      console.error('Failed to save query history:', historyError);
      // Don't fail the main request if history saving fails
    }

    return new Response(
      JSON.stringify({
        response: aiAnswer,
        context_documents_count: contextDocuments.length,
        knowledge_base_used: !!knowledge_base_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in ai-query function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: "Sorry, I encountered an error processing your query. Please try again."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});