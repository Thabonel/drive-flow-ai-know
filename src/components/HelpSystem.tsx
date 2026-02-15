import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
// Tabs component available for future use
import {
  HelpCircle,
  Search,
  BookOpen,
  MessageSquare,
  Settings,
  FileText,
  Zap,
  Shield,
  ExternalLink,
  X,
  ArrowRight,
  Phone,
  Mail
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: 'getting-started' | 'features' | 'integrations' | 'troubleshooting' | 'privacy';
  tags: string[];
  content?: string;
  link?: string;
  icon: React.ReactNode;
}

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: string;
  defaultSearch?: string;
}

const helpArticles: HelpArticle[] = [
  // Getting Started
  {
    id: 'quick-start',
    title: 'Quick Start Guide',
    description: 'Get up and running in 5 minutes',
    category: 'getting-started',
    tags: ['beginner', 'setup', 'first-steps'],
    icon: <Zap className="h-5 w-5" />,
    link: '/docs/QUICK_START.md'
  },
  {
    id: 'user-guide',
    title: 'Complete User Guide',
    description: 'Everything you need to know about your AI assistant',
    category: 'getting-started',
    tags: ['complete', 'comprehensive', 'all-features'],
    icon: <BookOpen className="h-5 w-5" />,
    link: '/docs/USER_GUIDE.md'
  },
  {
    id: 'first-chat',
    title: 'Your First Conversation',
    description: 'Learn how to chat effectively with your AI',
    category: 'getting-started',
    tags: ['chat', 'conversation', 'tips'],
    icon: <MessageSquare className="h-5 w-5" />,
    content: `
Try these example questions to get started:

**Basic Interaction:**
• "Hello! What can you help me with?"
• "Tell me about your capabilities"
• "How do I upload documents?"

**Information Requests:**
• "What's the weather today?"
• "Search for latest AI news"
• "Help me understand this topic: [your topic]"

**Document Analysis:**
• "Summarize my uploaded meeting notes"
• "What are the key points in my report?"
• "Find action items in my documents"

**Productivity Help:**
• "Help me plan my day"
• "Remind me about upcoming deadlines"
• "Organize my thoughts about [project]"

💡 **Pro Tips:**
- Be specific about what you need
- Reference previous conversations for context
- Ask follow-up questions to dig deeper
- Use natural language - no special commands needed
    `
  },
  {
    id: 'document-upload',
    title: 'Documents: Upload & Local Access',
    description: 'Learn how to work with documents - upload to cloud or access locally',
    category: 'getting-started',
    tags: ['documents', 'upload', 'files', 'local', 'privacy', 'knowledge-base'],
    icon: <FileText className="h-5 w-5" />,
    content: `
**🔐 NEW: Local Document Access (Privacy-First)**
Keep documents on your PC while enabling AI queries:

**How Local Access Works:**
• Click "Local Indexing" tab in Documents section
• Grant folder permissions (one-time setup)
• AI creates smart summaries stored locally in browser
• Documents NEVER leave your computer
• Search both local and cloud documents together

**Setup Process:**
1. Go to "Documents" → "Local Indexing" tab
2. Click "Add Folder" and select folders to index
3. Browser requests folder permission (click "Allow")
4. AI scans and creates document summaries
5. Search works across all your documents seamlessly

**Local Access Benefits:**
• Complete privacy - documents stay on your PC
• Works offline for local documents
• Faster access to local files
• No upload limits or storage costs
• Automatic background sync for changes

---

**☁️ Cloud Document Upload**

**Supported File Types:**
• PDF files (reports, presentations, forms)
• DOCX (Word documents)
• TXT (plain text files)
• MD (Markdown files)
• CSV (spreadsheet data)
• JSON (structured data)

**Upload Process:**
1. Go to "Documents" → "Upload Documents" tab
2. Click "Upload Document" or drag & drop files
3. Wait for AI processing (30 seconds to 5 minutes)
4. View the AI-generated summary
5. Start asking questions about your content

**Best Practices:**
• Use descriptive filenames
• Upload related documents together
• Create Knowledge Bases for organization
• Regular cleanup of outdated files
• Maximum 50MB per file

**Knowledge Bases:**
Group related documents for better searching:
• "Q1 2026 Projects" - All project files
• "Legal Documents" - Contracts and agreements
• "Meeting Notes" - All meeting summaries
• "Research Materials" - Reference documents

**🔍 Hybrid Search:**
When you ask questions, AI automatically searches:
• Your local documents (if indexing enabled)
• Cloud uploaded documents
• Results show source indicators (📁 Local vs ☁️ Cloud)
    `
  },
  {
    id: 'local-indexing',
    title: '🔐 Local Document Indexing',
    description: 'Privacy-first document access - keep files on your PC',
    category: 'getting-started',
    tags: ['local', 'privacy', 'indexing', 'offline', 'browser', 'security'],
    icon: <Shield className="h-5 w-5" />,
    content: `
**What is Local Document Indexing?**
A privacy-first way to use AI with your documents without uploading them to the cloud. Documents stay on your computer while AI creates smart summaries for searching.

**🔒 Privacy & Security:**
• Documents NEVER leave your computer
• AI summaries stored locally in your browser
• No data transmitted to servers
• Works completely offline for local files
• Full control over what gets indexed

**🚀 How It Works:**
1. **Grant Permissions**: Choose folders to index (one-time setup)
2. **AI Scanning**: Creates smart summaries of your documents
3. **Local Storage**: Summaries stored in browser's IndexedDB
4. **Hybrid Search**: Search local + cloud documents together
5. **Background Sync**: Automatically detects file changes

**📁 Supported File Types:**
• PDF documents (reports, presentations)
• Word documents (.docx, .doc)
• Text files (.txt, .md, .rtf)
• Spreadsheets (.xlsx, .xls, .csv)
• All the same types as cloud upload

**⚡ Key Features:**
• **Smart Background Sync**: Checks for changes hourly
• **Manual Refresh**: Force immediate re-scan
• **Change Detection**: Only processes modified files
• **Browser Storage**: Uses modern IndexedDB for fast access
• **Folder Organization**: Index multiple folders separately
• **Source Indicators**: See which results are local vs cloud

**🔧 Setup Instructions:**
1. Go to Documents → Local Indexing tab
2. Click "Add Folder" button
3. Select folder in file picker dialog
4. Browser asks for permission → Click "Allow"
5. AI begins scanning your documents
6. View progress in the indexing panel
7. Start searching immediately

**🔍 Using Hybrid Search:**
When you ask questions, AI searches:
• 📁 Your local indexed documents
• ☁️ Cloud uploaded documents
• Results clearly marked with source
• One search covers everything

**⚙️ Browser Requirements:**
• Chrome 86+ (recommended)
• Edge 86+ (full support)
• Firefox (limited support)
• Safari (experimental)
• Requires HTTPS (secure connection)

**🛠️ Troubleshooting:**
• **No folder picker?** → Use Chrome or Edge browser
• **Permission denied?** → Try again, ensure you click "Allow"
• **Slow scanning?** → Large folders take time, be patient
• **Missing files?** → Check file types are supported
• **Not finding documents?** → Try manual refresh button

**💡 Pro Tips:**
• Index your main document folders (~/Documents, ~/Downloads)
• Organize files with clear names for better AI understanding
• Use both local and cloud storage for different needs
• Local = Privacy, Cloud = Sharing and backup
• Check Settings → Local Indexing for advanced options

**🔄 How Sync Works:**
• Runs automatically every hour while app is open
• Checks file modification timestamps
• Only processes changed/new files
• Manual refresh button for immediate sync
• Progress indicator shows current status

**🎯 Perfect For:**
• Sensitive documents you can't upload
• Large document collections
• Offline document access
• Privacy-conscious users
• Corporate compliance requirements
• Personal document management
    `
  },

  // Features
  {
    id: 'proactive-features',
    title: 'Proactive Assistance',
    description: 'How your AI actively helps you',
    category: 'features',
    tags: ['proactive', 'autonomous', 'smart', 'check-ins'],
    icon: <Zap className="h-5 w-5" />,
    content: `
**What is Proactive Assistance?**
Your AI analyzes your patterns and proactively reaches out when you might need help.

**How It Works:**
• Evaluates every 30 minutes if assistance is needed
• Analyzes your goals, deadlines, and patterns
• Calculates urgency scores based on context
• Reaches out via your preferred channel

**What Triggers Check-ins:**
• Upcoming deadlines and commitments
• Incomplete tasks and follow-ups
• Opportunities for document organization
• Meeting preparation suggestions
• Goal progress reviews

**Customization Options:**
• Set preferred contact method (Web/Telegram/Slack)
• Configure "do not disturb" hours
• Adjust proactive sensitivity levels
• Define urgency thresholds
• Provide feedback to improve timing

**Autonomy Sessions:**
With your permission, I can take actions for up to 2 hours:
• Creating calendar events
• Organizing documents
• Sending reminders
• Researching topics
• Always requires explicit confirmation

**Privacy Controls:**
• All proactive actions are logged
• You can review and provide feedback
• Turn off proactive features anytime
• Full control over autonomous permissions
    `
  },
  {
    id: 'voice-features',
    title: 'Voice Input and Commands',
    description: 'Using voice with your AI assistant',
    category: 'features',
    tags: ['voice', 'audio', 'speech', 'hands-free'],
    icon: <Phone className="h-5 w-5" />,
    content: `
**Web Interface Voice:**
• Click the microphone icon in the chat
• Speak clearly in a quiet environment
• Automatic transcription and processing
• Supports multiple languages (English best)

**Telegram Voice Messages:**
• Send voice messages directly to the bot
• Automatic transcription using AI
• Great for hands-free mobile interaction
• Works while driving or multitasking

**Voice Tips:**
• Speak at normal conversation pace
• Keep messages under 60 seconds
• Use in quiet environments for best results
• Fallback to text if transcription fails

**What You Can Say:**
• "Summarize today's uploaded documents"
• "What meetings do I have this week?"
• "Help me draft an email about the project update"
• "Remind me to follow up on the contract tomorrow"

**Troubleshooting:**
• Check microphone permissions in browser
• Ensure HTTPS connection for security
• Try different browsers if issues persist
• Clear speech works better than mumbling
    `
  },

  // Integrations
  {
    id: 'telegram-setup',
    title: 'Telegram Bot Setup',
    description: 'Connect your AI assistant to Telegram',
    category: 'integrations',
    tags: ['telegram', 'mobile', 'bot', 'setup'],
    icon: <MessageSquare className="h-5 w-5" />,
    content: `
**Setup Steps:**
1. Go to Settings → Integrations in AI Query Hub
2. Find "Telegram Bot" section
3. Click "Connect Telegram"
4. Copy the connection code
5. Open Telegram and search for @aiqueryhub_bot
6. Send: /start [your-connection-code]
7. Receive confirmation message

**Available Commands:**
• /help - Show available commands
• /status - Check account status
• /settings - Manage bot preferences
• /start - Initial setup or reconnection

**What You Can Do:**
• Send text messages for AI assistance
• Send voice messages (automatically transcribed)
• Share images for AI analysis
• Forward messages/emails for processing
• Receive proactive notifications

**Security Features:**
• Webhook signature verification
• Account-specific bot tokens
• Encrypted message processing
• Revokable access anytime

**Troubleshooting:**
• Verify connection code was copied correctly
• Try unlinking and relinking account
• Send /start command to reinitialize
• Check bot isn't blocked in Telegram settings
    `
  },
  {
    id: 'slack-integration',
    title: 'Slack Integration',
    description: 'Add AI assistance to your team workspace',
    category: 'integrations',
    tags: ['slack', 'team', 'collaboration', 'workspace'],
    icon: <Settings className="h-5 w-5" />,
    content: `
**Installation:**
1. In AI Query Hub, go to Settings → Integrations
2. Click "Add to Slack"
3. Choose your Slack workspace
4. Authorize required permissions
5. Select channels to enable (optional)

**How to Use:**
• /aiquery [question] - Ask your AI assistant
• /aiquery-help - Show available commands
• /aiquery-settings - Manage preferences
• Direct message the bot for private conversations

**Team Features:**
• Shared knowledge bases for team documents
• Team-wide AI assistance in channels
• Collaborative document analysis
• Meeting summary sharing

**Privacy:**
• Personal documents stay private by default
• You control what gets shared with team
• Individual chat history remains private
• Team admins control workspace permissions

**Permissions Required:**
• Read messages in authorized channels
• Post messages and replies
• Access basic workspace information
• Create and manage slash commands

**Troubleshooting:**
• Ensure you have app installation permissions
• Contact workspace admin if needed
• Try removing and re-adding integration
• Test direct messages before channels
    `
  },

  // Troubleshooting
  {
    id: 'common-issues',
    title: 'Common Issues & Solutions',
    description: 'Quick fixes for frequent problems',
    category: 'troubleshooting',
    tags: ['problems', 'fixes', 'solutions', 'help'],
    icon: <HelpCircle className="h-5 w-5" />,
    link: '/docs/TROUBLESHOOTING.md'
  },
  {
    id: 'slow-responses',
    title: 'Slow AI Responses',
    description: 'Why responses might be slow and how to fix it',
    category: 'troubleshooting',
    tags: ['performance', 'speed', 'slow', 'optimization'],
    icon: <Zap className="h-5 w-5" />,
    content: `
**Common Causes:**
• Large document processing (expected delay)
• Complex queries requiring deep analysis
• Network connectivity issues
• High system load during peak hours

**Expected Response Times:**
• Simple chat: <3 seconds
• Document queries: 5-15 seconds
• Complex analysis: 15-30 seconds
• Web search: 10-20 seconds

**Solutions:**
• Check your internet connection
• Break complex questions into smaller parts
• Refresh the page if responses stop
• Try asking simpler questions first
• Upload smaller documents for faster processing

**When to Contact Support:**
• Responses consistently take over 30 seconds
• System appears completely unresponsive
• Error messages appear repeatedly
• Features stop working entirely

**Optimization Tips:**
• Keep documents under 10MB when possible
• Use specific rather than broad questions
• Reference exact document names
• Provide context from previous conversations
    `
  },

  // Privacy
  {
    id: 'privacy-security',
    title: 'Privacy & Security',
    description: 'How we protect your data',
    category: 'privacy',
    tags: ['privacy', 'security', 'data', 'protection'],
    icon: <Shield className="h-5 w-5" />,
    link: '/docs/PRIVACY_POLICY.md'
  },
  {
    id: 'data-control',
    title: 'Your Data Rights',
    description: 'What you can control and how to manage your data',
    category: 'privacy',
    tags: ['data', 'rights', 'control', 'deletion'],
    icon: <FileText className="h-5 w-5" />,
    content: `
**What You Control:**
• All conversations and documents
• Integration connections (Telegram, Slack, etc.)
• Proactive assistance preferences
• Account settings and profile
• Data retention preferences
• 🔐 Local document indexing settings

**🔐 Local Document Privacy (NEW):**
• Documents NEVER leave your computer
• AI summaries stored only in your browser
• No network transmission of document content
• Full offline capability for local documents
• You can disable/enable per folder
• Browser storage under your complete control

**Data Access:**
• View all your data through the dashboard
• Export conversations as PDF or JSON
• Download original documents anytime
• Request complete data export (within 30 days)
• Export local document summaries from browser
• Clear local indexing data anytime

**Data Deletion:**
• Delete individual conversations
• Remove specific documents
• Disconnect integrations
• Delete your entire account permanently
• Clear all local document indexing data
• Revoke folder permissions instantly

**Privacy Guarantees:**
• Your data is never sold or shared for marketing
• End-to-end encryption for all communications
• Row-level database security (your data isolated)
• AI processing doesn't retain personal data
• SOC2 Type II compliant infrastructure
• Local documents never transmitted or stored on servers

**Data Retention:**
• Conversations: 30+ days for context (or until you delete)
• Cloud documents: Until you delete them
• Local documents: Always on your computer only
• Local summaries: Stored in browser until you clear them
• Usage analytics: 24 months (anonymized)
• Audit logs: 7 years (for security compliance)

**International Transfers:**
• Primary storage: Singapore (Supabase)
• AI processing: Secure cloud providers (US/EU)
• Local documents: Never transferred (stay on your PC)
• All cloud transfers use appropriate safeguards
• GDPR, CCPA compliant

**Browser Privacy:**
• Local indexing uses IndexedDB (browser standard)
• Data isolated per domain (only AI Query Hub can access)
• Cleared when you clear browser data
• No tracking or analytics on local document content
• File System Access API uses secure permission model
    `
  }
];

