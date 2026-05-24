// AI Copilot for Quality HSS — chat assistant with DB query tools
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const tools = [
  {
    type: "function",
    function: {
      name: "query_complaints",
      description: "احصل على عدد الشكاوى مع تصفية اختيارية حسب الحالة والفصل والعام والبرنامج.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pending", "in_progress", "resolved"] },
          academic_year: { type: "string" },
          semester: { type: "string" },
          program_id: { type: "string" },
          group_by_status: { type: "boolean", description: "إرجاع عدد لكل حالة" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_surveys",
      description: "احصل على قائمة الاستبيانات أو عددها مع تصفية.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["draft", "active", "closed"] },
          academic_year: { type: "string" },
          semester: { type: "string" },
          program_id: { type: "string" },
          count_only: { type: "boolean" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_responses_count",
      description: "إجمالي عدد الاستجابات (مع تصفية اختيارية على فصل/عام/برنامج).",
      parameters: {
        type: "object",
        properties: {
          academic_year: { type: "string" },
          semester: { type: "string" },
          program_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_avg_ratings",
      description: "متوسط تقييمات Likert (1-5) لكل برنامج خلال فترة.",
      parameters: {
        type: "object",
        properties: {
          academic_year: { type: "string" },
          semester: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_recommendations",
      description: "احصل على عدد التوصيات حسب الحالة.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string" },
          program_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_programs",
      description: "قائمة بجميع البرامج (id, name).",
      parameters: { type: "object", properties: {} },
    },
  },
];

async function runTool(name: string, args: any, supabase: any) {
  switch (name) {
    case "query_complaints": {
      let q = supabase.from("complaints").select("status, program_id", { count: "exact" });
      if (args.status) q = q.eq("status", args.status);
      if (args.academic_year) q = q.eq("academic_year", args.academic_year);
      if (args.semester) q = q.eq("semester", args.semester);
      if (args.program_id) q = q.eq("program_id", args.program_id);
      const { data, count, error } = await q;
      if (error) return { error: error.message };
      if (args.group_by_status) {
        const grouped: Record<string, number> = {};
        (data || []).forEach((r: any) => { grouped[r.status] = (grouped[r.status] || 0) + 1; });
        return { total: count, by_status: grouped };
      }
      return { total: count };
    }
    case "query_surveys": {
      let q = supabase.from("surveys").select("id, title, status, academic_year, semester, program_id", { count: "exact" });
      if (args.status) q = q.eq("status", args.status);
      if (args.academic_year) q = q.eq("academic_year", args.academic_year);
      if (args.semester) q = q.eq("semester", args.semester);
      if (args.program_id) q = q.eq("program_id", args.program_id);
      const { data, count, error } = await q.limit(50);
      if (error) return { error: error.message };
      if (args.count_only) return { total: count };
      return { total: count, items: data };
    }
    case "query_responses_count": {
      let q = supabase.from("responses").select("survey_id, surveys!inner(academic_year, semester, program_id)", { count: "exact", head: true });
      if (args.academic_year) q = q.eq("surveys.academic_year", args.academic_year);
      if (args.semester) q = q.eq("surveys.semester", args.semester);
      if (args.program_id) q = q.eq("surveys.program_id", args.program_id);
      const { count, error } = await q;
      if (error) return { error: error.message };
      return { total: count };
    }
    case "query_avg_ratings": {
      let q = supabase.from("answers").select("numeric_value, responses!inner(surveys!inner(program_id, academic_year, semester)), questions!inner(type)");
      if (args.academic_year) q = q.eq("responses.surveys.academic_year", args.academic_year);
      if (args.semester) q = q.eq("responses.surveys.semester", args.semester);
      const { data, error } = await q.limit(5000);
      if (error) return { error: error.message };
      const buckets: Record<string, { sum: number; n: number }> = {};
      (data || []).forEach((a: any) => {
        const t = a.questions?.type;
        const v = a.numeric_value;
        if (!t || v == null || v < 1 || v > 5) return;
        if (t !== "rating" && t !== "likert") return;
        const pid = a.responses?.surveys?.program_id || "college";
        if (!buckets[pid]) buckets[pid] = { sum: 0, n: 0 };
        buckets[pid].sum += v; buckets[pid].n += 1;
      });
      const result: Record<string, number> = {};
      Object.entries(buckets).forEach(([k, v]) => { result[k] = +(v.sum / v.n).toFixed(2); });
      return { averages: result };
    }
    case "query_recommendations": {
      let q = supabase.from("recommendations").select("status", { count: "exact" });
      if (args.status) q = q.eq("status", args.status);
      if (args.program_id) q = q.eq("program_id", args.program_id);
      const { count, error } = await q;
      if (error) return { error: error.message };
      return { total: count };
    }
    case "list_programs": {
      const { data, error } = await supabase.from("programs").select("id, name").limit(100);
      if (error) return { error: error.message };
      return { programs: data };
    }
    default:
      return { error: "Unknown tool" };
  }
}

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
    const { data: userData, error: uerr } = await supabase.auth.getUser();
    if (uerr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `أنت مساعد ذكي لمنصة ضمان الجودة الأكاديمية "Quality HSS". 
- أجب بالعربية بشكل موجز ومباشر.
- استخدم الأدوات المتاحة لاستعلام قاعدة البيانات قبل الإجابة على أي سؤال عن أرقام أو إحصائيات.
- لا تخترع أرقاماً. إذا فشل استعلام أو كانت البيانات فارغة، قل ذلك صراحةً.
- عند الإشارة لبرنامج، استخدم اسمه (استدع list_programs عند الحاجة).
- نتائج المتوسطات على مقياس Likert من 1 إلى 5.`;

    let convo: any[] = [{ role: "system", content: systemPrompt }, ...messages];

    for (let i = 0; i < 6; i++) {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: convo, tools, tool_choice: "auto" }),
      });
      if (!resp.ok) {
        if (resp.status === 429) return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "يرجى إضافة رصيد Lovable AI" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await resp.text();
        throw new Error(`AI error ${resp.status}: ${t}`);
      }
      const data = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) throw new Error("No AI message");

      if (msg.tool_calls?.length) {
        convo.push(msg);
        for (const call of msg.tool_calls) {
          let args = {};
          try { args = JSON.parse(call.function.arguments || "{}"); } catch {}
          const result = await runTool(call.function.name, args, supabase);
          convo.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue;
      }
      return new Response(JSON.stringify({ reply: msg.content || "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ reply: "تعذّر إكمال الإجابة بعد عدة محاولات." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "خطأ";
    console.error("ai-copilot:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
