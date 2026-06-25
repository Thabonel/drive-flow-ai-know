/**
 * Custom React hook for dynamic SEO management
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SEOData } from '@/types/seo';
import {
  updateTitle,
  updateDescription,
  updateKeywords,
  updateCanonical,
  updateRobots,
  updateOpenGraph,
  updateTwitterCard,
  getCurrentUrl
} from '@/lib/seo/meta';

/**
 * Hook for managing SEO data dynamically
 */
export const useSEO = (seoData: Partial<SEOData>) => {
  const location = useLocation();

  useEffect(() => {
    // Update document title
    if (seoData.title) {
      updateTitle(seoData.title);
    }

    // Update meta description
    if (seoData.description) {
      updateDescription(seoData.description);
    }

    // Update keywords
    if (seoData.keywords && seoData.keywords.length > 0) {
      updateKeywords(seoData.keywords);
    }

    // Update canonical URL
    const canonicalUrl = seoData.canonical || getCurrentUrl();
    updateCanonical(canonicalUrl);

    // Update robots directives
    updateRobots(seoData.noindex, seoData.nofollow);

    // Update Open Graph tags
    updateOpenGraph({
      title: seoData.title || document.title,
      description: seoData.description || '',
      type: seoData.ogType || 'website',
      url: canonicalUrl,
      image: seoData.ogImage,
      siteName: 'AI Query Hub',
      locale: 'en_US'
    });

    // Update Twitter Card tags
    updateTwitterCard({
      card: seoData.twitterCard || 'summary_large_image',
      title: seoData.title || document.title,
      description: seoData.description || '',
      image: seoData.ogImage,
      site: '@aiqueryhub' // Update with actual Twitter handle if available
    });

  }, [seoData, location.pathname]);

  // Return the current SEO data for debugging
  return {
    title: seoData.title,
    description: seoData.description,
    canonical: seoData.canonical || getCurrentUrl(),
    pathname: location.pathname
  };
};

/**
 * Default SEO configuration
 */
export const defaultSEO: SEOData = {
  title: 'AI Query Hub - An AI Assistant That Remembers Everything',
  description: 'Connect your documents and chat naturally with an AI assistant that never forgets. Perfect memory, infinite knowledge. 14-day free trial.',
  keywords: ['AI assistant', 'productivity', 'document search', 'artificial intelligence', 'knowledge management'],
  ogImage: '/og-image.png',
  ogType: 'website',
  twitterCard: 'summary_large_image'
};

/**
 * Helper function to create page-specific SEO data
 */
export const createPageSEO = (
  title: string,
  description: string,
  options: Partial<SEOData> = {}
): SEOData => ({
  title: `${title} | AI Query Hub`,
  description,
  ogImage: '/og-image.png',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  ...options
});