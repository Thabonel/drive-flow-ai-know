/**
 * Route-based SEO configurations for all application routes
 */

import { RouteMetaData } from '@/types/seo';
import { createPageSEO } from '@/hooks/useSEO';

/**
 * SEO configuration for all routes
 */
export const routeSEOConfig: Record<string, RouteMetaData> = {
  // Landing/Homepage
  '/': {
    path: '/',
    title: 'AI Query Hub - An AI Assistant That Remembers Everything',
    description: 'Connect your documents and chat naturally with an AI assistant that never forgets. Perfect memory, infinite knowledge. 14-day free trial.',
    keywords: ['AI assistant', 'productivity', 'document search', 'artificial intelligence', 'knowledge management', 'chat with documents'],
    ogType: 'website',
    priority: 1.0,
    changefreq: 'monthly'
  },

  // Authentication
  '/auth': {
    path: '/auth',
    ...createPageSEO('Sign In', 'Sign in to AI Query Hub to access your personal AI assistant and document knowledge base.'),
    keywords: ['sign in', 'login', 'authentication', 'AI Query Hub'],
    priority: 0.8,
    changefreq: 'monthly'
  },

  '/reset-password': {
    path: '/reset-password',
    ...createPageSEO('Reset Password', 'Reset your AI Query Hub password to regain access to your AI assistant and documents.'),
    noindex: true,
    priority: 0.3,
    changefreq: 'yearly'
  },

  '/auth/confirm': {
    path: '/auth/confirm',
    ...createPageSEO('Confirm Email', 'Confirm your email address to activate your AI Query Hub account.'),
    noindex: true,
    priority: 0.3,
    changefreq: 'yearly'
  },

  // Core Features (Protected Routes)
  '/dashboard': {
    path: '/dashboard',
    ...createPageSEO('Dashboard', 'Your AI Query Hub dashboard - manage documents, conversations, and AI interactions.'),
    keywords: ['dashboard', 'AI assistant', 'document management', 'productivity'],
    noindex: true, // Protected content
    priority: 0.1,
    changefreq: 'daily'
  },

  '/conversations': {
    path: '/conversations',
    ...createPageSEO('AI Conversations', 'Chat with your AI assistant about any topic. Access your conversation history and continue where you left off.'),
    keywords: ['AI chat', 'conversations', 'artificial intelligence', 'assistant'],
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/documents': {
    path: '/documents',
    ...createPageSEO('Documents', 'Manage your document library. Upload, organize, and search through your files with AI assistance.'),
    keywords: ['documents', 'file management', 'document search', 'AI analysis'],
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/knowledge': {
    path: '/knowledge',
    ...createPageSEO('Knowledge Bases', 'Create and manage AI-powered knowledge bases from your documents and data sources.'),
    keywords: ['knowledge base', 'AI knowledge', 'document organization', 'information management'],
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/timeline': {
    path: '/timeline',
    ...createPageSEO('Timeline', 'Manage your tasks, schedule, and productivity timeline with AI-powered insights.'),
    keywords: ['timeline', 'productivity', 'task management', 'scheduling'],
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/settings': {
    path: '/settings',
    ...createPageSEO('Settings', 'Configure your AI Query Hub preferences, integrations, and account settings.'),
    keywords: ['settings', 'preferences', 'configuration', 'account'],
    noindex: true,
    priority: 0.1,
    changefreq: 'monthly'
  },

  // Google Drive Integration
  '/drive': {
    path: '/drive',
    ...createPageSEO('Google Drive', 'Connect and sync your Google Drive documents with AI Query Hub for intelligent document search.'),
    keywords: ['Google Drive', 'document sync', 'cloud storage', 'integration'],
    noindex: true,
    priority: 0.1,
    changefreq: 'weekly'
  },

  '/add-documents': {
    path: '/add-documents',
    ...createPageSEO('Add Documents', 'Upload and add documents to your AI Query Hub knowledge base for intelligent searching.'),
    keywords: ['upload documents', 'add files', 'document import'],
    noindex: true,
    priority: 0.1,
    changefreq: 'monthly'
  },

  '/sync': {
    path: '/sync',
    ...createPageSEO('Sync Status', 'Monitor the synchronization status of your documents and cloud integrations.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  // Team Features
  '/team/settings': {
    path: '/team/settings',
    ...createPageSEO('Team Settings', 'Configure your team settings and collaboration preferences in AI Query Hub.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'monthly'
  },

  '/team/members': {
    path: '/team/members',
    ...createPageSEO('Team Members', 'Manage your team members and their access to AI Query Hub features.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'weekly'
  },

  '/team/documents': {
    path: '/team/documents',
    ...createPageSEO('Team Documents', 'Access and manage shared team documents with AI-powered collaboration.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/team/timeline': {
    path: '/team/timeline',
    ...createPageSEO('Team Timeline', 'Collaborate on team tasks and projects with shared timeline management.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  // Productivity Features
  '/booking-links': {
    path: '/booking-links',
    ...createPageSEO('Booking Links', 'Manage your scheduling links and calendar integrations with AI assistance.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'weekly'
  },

  '/daily-brief': {
    path: '/daily-brief',
    ...createPageSEO('Daily Brief', 'Get your AI-generated daily brief with important updates and task summaries.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/email-to-task': {
    path: '/email-to-task',
    ...createPageSEO('Email to Task', 'Convert emails into actionable tasks with AI-powered analysis and organization.'),
    noindex: true,
    priority: 0.1,
    changefreq: 'weekly'
  },

  // Support & Legal Pages
  '/support': {
    path: '/support',
    ...createPageSEO('Support', 'Get help with AI Query Hub. Find answers, contact support, and access documentation.'),
    keywords: ['support', 'help', 'documentation', 'customer service', 'FAQ'],
    priority: 0.7,
    changefreq: 'monthly'
  },

  '/terms': {
    path: '/terms',
    ...createPageSEO('Terms of Service', 'Read the AI Query Hub Terms of Service and user agreement.'),
    keywords: ['terms of service', 'user agreement', 'legal', 'conditions'],
    priority: 0.5,
    changefreq: 'yearly'
  },

  '/privacy': {
    path: '/privacy',
    ...createPageSEO('Privacy Policy', 'Learn how AI Query Hub protects your privacy and handles your data securely.'),
    keywords: ['privacy policy', 'data protection', 'privacy', 'security'],
    priority: 0.6,
    changefreq: 'yearly'
  },

  '/disclaimer': {
    path: '/disclaimer',
    ...createPageSEO('Disclaimer', 'Important disclaimers and limitations regarding AI Query Hub services.'),
    keywords: ['disclaimer', 'legal notice', 'limitations'],
    priority: 0.4,
    changefreq: 'yearly'
  },

  '/data-policy': {
    path: '/data-policy',
    ...createPageSEO('Data Policy', 'Understanding how AI Query Hub collects, uses, and protects your data.'),
    keywords: ['data policy', 'data handling', 'information security'],
    priority: 0.5,
    changefreq: 'yearly'
  },

  '/acceptable-use': {
    path: '/acceptable-use',
    ...createPageSEO('Acceptable Use Policy', 'Guidelines for appropriate use of AI Query Hub services and features.'),
    keywords: ['acceptable use', 'usage policy', 'guidelines'],
    priority: 0.4,
    changefreq: 'yearly'
  },

  // Admin Routes (noindex for privacy)
  '/admin': {
    path: '/admin',
    ...createPageSEO('Admin Dashboard', 'AI Query Hub administrative dashboard and management tools.'),
    noindex: true,
    nofollow: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  '/admin/invites': {
    path: '/admin/invites',
    ...createPageSEO('Admin - Customer Invites', 'Manage customer invitations and user onboarding.'),
    noindex: true,
    nofollow: true,
    priority: 0.1,
    changefreq: 'weekly'
  },

  '/admin/support-tickets': {
    path: '/admin/support-tickets',
    ...createPageSEO('Admin - Support Tickets', 'Manage customer support tickets and service requests.'),
    noindex: true,
    nofollow: true,
    priority: 0.1,
    changefreq: 'daily'
  },

  // Demo & Testing
  '/mobile-demo': {
    path: '/mobile-demo',
    ...createPageSEO('Mobile Demo', 'Experience AI Query Hub features optimized for mobile devices.'),
    noindex: true,
    priority: 0.3,
    changefreq: 'monthly'
  },

  '/pitch-deck': {
    path: '/pitch-deck',
    ...createPageSEO('Pitch Deck', 'AI Query Hub product presentation and feature overview.'),
    noindex: true,
    priority: 0.2,
    changefreq: 'monthly'
  }
};

/**
 * Get SEO configuration for a specific route
 */
export const getSEOForRoute = (pathname: string): RouteMetaData | null => {
  // Handle dynamic routes (e.g., /book/:slug, /accept-invite/:token)
  const normalizedPath = pathname.replace(/\/[^\/]+$/, (match) => {
    if (pathname.startsWith('/book/')) return '/:slug';
    if (pathname.startsWith('/accept-invite/')) return '/:token';
    return match;
  });

  return routeSEOConfig[normalizedPath] || routeSEOConfig[pathname] || null;
};

/**
 * Get all routes for sitemap generation
 */
export const getAllRoutesForSitemap = (): RouteMetaData[] => {
  return Object.values(routeSEOConfig)
    .filter(route => !route.noindex) // Exclude noindex routes from sitemap
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)); // Sort by priority
};

/**
 * Default fallback SEO for routes not configured
 */
export const getDefaultSEO = (pathname: string): RouteMetaData => ({
  path: pathname,
  title: 'AI Query Hub - An AI Assistant That Remembers Everything',
  description: 'Connect your documents and chat naturally with an AI assistant that never forgets. Perfect memory, infinite knowledge.',
  keywords: ['AI assistant', 'productivity', 'artificial intelligence'],
  ogType: 'website',
  priority: 0.5,
  changefreq: 'monthly'
});