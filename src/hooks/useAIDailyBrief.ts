import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { format, startOfDay, endOfDay } from 'date-fns';

interface DailyBrief {
  id: string;
  brief_date: string;
  generated_at: string;
  priority_meetings: any[];
  key_decisions: any[];
  tasks_due_today: any[];
  schedule_overview: any[];
  ai_insights: string;
  ai_suggestions: any[];
  brief_html?: string;
  brief_markdown?: string;
  emailed: boolean;
  emailed_at?: string;
}

export function useAIDailyBrief(date: Date = new Date()) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [emailSending, setEmailSending] = useState(false);

  // Fetch existing brief for the date
  const fetchBrief = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const briefDate = format(date, 'yyyy-MM-dd');

      const { data, error: fetchError } = await supabase
        .from('daily_briefs')
        .select('*')
        .eq('user_id', user.id)
        .eq('brief_date', briefDate)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setBrief(data);
    } catch (err) {
      console.error('Error fetching brief:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [user, date]);

  // Generate new brief with AI
  const generateBrief = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const briefDate = format(date, 'yyyy-MM-dd');

      // Get raw data from the database
      const { data: briefData, error: dataError } = await supabase
        .rpc('get_daily_brief_data', {
          p_user_id: user.id,
          p_date: briefDate
        });

      if (dataError) throw dataError;

      // Call Edge Function to generate AI insights
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('generate-daily-brief', {
        body: {
          user_id: user.id,
          date: briefDate,
          raw_data: briefData
        }
      });

      if (aiError) throw aiError;

      // Combine data with AI insights
      const fullBrief = {
        user_id: user.id,
        brief_date: briefDate,
        priority_meetings: briefData.priority_meetings || [],
        key_decisions: aiResponse.key_decisions || [],
        tasks_due_today: briefData.tasks_due_today || [],
        schedule_overview: briefData.schedule_overview || [],
        ai_insights: aiResponse.insights || '',
        ai_suggestions: aiResponse.suggestions || [],
        brief_html: aiResponse.html,
        brief_markdown: aiResponse.markdown
      };

      // Save to database
      const { data: savedBrief, error: saveError } = await supabase
        .from('daily_briefs')
        .upsert(fullBrief, {
          onConflict: 'user_id,brief_date'
        })
        .select()
        .single();

      if (saveError) throw saveError;

      setBrief(savedBrief);

      toast({
        title: 'Brief Generated',
        description: 'Your daily brief has been created successfully.',
      });
    } catch (err) {
      console.error('Error generating brief:', err);
      setError(err as Error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to generate your daily brief. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, date, toast]);

  // Send brief via email
  const sendBriefEmail = useCallback(async () => {
    if (!user || !brief) return;

    try {
      setEmailSending(true);

      const { error: emailError } = await supabase.functions.invoke('send-daily-brief-email', {
        body: {
          user_id: user.id,
          brief_id: brief.id
        }
      });

      if (emailError) throw emailError;

      // Update brief as emailed
      const { error: updateError } = await supabase
        .from('daily_briefs')
        .update({
          emailed: true,
          emailed_at: new Date().toISOString()
        })
        .eq('id', brief.id);

      if (updateError) throw updateError;

      setBrief({
        ...brief,
        emailed: true,
        emailed_at: new Date().toISOString()
      });

      toast({
        title: 'Email Sent',
        description: 'Your daily brief has been sent to your email.',
      });
    } catch (err) {
      console.error('Error sending email:', err);
      toast({
        title: 'Email Failed',
        description: 'Failed to send your daily brief. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setEmailSending(false);
    }
  }, [user, brief, toast]);

  return {
    brief,
    loading,
    error,
    generateBrief,
    fetchBrief,
    sendBriefEmail,
    emailSending
  };
}
