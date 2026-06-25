/**
 * Hook for detecting and logging AI crawler visits
 * Automatically detects if the current visitor is an AI bot and logs to Supabase
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface CrawlerLogData {
  path: string;
  userAgent: string;
  referer?: string;
  statusCode?: number;
}

/**
 * Calls the AI crawler logger Edge Function
 */
async function logCrawlerVisit(data: CrawlerLogData) {
  try {
    const { data: result, error } = await supabase.functions.invoke('ai-crawler-logger', {
      body: data
    });

    if (error) {
      console.error('AI Crawler Logger Error:', error);
      return false;
    }

    if (result?.logged) {
      console.log(`AI Crawler detected: ${result.botName} visited ${data.path}`);
    }

    return result?.logged || false;
  } catch (error) {
    console.error('Failed to log AI crawler visit:', error);
    return false;
  }
}

/**
 * Detects if current visitor is an AI bot (client-side check for immediate feedback)
 */
function isLikelyAIBot(): boolean {
  if (typeof window === 'undefined') return false;

  const userAgent = navigator.userAgent;
  const botPatterns = [
    /GPTBot/i,
    /ClaudeBot/i,
    /PerplexityBot/i,
    /anthropic-ai/i,
    /cohere-ai/i,
    /Googlebot/i,
    /Bingbot/i,
    /facebookexternalhit/i,
    /Twitterbot/i,
    /LinkedInBot/i,
    /ChatGPT-User/i,
    /CCBot/i,
    /Claude-Web/i
  ];

  return botPatterns.some(pattern => pattern.test(userAgent));
}

/**
 * Hook that automatically logs AI crawler visits
 * Call this in your main App component or layout to track all page visits
 */
export function useAICrawlerLogger() {
  const location = useLocation();

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Quick client-side check to avoid unnecessary API calls
    if (!isLikelyAIBot()) return;

    const logVisit = async () => {
      const crawlerData: CrawlerLogData = {
        path: location.pathname + location.search,
        userAgent: navigator.userAgent,
        referer: document.referrer || undefined,
        statusCode: 200
      };

      await logCrawlerVisit(crawlerData);
    };

    // Delay slightly to ensure page is loaded
    const timeoutId = setTimeout(logVisit, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname, location.search]);

  return {
    isLikelyAIBot: isLikelyAIBot(),
    logCrawlerVisit // Export function for manual logging if needed
  };
}

/**
 * Standalone function to log AI crawler visits manually
 * Use this for API routes or when you need manual control
 */
export async function logAICrawlerVisit(
  path: string,
  statusCode: number = 200,
  customUserAgent?: string
) {
  if (typeof window === 'undefined') return false;

  const crawlerData: CrawlerLogData = {
    path,
    userAgent: customUserAgent || navigator.userAgent,
    referer: document.referrer || undefined,
    statusCode
  };

  return await logCrawlerVisit(crawlerData);
}