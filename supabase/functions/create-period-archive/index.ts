// Snapshot a program period into archives without PostgREST row truncation.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PAGE_SIZE = 500;
const MAX_ROWS = 100_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

type Row = Record<string, unknown>;

const fetchAllRows = async (
  label: string,
  buildQuery: () => any,
): Promise<Row[]> => {
  const rows: Row[] = [];

  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const { data, error } = await buildQuery()
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Failed to load ${label}: ${error.message}`);
    const page = (data || []) as Row[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }

  throw new Error(`${label} archive limit exceeded`);
};

const applyProgramFilter = (query: any, programId: string | null) =>
  programId ? query.eq("program_id", programId) : query.is("program_id", null);

const fetchRowsBySurveyIds = async (
  label: string,
  surveyIds: string[],
  buildQuery: (ids: string[]) => any,
): Promise<Row[]> => {
  const rows: Row[] = [];
  for (let offset = 0; offset < surveyIds.length; offset += 100) {
    rows.push(...await fetchAllRows(label, () => buildQuery(surveyIds.slice(offset, offset + 100))));
  }
  return rows;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) throw new Error("Supabase environment is not configured");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = (await req.json()) as Payload;
    const programId = body.program_id ?? null;
    const academicYear = String(body.academic_year || "").trim();
    const semester = String(body.semester || "").trim();
    const closingNotes = body.closing_notes == null ? null : String(body.closing_notes).trim();
    const requestedTitle = body.title == null ? null : String(body.title).trim();

    if (!academicYear || !semester || academicYear.length > 100 || semester.length > 100) {
      return json({ error: "A valid academic_year and semester are required" }, 400);
    }
    if (programId !== null && !UUID_PATTERN.test(programId)) {
      return json({ error: "Invalid program_id" }, 400);
    }
    if ((closingNotes?.length || 0) > 10_000 || (requestedTitle?.length || 0) > 500) {
      return json({ error: "Archive text is too long" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roles, error: rolesError } = await admin
      .from("user_roles")
      .select("role, program_id")
      .eq("user_id", userId);
    if (rolesError) throw rolesError;

    const isCollegeManager = roles?.some((role) => role.role === "admin" || role.role === "dean");
    const hasProgramRole = roles?.some((role) =>
      (role.role === "coordinator" || role.role === "program_manager")
      && (role.program_id === programId || role.program_id === null)
    );
    if (!isCollegeManager && !hasProgramRole) return json({ error: "Forbidden" }, 403);

    const programResult = programId
      ? await admin.from("programs").select("*").eq("id", programId).maybeSingle()
      : { data: null, error: null };
    if (programResult.error) throw programResult.error;
    if (programId && !programResult.data) return json({ error: "Program not found" }, 404);

    const surveys = await fetchAllRows("surveys", () => applyProgramFilter(
      admin
        .from("surveys")
        .select("*, questions(*)")
        .eq("academic_year", academicYear)
        .eq("semester", semester),
      programId,
    ));
    const surveyIds = surveys.map((survey) => String(survey.id));

    const [complaints, recommendations, indicatorResponses] = await Promise.all([
      fetchAllRows("complaints", () => applyProgramFilter(
        admin.from("complaints").select("*").eq("academic_year", academicYear).eq("semester", semester),
        programId,
      )),
      fetchAllRows("recommendations", () => applyProgramFilter(
        admin.from("recommendations").select("*").eq("academic_year", academicYear).eq("semester", semester),
        programId,
      )),
      fetchAllRows("indicator responses", () => applyProgramFilter(
        admin.from("indicator_responses").select("*").eq("academic_year", academicYear).eq("semester", semester),
        programId,
      )),
    ]);

    let responses: Row[] = [];
    let reports: Row[] = [];
    if (surveyIds.length > 0) {
      try {
        responses = await fetchRowsBySurveyIds("responses", surveyIds, (ids) => admin
          .from("responses")
          .select("*, answers(*)")
          .in("survey_id", ids)
          .eq("is_complete", true));
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!message.includes("is_complete")) throw error;
        responses = (await fetchRowsBySurveyIds("responses", surveyIds, (ids) => admin
          .from("responses")
          .select("*, answers(*)")
          .in("survey_id", ids)))
          .filter((response) => Array.isArray(response.answers) && response.answers.length > 0);
      }

      reports = await fetchRowsBySurveyIds("reports", surveyIds, (ids) => admin
        .from("reports")
        .select("*")
        .in("survey_id", ids));
    }

    const totalComplaints = complaints.length;
    const resolvedComplaints = complaints.filter((complaint) =>
      complaint.status === "resolved" || complaint.status === "closed"
    ).length;

    let likertSum = 0;
    let likertCount = 0;
    for (const response of responses) {
      const answers = Array.isArray(response.answers) ? response.answers as Row[] : [];
      for (const answer of answers) {
        const value = answer.numeric_value;
        if (typeof value === "number" && value >= 1 && value <= 5) {
          likertSum += value;
          likertCount += 1;
        }
      }
    }

    const complianceValues = indicatorResponses
      .map((row) => row.compliance_percentage)
      .filter((value): value is number => typeof value === "number");

    const kpis = {
      surveys_count: surveys.length,
      responses_count: responses.length,
      complaints_count: totalComplaints,
      complaints_resolved: resolvedComplaints,
      complaints_resolution_rate: totalComplaints ? resolvedComplaints / totalComplaints : null,
      reports_count: reports.length,
      recommendations_count: recommendations.length,
      avg_likert: likertCount ? likertSum / likertCount : null,
      avg_compliance_percentage: complianceValues.length
        ? complianceValues.reduce((sum, value) => sum + value, 0) / complianceValues.length
        : null,
    };

    const snapshot = {
      program: programResult.data,
      surveys,
      responses,
      complaints,
      reports,
      recommendations,
      indicator_responses: indicatorResponses,
      generated_at: new Date().toISOString(),
      generated_by: userId,
    };

    const programLabel = programResult.data?.name || "College Level";
    const title = requestedTitle || `${programLabel} - ${academicYear} / ${semester}`;
    const { data: archive, error: insertError } = await admin
      .from("archives")
      .insert({
        program_id: programId,
        academic_year: academicYear,
        semester,
        period_start_date: body.period_start_date || null,
        period_end_date: body.period_end_date || null,
        closing_notes: closingNotes,
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
    if (insertError || !archive) throw new Error(insertError?.message || "Archive creation failed");

    const { error: auditError } = await admin.from("archive_audit_log").insert({
      archive_id: archive.id,
      action: body.freeze ? "frozen" : "created",
      performed_by: userId,
      metadata: { kpis },
    });
    if (auditError) {
      console.error("Archive audit insert failed", auditError.message);
    }

    return json({ archive, kpis, audit_logged: !auditError });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-period-archive", message);
    return json({ error: message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
