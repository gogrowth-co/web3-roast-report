import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Matches the UUID check analyze-web3/utils.ts already applies to roastId
// elsewhere in this codebase. Required here, strictly, before roastId is
// interpolated into a PostgREST query string: an unvalidated value can
// inject extra query params (e.g. a crafted `select=` that aliases a known
// column to `session_id`), defeating the ownership check below entirely.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Anonymous visitors have no JWT the anonymous_roasts SELECT policy can
 * check against (claimed_by_user_id = auth.uid(), which is null for every
 * unauthenticated request using the shared public anon key -- see
 * migration 20260422150749). Rather than weaken that policy, this function
 * runs with the service-role key and does the ownership check itself:
 * session_id must match what's stored on the row. This is the same check
 * analyze-web3 already does before it will process a roast; this function
 * exists so the *results page* can poll status/results for a roast it
 * doesn't own via a JWT, without ever exposing another visitor's row.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roastId, sessionId, leadToken } = await req.json();

    // Ownership is proven by the browser's session id, or by the lead token
    // from the report email (capture-lead), which works on any device.
    if (!roastId || (!sessionId && !leadToken)) {
      return new Response(
        JSON.stringify({ error: 'Missing roastId or sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof roastId !== 'string' || !UUID_REGEX.test(roastId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid roastId format. Expected UUID.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (sessionId != null && typeof sessionId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables not configured');
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/anonymous_roasts?id=eq.${encodeURIComponent(roastId)}&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch roast: ${await response.text()}`);
    }

    const rows = await response.json();
    const row = rows[0];

    // Same "not found" response whether the row doesn't exist or the
    // session doesn't match -- don't reveal that a given id exists to a
    // visitor who can't prove ownership of it.
    // Leads for this roast: any lead unlocks the full report, and a matching
    // lead token stands in for the session id.
    let leadTokens: string[] = [];
    if (row) {
      const leadsResponse = await fetch(
        `${supabaseUrl}/rest/v1/roast_leads?anonymous_roast_id=eq.${encodeURIComponent(roastId)}&select=token`,
        { headers: { 'Authorization': `Bearer ${supabaseKey}`, 'apikey': supabaseKey } }
      );
      if (leadsResponse.ok) {
        leadTokens = (await leadsResponse.json()).map((l: { token: string }) => l.token);
      } else {
        // A visitor relying on the lead token must not get a false "not
        // found" from a transient read error; let them retry instead.
        const detail = await leadsResponse.text();
        if (leadToken) throw new Error(`Failed to read leads: ${detail}`);
        console.error('Failed to read leads (non-fatal):', detail);
      }
    }
    const ownsBySession = !!row && typeof sessionId === 'string' && row.session_id === sessionId;
    const ownsByToken = !!row && typeof leadToken === 'string' && leadToken.length > 0 && leadTokens.includes(leadToken);

    if (!row || (!ownsBySession && !ownsByToken)) {
      return new Response(
        JSON.stringify({ error: 'Roast not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // session_id is the browser's bearer secret for this row; a visitor who
    // got in by lead token gets the report, not the other browser's id.
    const { session_id: _sessionId, ...publicRow } = row;
    const roast = ownsBySession ? row : publicRow;

    return new Response(JSON.stringify({ roast, unlocked: leadTokens.length > 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-anonymous-roast:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
