import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface SecurityIncident {
  type: 'BRUTE_FORCE_ATTEMPT' | 'SUSPICIOUS_ACCESS' | 'RATE_LIMIT_EXCEEDED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  user_id?: string;
  ip_address: string;
  detected_at: string;
  details?: Record<string, any>;
  status: 'ACTIVE' | 'RESOLVED' | 'FALSE_POSITIVE';
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(
      supabaseUrl,
      supabaseServiceRoleKey,
      {
        auth: { persistSession: false }
      }
    );

    // Get current time for lookback window (1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    console.log(`Starting incident detection scan at ${new Date().toISOString()}`);
    console.log(`Looking for incidents since: ${oneHourAgo}`);

    // Fetch failed login attempts from last hour
    const { data: failedLogins, error: fetchError } = await supabase
      .from('compliance_audit_log')
      .select('*')
      .eq('action', 'LOGIN_FAILED')
      .gte('timestamp', oneHourAgo)
      .order('timestamp', { ascending: false });

    if (fetchError) {
      console.error('Error fetching audit logs:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audit logs', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${failedLogins?.length || 0} failed login attempts in last hour`);

    if (!failedLogins || failedLogins.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No incidents detected',
          scanned_period: oneHourAgo,
          failed_logins_found: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Group by IP address to detect brute force patterns
    const ipFailureCounts = new Map<string, any[]>();

    for (const login of failedLogins) {
      const ip = login.ip_address || 'unknown';
      if (!ipFailureCounts.has(ip)) {
        ipFailureCounts.set(ip, []);
      }
      ipFailureCounts.get(ip)!.push(login);
    }

    console.log(`Grouped failures by IP address. Found ${ipFailureCounts.size} unique IPs`);

    const incidentsCreated: SecurityIncident[] = [];

    // Check for brute force attempts (6+ failures from same IP)
    for (const [ip, failures] of ipFailureCounts.entries()) {
      console.log(`IP ${ip}: ${failures.length} failed attempts`);

      if (failures.length >= 6 && ip !== 'unknown') {
        console.log(`🚨 BRUTE FORCE DETECTED: IP ${ip} with ${failures.length} failed attempts`);

        // Check if we already have an active incident for this IP
        const { data: existingIncidents } = await supabase
          .from('security_incidents')
          .select('id')
          .eq('type', 'BRUTE_FORCE_ATTEMPT')
          .eq('ip_address', ip)
          .eq('status', 'ACTIVE')
          .gte('detected_at', oneHourAgo);

        if (existingIncidents && existingIncidents.length > 0) {
          console.log(`Skipping duplicate incident for IP ${ip} - already has active incident`);
          continue;
        }

        // Create security incident
        const incident: Omit<SecurityIncident, 'id'> = {
          type: 'BRUTE_FORCE_ATTEMPT',
          severity: 'HIGH',
          ip_address: ip,
          detected_at: new Date().toISOString(),
          status: 'ACTIVE',
          details: {
            failure_count: failures.length,
            first_attempt: failures[failures.length - 1]?.timestamp,
            last_attempt: failures[0]?.timestamp,
            affected_user_ids: [...new Set(failures.map(f => f.user_id).filter(Boolean))],
            detection_method: 'automated_brute_force_detection',
            threshold: 6
          }
        };

        // Insert incident into database
        const { data: insertedIncident, error: insertError } = await supabase
          .from('security_incidents')
          .insert(incident)
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create security incident:', insertError);
        } else {
          console.log(`✅ Created security incident ID: ${insertedIncident.id}`);
          incidentsCreated.push(insertedIncident);

          // Log the incident creation to audit trail
          await supabase
            .from('compliance_audit_log')
            .insert({
              user_id: null,
              action: 'SECURITY_INCIDENT_CREATED',
              category: 'security',
              timestamp: new Date().toISOString(),
              ip_address: ip,
              user_agent: 'incident-detector-function',
              additional_metadata: {
                incident_id: insertedIncident.id,
                incident_type: incident.type,
                severity: incident.severity,
                detection_method: 'automated'
              }
            });
        }
      }
    }

    const response = {
      message: incidentsCreated.length > 0 ? 'Security incidents detected and created' : 'No incidents detected',
      incidents_created: incidentsCreated.length,
      incidents: incidentsCreated.map(i => ({
        id: i.id,
        type: i.type,
        severity: i.severity,
        ip_address: i.ip_address,
        detected_at: i.detected_at
      })),
      scanned_period: oneHourAgo,
      failed_logins_analyzed: failedLogins.length,
      unique_ips_analyzed: ipFailureCounts.size
    };

    console.log('Detection scan complete:', response);

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Incident detection error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});