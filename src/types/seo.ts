/**
 * TypeScript interfaces for SEO data structures
 */

export interface SEOData {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product' | 'profile';
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  schema?: Record<string, any>[];
}

export interface RouteMetaData extends SEOData {
  path: string;
  priority?: number; // For sitemap generation
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

export interface OpenGraphData {
  title: string;
  description: string;
  type: 'website' | 'article' | 'product' | 'profile';
  url: string;
  image?: string;
  siteName?: string;
  locale?: string;
}

export interface TwitterCardData {
  card: 'summary' | 'summary_large_image' | 'app' | 'player';
  title: string;
  description: string;
  image?: string;
  site?: string;
  creator?: string;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
  position: number;
}

export interface SchemaData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}