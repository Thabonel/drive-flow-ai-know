/**
 * Utility functions for meta tag manipulation
 */

import { MetaTag, OpenGraphData, TwitterCardData } from '@/types/seo';

/**
 * Updates document title
 */
export const updateTitle = (title: string): void => {
  document.title = title;
};

/**
 * Updates a meta tag by name or property
 */
export const updateMetaTag = (selector: string, content: string): void => {
  let meta = document.querySelector(selector) as HTMLMetaElement;

  if (meta) {
    meta.content = content;
  } else {
    // Create new meta tag if it doesn't exist
    meta = document.createElement('meta');

    if (selector.includes('property=')) {
      const property = selector.match(/property="([^"]+)"/)?.[1];
      if (property) meta.setAttribute('property', property);
    } else if (selector.includes('name=')) {
      const name = selector.match(/name="([^"]+)"/)?.[1];
      if (name) meta.setAttribute('name', name);
    }

    meta.content = content;
    document.head.appendChild(meta);
  }
};

/**
 * Updates canonical link
 */
export const updateCanonical = (url: string): void => {
  let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;

  if (canonical) {
    canonical.href = url;
  } else {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = url;
    document.head.appendChild(canonical);
  }
};

/**
 * Updates robots meta tag
 */
export const updateRobots = (noindex?: boolean, nofollow?: boolean): void => {
  const directives: string[] = [];

  if (noindex) directives.push('noindex');
  else directives.push('index');

  if (nofollow) directives.push('nofollow');
  else directives.push('follow');

  updateMetaTag('meta[name="robots"]', directives.join(', '));
};

/**
 * Updates Open Graph meta tags
 */
export const updateOpenGraph = (data: Partial<OpenGraphData>): void => {
  if (data.title) updateMetaTag('meta[property="og:title"]', data.title);
  if (data.description) updateMetaTag('meta[property="og:description"]', data.description);
  if (data.type) updateMetaTag('meta[property="og:type"]', data.type);
  if (data.url) updateMetaTag('meta[property="og:url"]', data.url);
  if (data.image) updateMetaTag('meta[property="og:image"]', data.image);
  if (data.siteName) updateMetaTag('meta[property="og:site_name"]', data.siteName);
  if (data.locale) updateMetaTag('meta[property="og:locale"]', data.locale);
};

/**
 * Updates Twitter Card meta tags
 */
export const updateTwitterCard = (data: Partial<TwitterCardData>): void => {
  if (data.card) updateMetaTag('meta[name="twitter:card"]', data.card);
  if (data.title) updateMetaTag('meta[name="twitter:title"]', data.title);
  if (data.description) updateMetaTag('meta[name="twitter:description"]', data.description);
  if (data.image) updateMetaTag('meta[name="twitter:image"]', data.image);
  if (data.site) updateMetaTag('meta[name="twitter:site"]', data.site);
  if (data.creator) updateMetaTag('meta[name="twitter:creator"]', data.creator);
};

/**
 * Updates basic meta description
 */
export const updateDescription = (description: string): void => {
  updateMetaTag('meta[name="description"]', description);
};

/**
 * Updates keywords meta tag
 */
export const updateKeywords = (keywords: string[]): void => {
  if (keywords.length > 0) {
    updateMetaTag('meta[name="keywords"]', keywords.join(', '));
  }
};

/**
 * Removes a meta tag
 */
export const removeMetaTag = (selector: string): void => {
  const meta = document.querySelector(selector);
  if (meta) {
    meta.remove();
  }
};

/**
 * Gets current page URL for canonical and OG tags
 */
export const getCurrentUrl = (): string => {
  return window.location.origin + window.location.pathname;
};

/**
 * Batch update multiple meta tags
 */
export const updateMetaTags = (tags: MetaTag[]): void => {
  tags.forEach(tag => {
    const selector = tag.name
      ? `meta[name="${tag.name}"]`
      : `meta[property="${tag.property}"]`;
    updateMetaTag(selector, tag.content);
  });
};