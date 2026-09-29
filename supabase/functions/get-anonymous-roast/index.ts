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
    const { roastId, sessionId } = await req.json();

    if (!roastId || !sessionId) {
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

    if (typeof sessionId !== 'string') {
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
    if (!row || row.session_id !== sessionId) {
      return new Response(
        JSON.stringify({ error: 'Roast not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ roast: row }), {
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
