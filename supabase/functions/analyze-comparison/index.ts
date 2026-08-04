// AI analysis of a comparison between two or more surveys/programs
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
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { mode, language, context, overall, rows } = body ?? {};
    if (!Array.isArray(overall) || overall.length < 2 || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const isAr = language !== "en";
    const trimmedRows = rows.slice(0, 60);

    const payload = {
      mode,
      context,
      entities: overall.map((o: any) => ({
        name: o.programName,
        mean: o.overallMean,
        responses: o.totalResponses,
        satisfaction_percent: o.satisfactionRate,
      })),
      questions: trimmedRows.map((r: any) => ({
        question: r.title,
        scores: (r.programData || []).map((p: any) => ({ name: p.programName, avg: p.exists ? p.averageScore : null, n: p.responseCount })),
      })),
    };

    const systemPrompt = isAr
      ? `أنت محلل جودة أكاديمية خبير في الإحصاء التربوي. تحلل مقارنة بين نماذج/استبيانات تقييم داخل منظومة ضمان الجودة.
- المقاييس من 1 إلى 5 (مقياس ليكرت)، ونسبة الرضا = المتوسط ÷ 5 × 100.
- اعتمد على الأرقام المعطاة فقط ولا تخترع بيانات.
- اذكر دلالة الفروق عمليًا (فرق أقل من 0.2 يُعد ضئيلًا، 0.2–0.5 متوسط، أكثر من 0.5 كبير) وانتبه لصغر حجم العينة (أقل من 10 استجابات = نتيجة غير مستقرة).
- أعد JSON فقط.`
      : `You are an academic quality analyst specialized in educational statistics, comparing evaluation surveys inside a quality assurance system.
- Scales are 1-5 (Likert); satisfaction rate = mean / 5 * 100.
- Use only the given numbers; never invent data.
- Judge practical significance (gap < 0.2 negligible, 0.2-0.5 moderate, > 0.5 large) and flag small samples (< 10 responses = unstable).
- Return JSON only.`;

    const userPrompt = `${isAr ? "بيانات المقارنة" : "Comparison data"}:\n${JSON.stringify(payload)}\n\n${
      isAr
        ? `أعد كائن JSON بالمفاتيح:
{"summary": "خلاصة تنفيذية من 3-5 جمل عن مستوى الرضا والمقارنة",
 "satisfaction": [{"name":"اسم النموذج","level":"مرتفع|متوسط|منخفض","percent":"نسبة الرضا","note":"جملة"}],
 "key_differences": ["أبرز الفروق بين النماذج مع الأرقام"],
 "strengths": ["نقاط القوة المشتركة"],
 "weaknesses": ["أضعف المحاور مع الأرقام"],
 "statistical_notes": ["ملاحظات إحصائية عن حجم العينة ودلالة الفروق"],
 "recommendations": ["توصيات عملية قابلة للتنفيذ"]}`
        : `Return a JSON object with keys:
{"summary": "3-5 sentence executive summary of satisfaction and the comparison",
 "satisfaction": [{"name":"entity","level":"high|medium|low","percent":"satisfaction %","note":"one sentence"}],
 "key_differences": ["biggest gaps with numbers"],
 "strengths": ["shared strengths"],
 "weaknesses": ["weakest areas with numbers"],
 "statistical_notes": ["notes on sample size and significance"],
 "recommendations": ["actionable recommendations"]}`
    }`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2500,
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: isAr ? "تم تجاوز حد الطلبات، حاول لاحقًا" : "Rate limit exceeded, try again later" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: isAr ? "يرجى إضافة رصيد Lovable AI" : "Please add Lovable AI credits" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const text = await resp.text();
      throw new Error(`AI error ${resp.status}: ${text}`);
    }

    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content ?? "{}";
    let analysis: unknown;
    try {
      analysis = JSON.parse(content);
    } catch {
      analysis = { summary: String(content) };
    }

    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "error";
    console.error("analyze-comparison:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
