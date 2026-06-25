/**
 * Main SEO component that automatically manages SEO based on current route
 */

import { useLocation } from 'react-router-dom';
import { useSEO, defaultSEO } from '@/hooks/useSEO';
import { getSEOForRoute, getDefaultSEO } from '@/lib/seo/config';
import SchemaMarkup from './SchemaMarkup';

export const SEOHead: React.FC = () => {
  const location = useLocation();

  // Get SEO configuration for current route
  const routeSEO = getSEOForRoute(location.pathname);
  const seoData = routeSEO || getDefaultSEO(location.pathname);

  // Apply SEO data using the hook
  useSEO({
    title: seoData.title,
    description: seoData.description,
    keywords: seoData.keywords,
    canonical: seoData.canonical,
    noindex: seoData.noindex,
    nofollow: seoData.nofollow,
    ogImage: seoData.ogImage || defaultSEO.ogImage,
    ogType: seoData.ogType || 'website',
    twitterCard: seoData.twitterCard || 'summary_large_image'
  });

  // This component doesn't render anything visible - it manages the document head
  return <SchemaMarkup />;
};

export default SEOHead;