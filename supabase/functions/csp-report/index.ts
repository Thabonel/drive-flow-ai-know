import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CSPViolationReport {
  'document-uri': string;
  referrer: string;
  'violated-directive': string;
  'effective-directive': string;
  'original-policy': string;
  disposition: string;
  'blocked-uri': string;
  'line-number': number;
  'column-number': number;
  'source-file': string;
  'status-code': number;
  'script-sample': string;
}

interface CSPReportWrapper {
  'csp-report': CSPViolationReport;
}

serve(async (req: Request) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse CSP violation report
    const reportWrapper: CSPReportWrapper = await req.json();
    const report = reportWrapper['csp-report'];

    if (!report) {
      return new Response(
        JSON.stringify({ error: 'Invalid CSP report format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('CSP Violation Report:', {
      directive: report['violated-directive'],
      blockedUri: report['blocked-uri'],
      documentUri: report['document-uri'],
      sourceFile: report['source-file']
    });

    // Store CSP violation in compliance audit log
    const auditEntry = {
      user_id: null, // CSP violations may not be tied to a specific user
      action: 'CSP_VIOLATION',
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      additional_metadata: {
        violated_directive: report['violated-directive'],
        effective_directive: report['effective-directive'],
        blocked_uri: report['blocked-uri'],
        document_uri: report['document-uri'],
        source_file: report['source-file'],
        line_number: report['line-number'],
        column_number: report['column-number'],
        script_sample: report['script-sample'],
        referrer: report.referrer,
        original_policy: report['original-policy'],
        disposition: report.disposition
      }
    };

    // Insert audit entry
    const { error: insertError } = await supabase
      .from('compliance_audit_log')
      .insert(auditEntry);

    if (insertError) {
      console.error('Error storing CSP violation:', insertError);
      throw insertError;
    }

    // Check if this is a high-severity violation that needs immediate attention
    const highSeverityDirectives = [
      'script-src',
      'script-src-elem',
      'script-src-attr',
      'object-src'
    ];

    const isHighSeverity = highSeverityDirectives.some(directive =>
      report['violated-directive'].includes(directive)
    );

    if (isHighSeverity) {
      console.warn('HIGH SEVERITY CSP VIOLATION:', {
        directive: report['violated-directive'],
        blockedUri: report['blocked-uri'],
        documentUri: report['document-uri']
      });

      // TODO: In production, could send alert to security team
      // await sendSecurityAlert('CSP_VIOLATION_HIGH_SEVERITY', auditEntry);
    }

    console.log('CSP violation logged successfully');

    // Return 204 No Content as per CSP specification
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });

  } catch (error) {
    console.error('CSP report error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

export default serve;