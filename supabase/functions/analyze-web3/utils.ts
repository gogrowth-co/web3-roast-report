
// Shared utility functions and constants for the analyze-web3 edge function

// CORS headers used across the function
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Error handling for API responses
export async function handleErrorResponse(error: Error, req: Request): Promise<Response> {
  console.error('Error in analyze-web3 function:', error);
  
  let roastId: string | undefined;
  
  // Try to extract the roastId even if the request parsing fails
  try {
    const body = await req.clone().json();
    roastId = body.roastId;
  } catch (parseError) {
    console.error('Failed to parse request body:', parseError);
  }
  
  // Try to update the roast status to failed if possible (both tables)
  if (roastId) {
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseKey) {
        console.log("Updating roast status to failed for roastId:", roastId);
        const payload = {
          status: 'failed',
          error_message: (error.message || 'Unknown error').slice(0, 1000)
        };

        for (const table of ['roasts', 'anonymous_roasts']) {
          const res = await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${roastId}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'apikey': supabaseKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify(payload)
          });

          if (!res.ok) {
            // Last resort: never leave the row stuck on 'processing'
            console.error(`Failed to write error_message on ${table}:`, await res.text());
            await fetch(`${supabaseUrl}/rest/v1/${table}?id=eq.${roastId}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'apikey': supabaseKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({ status: 'failed' })
            });
          }
        }
      }
    } catch (updateError) {
      console.error('Failed to update roast status to failed:', updateError);
    }
  }

  
  return new Response(JSON.stringify({ 
    error: error.message || 'Unknown error',
    errorCode: error.name || 'UnknownError'
  }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Environment variable validation
export function validateEnvironmentVars(): {
  supabaseUrl: string,
  supabaseKey: string,
  screenshotApiKey: string,
  geminiApiKey?: string,
  geminiApiKey2?: string,
  openRouterApiKey?: string,
  firecrawlApiKey?: string,
  elfaApiKey?: string
} {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY')
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  const geminiApiKey2 = Deno.env.get('GEMINI_API_KEY_2')
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
  // Optional -- scrapeWebsiteContent falls back to a raw fetch if this is
  // unset or Firecrawl itself errors, same resilience pattern as the AI
  // provider chain below.
  const firecrawlApiKey = Deno.env.get('FIRECRAWL_API_KEY')
  // Optional -- GitHub enrichment works without it, social mindshare is
  // skipped if unset (fetchEnrichment checks for the key before calling).
  const elfaApiKey = Deno.env.get('ELFA_API_KEY')

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable not found');
  }

  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable not found');
  }

  if (!screenshotApiKey) {
    throw new Error('SCREENSHOT_API_KEY environment variable not found');
  }

  if (!geminiApiKey && !openRouterApiKey) {
    throw new Error('No AI provider key found. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
  }
  
  return { supabaseUrl, supabaseKey, screenshotApiKey, geminiApiKey, geminiApiKey2, openRouterApiKey, firecrawlApiKey, elfaApiKey };
}

// Validate request parameters
export function validateRequest(roastId: string): void {
  if (!roastId) {
    throw new Error('Missing roastId parameter');
  }
  
  // Check if roastId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roastId)) {
    throw new Error('Invalid roastId format. Expected UUID.');
  }
}

// Update roast status helper (supports both roasts and anonymous_roasts)
export async function updateRoastStatus(
  supabaseUrl: string, 
  supabaseKey: string, 
  roastId: string, 
  status: string, 
  additionalData?: Record<string, any>,
  isAnonymous: boolean = false
) {
  console.log(`Updating ${isAnonymous ? 'anonymous_roasts' : 'roasts'} status to '${status}' for roastId: ${roastId}`);
  
  const updateData = {
    status,
    ...additionalData
  };
  
  const tableName = isAnonymous ? 'anonymous_roasts' : 'roasts';
  
  const response = await fetch(`${supabaseUrl}/rest/v1/${tableName}?id=eq.${roastId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(updateData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update roast status: ${errorText}`);
  }
  
  return response;
}
