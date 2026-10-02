import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { resultEmail, sendEmail } from '../_shared/email.ts'

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
    // Already claimed by this user (double call, retry, two tabs): hand back
    // the existing roast instead of inserting a duplicate and re-emailing.
    if (anonymousData.claimed_by_user_id === userId) {
      const { data: existing } = await supabase
        .from('roasts')
        .select('id')
        .eq('user_id', userId)
        .eq('url', anonymousData.url)
        .eq('created_at', anonymousData.created_at)
        .limit(1)
        .maybeSingle()
      if (existing?.id) {
        return new Response(
          JSON.stringify({ success: true, roastId: existing.id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

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

    // Result delivery: the signup is the moment to hand over what they came
    // for. Fire-and-forget in spirit (never fails the claim); the idempotency
    // key on the anonymous roast id makes a repeated claim call safe.
    try {
      const email = userData.user.email
      if (email && anonymousData.status === 'completed') {
        const analysis = typeof anonymousData.ai_analysis === 'string'
          ? JSON.parse(anonymousData.ai_analysis)
          : anonymousData.ai_analysis
        const mail = resultEmail({ url: anonymousData.url, analysis, roastId: roastData.id })
        await sendEmail({ to: email, ...mail, idempotencyKey: `result-email:${roastId}` })
      }
    } catch (mailError) {
      console.error('Result email failed (non-fatal):', mailError)
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
