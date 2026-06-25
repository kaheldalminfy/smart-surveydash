// Predict program quality risk based on survey-rating trends
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load programs
    const { data: programs } = await supabase.from("programs").select("id, name");
    if (!programs?.length) return new Response(JSON.stringify({ programs: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Load Likert/rating answers with period + program
    const { data: answers, error: aerr } = await supabase
      .from("answers")
      .select("numeric_value, responses!inner(submitted_at, surveys!inner(program_id, academic_year, semester)), questions!inner(type, is_archived)")
      .eq("questions.is_archived", false)
      .in("questions.type", ["rating", "likert"])
      .limit(10000);
    if (aerr) throw aerr;

    // Open-ended complaints per program
    const { data: complaints } = await supabase
      .from("complaints")
      .select("program_id, status, created_at");

    // Group by program & period (year+semester)
    const periods: Record<string, Record<string, { sum: number; n: number }>> = {};
    (answers || []).forEach((a: any) => {
      const v = a.numeric_value;
      const s = a.responses?.surveys;
      if (!s || v == null || v < 1 || v > 5) return;
      const pid = s.program_id;
      if (!pid) return;
      const key = `${s.academic_year || "?"}-${s.semester || "?"}`;
      periods[pid] ??= {};
      periods[pid][key] ??= { sum: 0, n: 0 };
      periods[pid][key].sum += v; periods[pid][key].n += 1;
    });

    const programStats = programs.map((p) => {
      const byPeriod = periods[p.id] || {};
      const series = Object.entries(byPeriod)
        .map(([period, v]) => ({ period, avg: +(v.sum / v.n).toFixed(2), n: v.n }))
        .sort((a, b) => a.period.localeCompare(b.period));
      const last = series.at(-1)?.avg ?? null;
      const prev = series.at(-2)?.avg ?? null;
      const trend = last != null && prev != null ? +(last - prev).toFixed(2) : null;
      const complaintsOpen = (complaints || []).filter((c: any) => c.program_id === p.id && c.status !== "resolved").length;
      return { id: p.id, name: p.name, series, last, prev, trend, complaintsOpen };
    });

    // Heuristic baseline risk
    const withBaseline = programStats.map((s) => {
      let risk: "low" | "medium" | "high" = "low";
      if (s.last != null) {
        if (s.last < 3 || (s.trend != null && s.trend <= -0.5)) risk = "high";
        else if (s.last < 3.6 || (s.trend != null && s.trend <= -0.2)) risk = "medium";
      } else if (s.complaintsOpen >= 3) risk = "medium";
      return { ...s, baselineRisk: risk };
    });

    // Ask AI for nuanced risk + recommendation
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `بناءً على بيانات أداء البرامج الأكاديمية التالية (متوسط تقييمات Likert من 1 إلى 5 لكل فترة، عدد الشكاوى المفتوحة)، صنّف مخاطر تدهور جودة كل برنامج إلى (low/medium/high) واكتب جملة توصية واحدة موجزة.

البيانات:
${JSON.stringify(withBaseline.map(({ id, name, series, last, trend, complaintsOpen, baselineRisk }) => ({ id, name, series, last, trend, complaintsOpen, baselineRisk })), null, 2)}

أعد JSON فقط بالشكل:
{ "assessments": [ { "id": "...", "risk": "low|medium|high", "reason": "...", "recommendation": "..." } ] }`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "أنت محلل جودة أكاديمية. أجب بالعربية و JSON صالح فقط." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد Lovable AI" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI ${resp.status}`);
    }
    const aiData = await resp.json();
    let assessments: any[] = [];
    try {
      const parsed = JSON.parse(aiData.choices[0].message.content);
      assessments = parsed.assessments || [];
    } catch { /* fallback to baseline */ }

    const merged = withBaseline.map((s) => {
      const a = assessments.find((x) => x.id === s.id);
      return {
        ...s,
        risk: a?.risk || s.baselineRisk,
        reason: a?.reason || (s.last == null ? "لا توجد بيانات كافية." : `آخر متوسط ${s.last}${s.trend != null ? ` (تغير ${s.trend > 0 ? "+" : ""}${s.trend})` : ""}`),
        recommendation: a?.recommendation || "تابع المؤشرات بانتظام.",
      };
    });

    return new Response(JSON.stringify({ programs: merged, generated_at: new Date().toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "خطأ";
    console.error("predict-program-risk:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
