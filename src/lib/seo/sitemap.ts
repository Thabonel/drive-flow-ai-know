/**
 * Sitemap generation logic for build-time XML sitemap creation
 */

import { getAllRoutesForSitemap } from './config';

/**
 * Generate XML sitemap content
 */
export const generateSitemap = (baseUrl: string = 'https://aiqueryhub.com'): string => {
  const routes = getAllRoutesForSitemap();
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  const urlEntries = routes.map(route => {
    const url = `${baseUrl}${route.path}`;
    const priority = route.priority || 0.5;
    const changefreq = route.changefreq || 'monthly';

    return `  <url>
    <loc>${url}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
};

/**
 * Generate robots.txt with sitemap reference
 */
export const generateRobotsTxt = (baseUrl: string = 'https://aiqueryhub.com'): string => {
  return `User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml`;
};

/**
 * Write sitemap to file (for build scripts)
 */
export const writeSitemapFile = (outputPath: string, baseUrl?: string): void => {
  const fs = require('fs');
  const sitemapContent = generateSitemap(baseUrl);

  try {
    fs.writeFileSync(outputPath, sitemapContent, 'utf8');
    console.log(`✅ Sitemap generated successfully at: ${outputPath}`);
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    throw error;
  }
};

/**
 * Development helper to preview sitemap
 */
export const previewSitemap = (): void => {
  console.log('🗺️  Sitemap Preview:');
  console.log(generateSitemap());
};