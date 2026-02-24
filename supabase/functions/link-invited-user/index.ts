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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { session },
      error: sessionError,
    } = await supabaseUser.auth.getSession()
    if (sessionError || !session?.user) {
      return Response.json({ error: 'Invalid or missing session' }, { status: 401, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const personId = body?.person_id
    if (!personId || typeof personId !== 'string') {
      return Response.json({ error: 'person_id required' }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: person, error: personError } = await supabaseAdmin
      .from('people')
      .select('id, household_id, email, role')
      .eq('id', personId)
      .single()

    if (personError || !person) {
      return Response.json({ error: 'Person not found' }, { status: 404, headers: corsHeaders })
    }

    const userEmail = (session.user.email ?? '').trim().toLowerCase()
    const personEmail = (person.email ?? '').trim().toLowerCase()
    if (userEmail !== personEmail) {
      return Response.json({ error: 'Email does not match invited person' }, { status: 403, headers: corsHeaders })
    }

    await supabaseAdmin.from('people').update({ user_id: session.user.id }).eq('id', personId)

    await supabaseAdmin.from('profiles').upsert(
      {
        id: session.user.id,
        household_id: person.household_id,
        role: person.role,
      },
      { onConflict: 'id' }
    )

    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (err) {
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: corsHeaders }
    )
  }
})
