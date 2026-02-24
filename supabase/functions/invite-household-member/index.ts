import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ error: 'Missing authorization' }, { status: 401, headers: corsHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { session },
      error: sessionError,
    } = await supabaseUser.auth.getSession()
    if (sessionError || !session?.user) {
      return Response.json({ error: 'Invalid or missing session' }, { status: 401, headers: corsHeaders })
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('household_id')
      .eq('id', session.user.id)
      .single()
    if (!profile?.household_id) {
      return Response.json({ error: 'No household' }, { status: 403, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const personId = body?.person_id
    if (!personId || typeof personId !== 'string') {
      return Response.json({ error: 'person_id required' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('id, household_id, email, user_id')
      .eq('id', personId)
      .single()

    if (personError || !person) {
      return Response.json({ error: 'Person not found' }, { status: 404, headers: corsHeaders })
    }
    if (person.household_id !== profile.household_id) {
      return Response.json({ error: 'Not in same household' }, { status: 403, headers: corsHeaders })
    }
    if (person.user_id) {
      return Response.json({ error: 'Already invited or signed in' }, { status: 400, headers: corsHeaders })
    }
    if (!person.email?.trim()) {
      return Response.json({ error: 'Person has no email' }, { status: 400, headers: corsHeaders })
    }

    const origin = req.headers.get('origin') || req.headers.get('referer')?.replace(/\/$/, '') || ''
    const redirectTo = origin ? `${origin}/link-account?person_id=${personId}` : undefined

    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(person.email.trim(), {
      data: { person_id: personId },
      redirectTo,
    })

    if (inviteError) {
      return Response.json(
        { error: inviteError.message || 'Failed to send invite' },
        { status: 400, headers: corsHeaders }
      )
    }

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: corsHeaders }
    )
  }
})
