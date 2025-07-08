import { supabase } from '@/integrations/supabase/client';

export function offlineEnabled() {
  return localStorage.getItem('offline-mode') === 'true' || !navigator.onLine;
}

export async function callLLM(prompt: string, knowledgeBaseId?: string): Promise<string> {
  if (!offlineEnabled()) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { query: prompt, knowledge_base_id: knowledgeBaseId }
      });
      if (!error && data?.response) return data.response;
    } catch (err) {
      console.warn('Online LLM call failed', err);
    }
  }

  const res = await fetch('http://localhost:11434', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Local LLM error');
  const data = await res.json();
  return data.response || '';
}
