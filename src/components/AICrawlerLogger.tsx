/**
 * AI Crawler Logger Component
 * Automatically detects and logs AI crawler visits for AEO monitoring
 */

import { useAICrawlerLogger } from '@/hooks/useAICrawlerLogger';

export const AICrawlerLogger: React.FC = () => {
  // This hook automatically logs AI crawler visits on route changes
  useAICrawlerLogger();

  // This component doesn't render anything visible
  return null;
};

export default AICrawlerLogger;