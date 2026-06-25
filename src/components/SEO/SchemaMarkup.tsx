/**
 * Schema markup component for injecting JSON-LD structured data
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  generateSoftwareApplicationSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateFAQPageSchema,
  generateWebApplicationSchema,
  generateBreadcrumbsFromPath,
  generateBreadcrumbSchema,
  injectSchema
} from '@/lib/seo/schema';

interface SchemaMarkupProps {
  /** Override default schema injection */
  customSchemas?: any[];
  /** Disable specific schema types */
  disableSchemas?: string[];
}

export const SchemaMarkup: React.FC<SchemaMarkupProps> = ({
  customSchemas = [],
  disableSchemas = []
}) => {
  const location = useLocation();

  useEffect(() => {
    // Clean up existing schemas
    const existingSchemas = document.querySelectorAll('script[type="application/ld+json"]');
    existingSchemas.forEach(schema => {
      const schemaType = schema.getAttribute('data-schema-type');
      if (schemaType && !disableSchemas.includes(schemaType)) {
        schema.remove();
      }
    });

    // Inject global schemas (on all pages)
    if (!disableSchemas.includes('Organization')) {
      injectSchema(generateOrganizationSchema());
    }

    if (!disableSchemas.includes('WebSite')) {
      injectSchema(generateWebSiteSchema());
    }

    // Page-specific schemas based on route
    const pathname = location.pathname;

    // Homepage schemas
    if (pathname === '/') {
      if (!disableSchemas.includes('SoftwareApplication')) {
        injectSchema(generateSoftwareApplicationSchema());
      }
    }

    // Support page FAQ schema
    if (pathname === '/support') {
      if (!disableSchemas.includes('FAQPage')) {
        injectSchema(generateFAQPageSchema());
      }
    }

    // Feature page schemas
    const featurePages = {
      '/conversations': {
        name: 'AI Conversations',
        description: 'Chat with your AI assistant about any topic with perfect memory retention'
      },
      '/documents': {
        name: 'Document Management',
        description: 'Organize and search through your documents with AI-powered intelligence'
      },
      '/timeline': {
        name: 'Timeline Management',
        description: 'Manage your productivity timeline with AI-powered insights and task organization'
      },
      '/knowledge': {
        name: 'Knowledge Bases',
        description: 'Create and manage AI-powered knowledge bases from your documents'
      }
    };

    const featurePage = featurePages[pathname as keyof typeof featurePages];
    if (featurePage && !disableSchemas.includes('WebApplication')) {
      injectSchema(generateWebApplicationSchema(
        featurePage.name,
        featurePage.description,
        `https://aiqueryhub.com${pathname}`
      ));
    }

    // Breadcrumb schema for nested pages
    if (pathname !== '/' && !disableSchemas.includes('BreadcrumbList')) {
      const breadcrumbs = generateBreadcrumbsFromPath(pathname);
      if (breadcrumbs.length > 1) {
        injectSchema(generateBreadcrumbSchema(breadcrumbs));
      }
    }

    // Inject custom schemas
    customSchemas.forEach(schema => {
      if (schema && !disableSchemas.includes(schema['@type'])) {
        injectSchema(schema);
      }
    });

  }, [location.pathname, customSchemas, disableSchemas]);

  // This component doesn't render anything visible
  return null;
};

export default SchemaMarkup;