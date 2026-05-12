import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch all coordinator role rows
    const { data: roles, error: rErr } = await supabase
      .from('user_roles')
      .select('user_id, program_id')
      .eq('role', 'coordinator')

    if (rErr) throw rErr

    const userIds = [...new Set((roles ?? []).map((r) => r.user_id))]
    if (userIds.length === 0) {
      return json({ success: true, sent: 0, message: 'No coordinators found' })
    }

    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
    if (pErr) throw pErr

    // Fetch programs map
    const programIds = [...new Set((roles ?? []).map((r) => r.program_id).filter(Boolean))]
    const programMap = new Map<string, string>()
    if (programIds.length > 0) {
      const { data: progs } = await supabase
        .from('programs')
        .select('id, name, name_en')
        .in('id', programIds as string[])
      ;(progs ?? []).forEach((p) => programMap.set(p.id, p.name || p.name_en || ''))
    }

    // Group programs per user
    const userPrograms = new Map<string, string[]>()
    for (const r of roles ?? []) {
      const list = userPrograms.get(r.user_id) ?? []
      const name = r.program_id ? programMap.get(r.program_id) : 'الكلية'
      if (name && !list.includes(name)) list.push(name)
      userPrograms.set(r.user_id, list)
    }

    let sent = 0
    const errors: string[] = []
    for (const p of profiles ?? []) {
      if (!p.email) continue
      const programNames = userPrograms.get(p.id) ?? []
      const programName = programNames.join('، ')

      const { error: sErr } = await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'system-announcement',
          recipientEmail: p.email,
          idempotencyKey: `system-announcement-email-notifications-v1-${p.id}`,
          templateData: {
            coordinatorName: p.full_name || '',
            programName,
          },
        },
      })
      if (sErr) {
        errors.push(`${p.email}: ${sErr.message}`)
      } else {
        sent++
      }
    }

    return json({ success: true, sent, total: (profiles ?? []).length, errors })
  } catch (e) {
    console.error(e)
    return json({ error: String(e) }, 500)
  }
})

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
