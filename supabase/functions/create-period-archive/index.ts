// Snapshot a program's period (program_id + academic_year + semester) into archives
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  program_id: string | null;
  academic_year: string;
  semester: string;
  period_start_date?: string | null;
  period_end_date?: string | null;
  closing_notes?: string | null;
  freeze?: boolean;
  title?: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as Payload;
    if (!body.academic_year || !body.semester) {
      return json({ error: "academic_year and semester are required" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Authz: admin OR coordinator for that program
    const { data: roles } = await admin
      .from("user_roles")
      .select("role, program_id")
      .eq("user_id", userId);
    const isAdmin = roles?.some((r) => r.role === "admin");
    const isCoordinator = roles?.some(
      (r) => r.role === "coordinator" && (r.program_id === body.program_id || r.program_id === null),
    );
    if (!isAdmin && !isCoordinator) return json({ error: "Forbidden" }, 403);

    // Fetch all related data
    const programFilter = body.program_id;

    const [surveysRes, complaintsRes, reportsRes, recommendationsRes, indicatorRespRes, programRes] =
      await Promise.all([
        admin
          .from("surveys")
          .select("*, questions(*)")
          .eq("academic_year", body.academic_year)
          .eq("semester", body.semester)
          .eq("program_id", programFilter as any),
        admin
          .from("complaints")
          .select("*")
          .eq("academic_year", body.academic_year)
          .eq("semester", body.semester)
          .eq("program_id", programFilter as any),
        admin.from("reports").select("*"),
        admin
          .from("recommendations")
          .select("*")
          .eq("academic_year", body.academic_year)
          .eq("semester", body.semester)
          .eq("program_id", programFilter as any),
        admin
          .from("indicator_responses")
          .select("*")
          .eq("academic_year", body.academic_year)
          .eq("semester", body.semester)
          .eq("program_id", programFilter as any),
        programFilter
          ? admin.from("programs").select("*").eq("id", programFilter).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);

    const surveys = surveysRes.data ?? [];
    const surveyIds = surveys.map((s: any) => s.id);

    const [responsesRes] = await Promise.all([
      surveyIds.length
        ? admin.from("responses").select("*, answers(*)").in("survey_id", surveyIds)
        : Promise.resolve({ data: [] } as any),
    ]);
    const responses = responsesRes.data ?? [];

    const filteredReports = (reportsRes.data ?? []).filter((r: any) => surveyIds.includes(r.survey_id));

    // Compute KPIs
    const totalResponses = responses.length;
    const totalComplaints = (complaintsRes.data ?? []).length;
    const resolvedComplaints = (complaintsRes.data ?? []).filter((c: any) => c.status === "resolved").length;

    let likertSum = 0;
    let likertCount = 0;
    for (const r of responses as any[]) {
      for (const a of r.answers ?? []) {
        if (typeof a.numeric_value === "number" && a.numeric_value >= 1 && a.numeric_value <= 5) {
          likertSum += a.numeric_value;
          likertCount += 1;
        }
      }
    }
    const avgLikert = likertCount ? likertSum / likertCount : null;

    const indicatorResps = indicatorRespRes.data ?? [];
    const avgCompliance = indicatorResps.length
      ? indicatorResps.reduce((s: number, x: any) => s + (x.compliance_percentage ?? 0), 0) / indicatorResps.length
      : null;

    const kpis = {
      surveys_count: surveys.length,
      responses_count: totalResponses,
      complaints_count: totalComplaints,
      complaints_resolved: resolvedComplaints,
      complaints_resolution_rate: totalComplaints ? resolvedComplaints / totalComplaints : null,
      reports_count: filteredReports.length,
      recommendations_count: (recommendationsRes.data ?? []).length,
      avg_likert: avgLikert,
      avg_compliance_percentage: avgCompliance,
    };

    const snapshot = {
      program: programRes?.data ?? null,
      surveys,
      responses,
      complaints: complaintsRes.data ?? [],
      reports: filteredReports,
      recommendations: recommendationsRes.data ?? [],
      indicator_responses: indicatorResps,
      generated_at: new Date().toISOString(),
      generated_by: userId,
    };

    const programLabel = programRes?.data?.name ?? "College Level";
    const title = body.title?.trim() || `${programLabel} — ${body.academic_year} / ${body.semester}`;

    const { data: archive, error: insertErr } = await admin
      .from("archives")
      .insert({
        program_id: body.program_id,
        academic_year: body.academic_year,
        semester: body.semester,
        period_start_date: body.period_start_date ?? null,
        period_end_date: body.period_end_date ?? null,
        closing_notes: body.closing_notes ?? null,
        title,
        data_type: "period_snapshot",
        data: snapshot,
        kpis_snapshot: kpis,
        status: body.freeze ? "frozen" : "draft",
        archived_by: userId,
        frozen_by: body.freeze ? userId : null,
      })
      .select()
      .single();

    if (insertErr) return json({ error: insertErr.message }, 500);

    await admin.from("archive_audit_log").insert({
      archive_id: archive!.id,
      action: body.freeze ? "frozen" : "created",
      performed_by: userId,
      metadata: { kpis },
    });

    return json({ archive, kpis });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