export function HelpSystem({ isOpen, onClose, defaultCategory, defaultSearch }: HelpSystemProps) {
  const [searchQuery, setSearchQuery] = useState(defaultSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || 'getting-started');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter articles based on search and category
  const filteredArticles = helpArticles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const categories = [
    { id: 'getting-started', label: 'Getting Started', icon: <BookOpen className="h-4 w-4" /> },
    { id: 'features', label: 'Features', icon: <Zap className="h-4 w-4" /> },
    { id: 'integrations', label: 'Integrations', icon: <Settings className="h-4 w-4" /> },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: <HelpCircle className="h-4 w-4" /> },
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="h-4 w-4" /> },
  ];

  const handleArticleClick = (article: HelpArticle) => {
    if (article.link) {
      // Open external link
      window.open(article.link, '_blank');
    } else {
      // Show inline content
      setSelectedArticle(article);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-accent" />
                Help & Support
              </CardTitle>
              <CardDescription>
                Get help with your Living AI Assistant
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Search */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSearchQuery('')}
              disabled={!searchQuery}
            >
              Clear
            </Button>
          </div>
        </CardHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r p-4 overflow-y-auto">
            <div className="space-y-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedArticle(null);
                  }}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                    selectedCategory === category.id
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  }`}
                >
                  {category.icon}
                  <span className="font-medium">{category.label}</span>
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-6 border-t space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-3">
                Need More Help?
              </h4>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Mail className="h-4 w-4 mr-2" />
                Contact Support
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <ExternalLink className="h-4 w-4 mr-2" />
                Community Forum
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              {selectedArticle ? (
                // Article content view
                <motion.div
                  key="article"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-6"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArticle(null)}
                    >
                      ← Back to articles
                    </Button>
                  </div>

                  <div className="flex items-center gap-3 mb-6">
                    {selectedArticle.icon}
                    <div>
                      <h2 className="text-2xl font-bold">{selectedArticle.title}</h2>
                      <p className="text-muted-foreground">{selectedArticle.description}</p>
                    </div>
                  </div>

                  <div className="prose max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {selectedArticle.content}
                    </pre>
                  </div>
                </motion.div>
              ) : (
                // Articles list view
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-6"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold capitalize">
                      {selectedCategory.replace('-', ' ')}
                    </h2>
                    <p className="text-muted-foreground">
                      {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} found
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {filteredArticles.map((article) => (
                      <Card
                        key={article.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleArticleClick(article)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="text-accent mt-1">
                              {article.icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">{article.title}</h3>
                                {article.link && (
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm mb-2">
                                {article.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {article.tags.map((tag) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredArticles.length === 0 && (
                    <div className="text-center py-12">
                      <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No articles found</h3>
                      <p className="text-muted-foreground mb-4">
                        Try adjusting your search terms or browse different categories.
                      </p>
                      <Button variant="outline" onClick={() => setSearchQuery('')}>
                        Clear search
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Help button component
export function HelpButton() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsHelpOpen(true)}
        className="fixed bottom-4 right-4 rounded-full shadow-lg z-40"
      >
        <HelpCircle className="h-4 w-4 mr-2" />
        Help
      </Button>

      <HelpSystem
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
}