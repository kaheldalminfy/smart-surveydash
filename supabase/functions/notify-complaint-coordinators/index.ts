import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_BASE_URL = 'https://quality-hss.ly'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { complaintId } = await req.json()
    if (!complaintId) {
      return json({ error: 'complaintId required' }, 400)
    }

    // Fetch complaint
    const { data: complaint, error: cErr } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .maybeSingle()

    if (cErr || !complaint) {
      return json({ error: 'Complaint not found' }, 404)
    }

    // Anti-abuse: only notify for freshly submitted complaints (within 2 minutes).
    // This endpoint is unauthenticated (anonymous complaint submission), so we
    // restrict it to the brief window right after insert to prevent attackers
    // from re-triggering notifications for arbitrary historical complaints.
    const ageMs = Date.now() - new Date(complaint.created_at).getTime()
    if (ageMs > 2 * 60 * 1000) {
      return json({ error: 'Complaint is not eligible for notification' }, 403)
    }

    // Fetch program name
    let programName: string | null = null
    if (complaint.program_id) {
      const { data: prog } = await supabase
        .from('programs')
        .select('name, name_en')
        .eq('id', complaint.program_id)
        .maybeSingle()
      programName = prog?.name || prog?.name_en || null
    }

    // Find coordinators for that program (or college-level if program_id null)
    const roleQuery = supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'coordinator')

    const { data: roles, error: rErr } = complaint.program_id
      ? await roleQuery.eq('program_id', complaint.program_id)
      : await roleQuery.is('program_id', null)

    if (rErr) {
      console.error('Roles query failed', rErr)
      return json({ error: 'Failed to fetch coordinators' }, 500)
    }

    const userIds = [...new Set((roles ?? []).map((r) => r.user_id))]
    if (userIds.length === 0) {
      console.log('No coordinators for program', complaint.program_id)
      return json({ success: true, notified: 0 })
    }

    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    if (pErr) {
      console.error('Profiles query failed', pErr)
      return json({ error: 'Failed to fetch profiles' }, 500)
    }

    const recipients = (profiles ?? []).filter((p) => !!p.email)
    const submittedAt = new Date(complaint.created_at).toLocaleString('ar', {
      timeZone: 'Africa/Tripoli',
    })
    const complaintUrl = `${APP_BASE_URL}/complaints`

    let sent = 0
    for (const r of recipients) {
      const { error: sendErr } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'complaint-notification',
            recipientEmail: r.email,
            idempotencyKey: `complaint-${complaintId}-${r.id}`,
            templateData: {
              coordinatorName: r.full_name || '',
              programName: programName || '',
              complainantName: complaint.student_name || '',
              complainantType: complaint.complainant_type || '',
              category: complaint.complaint_category || complaint.type || '',
              subject: complaint.subject || '',
              description: complaint.description || '',
              submittedAt,
              complaintUrl,
            },
          },
        },
      )
      if (sendErr) {
        console.error('Send failed for', r.email, sendErr)
      } else {
        sent++
      }
    }

    return json({ success: true, notified: sent, total: recipients.length })
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
