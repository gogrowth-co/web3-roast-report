import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')

    const body = await req.json().catch(() => null)
    const roastId = body?.roastId
    const sessionId = body?.sessionId

    // Basic input validation: both must be non-empty strings, roastId must be uuid-like
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (
      typeof roastId !== 'string' ||
      typeof sessionId !== 'string' ||
      !uuidRegex.test(roastId) ||
      sessionId.length === 0 ||
      sessionId.length > 200
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the JWT signature using Supabase Auth (do NOT trust atob-decoded payload)
    const authClient = createClient(supabaseUrl, anonKey)
    const { data: userData, error: userError } = await authClient.auth.getUser(token)
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const userId = userData.user.id

    // Service-role client for the privileged work
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify the anonymous roast exists and matches session
    const { data: anonymousData, error: fetchError } = await supabase
      .from('anonymous_roasts')
      .select('*')
      .eq('id', roastId)
      .eq('session_id', sessionId)
      .single()

    if (fetchError || !anonymousData) {
      console.error('Anonymous roast not found:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Roast not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert into roasts table
    const { data: roastData, error: insertError } = await supabase
      .from('roasts')
      .insert({
        url: anonymousData.url,
        screenshot_url: anonymousData.screenshot_url,
        ai_analysis: anonymousData.ai_analysis,
        score: anonymousData.score,
        status: anonymousData.status,
        user_id: userId,
        created_at: anonymousData.created_at,
        completed_at: anonymousData.completed_at,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to claim roast:', insertError)
      return new Response(
        JSON.stringify({ error: 'Unable to claim roast. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Mark anonymous roast as claimed (best effort)
    const { error: updateError } = await supabase
      .from('anonymous_roasts')
      .update({ claimed_by_user_id: userId })
      .eq('id', roastId)

    if (updateError) {
      console.error('Failed to update anonymous roast:', updateError)
    }

    return new Response(
      JSON.stringify({ success: true, roastId: roastData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error claiming roast:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
