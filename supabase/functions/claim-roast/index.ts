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
    const { roastId, sessionId } = await req.json()
    
    console.log('Claiming roast:', { roastId, sessionId })
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    // Get Supabase env vars
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Verify the anonymous roast exists and matches session
    const { data: anonymousData, error: fetchError } = await supabase
      .from('anonymous_roasts')
      .select('*')
      .eq('id', roastId)
      .eq('session_id', sessionId)
      .single()
    
    if (fetchError || !anonymousData) {
      console.error('Anonymous roast not found:', fetchError)
      throw new Error('Anonymous roast not found or session mismatch')
    }
    
    console.log('Found anonymous roast:', anonymousData)
    
    // Get authenticated user ID from JWT
    const jwt = authHeader.replace('Bearer ', '')
    const jwtPayload = JSON.parse(atob(jwt.split('.')[1]))
    const userId = jwtPayload.sub
    
    console.log('User ID from JWT:', userId)
    
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
        completed_at: anonymousData.completed_at
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Failed to claim roast:', insertError)
      throw new Error('Failed to claim roast: ' + insertError.message)
    }
    
    console.log('Successfully created roast for user:', roastData)
    
    // Update anonymous_roasts to mark as claimed
    const { error: updateError } = await supabase
      .from('anonymous_roasts')
      .update({ claimed_by_user_id: userId })
      .eq('id', roastId)
    
    if (updateError) {
      console.error('Failed to update anonymous roast:', updateError)
      // Don't throw, as the roast was already claimed successfully
    }
    
    return new Response(
      JSON.stringify({ success: true, roastId: roastData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error claiming roast:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})