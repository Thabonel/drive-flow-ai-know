/**
 * JSON-LD schema generators for structured data
 */

import { SchemaData, BreadcrumbItem } from '@/types/seo';

/**
 * Generate SoftwareApplication schema for AI Query Hub
 */
export const generateSoftwareApplicationSchema = (): SchemaData => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AI Query Hub',
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web Browser',
  description: 'An AI assistant that remembers everything. Connect your documents and chat naturally with perfect memory and infinite knowledge.',
  url: 'https://aiqueryhub.com',
  author: {
    '@type': 'Organization',
    name: 'AI Query Hub'
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: '14-day free trial available'
  },
  screenshot: 'https://aiqueryhub.com/og-image.png',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '100',
    bestRating: '5'
  },
  featureList: [
    'AI-powered document search',
    'Natural language conversations',
    'Perfect memory retention',
    'Google Drive integration',
    'Timeline management',
    'Team collaboration'
  ]
});

/**
 * Generate Organization schema
 */
export const generateOrganizationSchema = (): SchemaData => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AI Query Hub',
  url: 'https://aiqueryhub.com',
  logo: 'https://aiqueryhub.com/icon-512.png',
  description: 'AI-powered productivity platform that helps users organize, search, and interact with their documents using advanced artificial intelligence.',
  foundingDate: '2024',
  sameAs: [
    // Add social media URLs when available
    'https://twitter.com/aiqueryhub',
    'https://linkedin.com/company/aiqueryhub'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'support@aiqueryhub.com',
    availableLanguage: 'English'
  }
});

/**
 * Generate WebSite schema
 */
export const generateWebSiteSchema = (): SchemaData => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'AI Query Hub',
  url: 'https://aiqueryhub.com',
  description: 'An AI assistant that remembers everything. Perfect memory, infinite knowledge.',
  publisher: {
    '@type': 'Organization',
    name: 'AI Query Hub'
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://aiqueryhub.com/conversations?query={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
});

/**
 * Generate BreadcrumbList schema
 */
export const generateBreadcrumbSchema = (breadcrumbs: BreadcrumbItem[]): SchemaData => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.map((breadcrumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: breadcrumb.name,
    item: breadcrumb.url
  }))
});

/**
 * Generate FAQPage schema for support page
 */
export const generateFAQPageSchema = (): SchemaData => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does AI Query Hub remember everything?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI Query Hub uses advanced AI technology to create comprehensive summaries and indexes of your documents, conversations, and data. This creates a perfect memory system that never forgets important information.'
      }
    },
    {
      '@type': 'Question',
      name: 'Is my data secure with AI Query Hub?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes, security is our top priority. We use enterprise-grade encryption, secure cloud infrastructure, and never store your raw document content unnecessarily. Your data belongs to you.'
      }
    },
    {
      '@type': 'Question',
      name: 'Can I integrate with Google Drive and other services?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely! AI Query Hub integrates with Google Drive, Microsoft OneDrive, Dropbox, and other popular cloud storage services to seamlessly access your existing documents.'
      }
    },
    {
      '@type': 'Question',
      name: 'What makes AI Query Hub different from other AI assistants?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Unlike other AI assistants, AI Query Hub specializes in document intelligence and perfect memory. It can access, search, and reason about your entire document library while maintaining context across all conversations.'
      }
    },
    {
      '@type': 'Question',
      name: 'Is there a free trial available?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes! We offer a 14-day free trial with full access to all features. No credit card required to get started.'
      }
    }
  ]
});

/**
 * Generate WebApplication schema for specific features
 */
export const generateWebApplicationSchema = (name: string, description: string, url: string): SchemaData => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: `${name} | AI Query Hub`,
  description,
  url,
  applicationCategory: 'ProductivityApplication',
  operatingSystem: 'Web Browser',
  isPartOf: {
    '@type': 'WebSite',
    name: 'AI Query Hub',
    url: 'https://aiqueryhub.com'
  }
});

/**
 * Helper function to inject JSON-LD schema into document head
 */
export const injectSchema = (schema: SchemaData): void => {
  // Remove existing schema of the same type
  const existingSchema = document.querySelector(`script[type="application/ld+json"][data-schema-type="${schema['@type']}"]`);
  if (existingSchema) {
    existingSchema.remove();
  }

  // Create new schema script
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-schema-type', schema['@type']);
  script.textContent = JSON.stringify(schema, null, 2);

  document.head.appendChild(script);
};

/**
 * Remove schema from document head
 */
export const removeSchema = (schemaType: string): void => {
  const schema = document.querySelector(`script[type="application/ld+json"][data-schema-type="${schemaType}"]`);
  if (schema) {
    schema.remove();
  }
};

/**
 * Get current breadcrumbs from pathname
 */
export const generateBreadcrumbsFromPath = (pathname: string): BreadcrumbItem[] => {
  const pathSegments = pathname.split('/').filter(segment => segment);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: 'Home', url: 'https://aiqueryhub.com/', position: 1 }
  ];

  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Convert path segment to readable name
    const name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbs.push({
      name,
      url: `https://aiqueryhub.com${currentPath}`,
      position: index + 2
    });
  });

  return breadcrumbs;
};