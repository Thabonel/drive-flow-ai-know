/**
 * Cleanup Temp Media - Deletes expired media files from storage
 * Triggered by cron every 6 hours
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find expired media documents
    const { data: expired, error: queryError } = await supabase
      .from('knowledge_documents')
      .select('id, storage_path, title')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (queryError) {
      throw new Error(`Query error: ${queryError.message}`);
    }

    if (!expired || expired.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No expired media to clean up', deleted: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expired.length} expired media files to delete`);

    let deletedFiles = 0;
    let deletedRecords = 0;

    // Delete storage files
    const storagePaths = expired
      .map(doc => doc.storage_path)
      .filter((path): path is string => !!path);

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('media-temp')
        .remove(storagePaths);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
      } else {
        deletedFiles = storagePaths.length;
      }
    }

    // Delete database records
    const ids = expired.map(doc => doc.id);
    const { error: deleteError } = await supabase
      .from('knowledge_documents')
      .delete()
      .in('id', ids);

    if (deleteError) {
      console.error('Record deletion error:', deleteError);
    } else {
      deletedRecords = ids.length;
    }

    const result = {
      message: `Cleanup complete`,
      expired_found: expired.length,
      files_deleted: deletedFiles,
      records_deleted: deletedRecords,
      timestamp: new Date().toISOString(),
    };

    console.log('Cleanup result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
