
// Shared utility functions and constants for the analyze-web3 edge function

// CORS headers used across the function
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Error handling for API responses
export async function handleErrorResponse(error: Error, req: Request): Promise<Response> {
  console.error('Error in analyze-web3 function:', error);
  
  // Try to update the roast status to failed if possible
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { roastId } = await req.json();
    
    if (supabaseUrl && supabaseKey && roastId) {
      console.log("Updating roast status to failed for roastId:", roastId);
      await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'failed',
          error_message: error.message || 'Unknown error'
        })
      });
    }
  } catch (updateError) {
    console.error('Failed to update roast status to failed:', updateError);
  }
  
  return new Response(JSON.stringify({ error: error.message || 'Unknown error' }), {
    status: 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Environment variable validation
export function validateEnvironmentVars(): { 
  supabaseUrl: string, 
  supabaseKey: string, 
  screenshotApiKey: string,
  openAIApiKey: string 
} {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const screenshotApiKey = Deno.env.get('SCREENSHOT_API_KEY')
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY')

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase configuration');
    throw new Error('Supabase configuration not found');
  }

  if (!screenshotApiKey) {
    console.error('Screenshot API key not configured');
    throw new Error('Screenshot API key not configured');
  }

  if (!openAIApiKey) {
    console.error('OpenAI API key not configured');
    throw new Error('OpenAI API key not configured');
  }
  
  return { supabaseUrl, supabaseKey, screenshotApiKey, openAIApiKey };
}

// Update roast status helper
export async function updateRoastStatus(
  supabaseUrl: string, 
  supabaseKey: string, 
  roastId: string, 
  status: string, 
  additionalData?: Record<string, any>
) {
  console.log(`Updating roast status to '${status}' for roastId: ${roastId}`);
  
  const updateData = {
    status,
    ...additionalData
  };
  
  const response = await fetch(`${supabaseUrl}/rest/v1/roasts?id=eq.${roastId}`, {
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
