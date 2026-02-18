import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { surveyId, courseName } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch survey data with responses
    const { data: survey } = await supabase
      .from("surveys")
      .select(`
        *,
        questions(*),
        responses(*, answers(*))
      `)
      .eq("id", surveyId)
      .single();

    if (!survey) {
      throw new Error("Survey not found");
    }

    // Calculate statistics
    const stats: any = {
      total_responses: survey.responses.length,
      questions_stats: [],
    };

    for (const question of survey.questions) {
      const answers = survey.responses.flatMap((r: any) =>
        r.answers.filter((a: any) => a.question_id === question.id)
      );

      if (question.type === "likert" || question.type === "rating") {
        const numericValues = answers
          .map((a: any) => a.numeric_value)
          .filter((v: number) => v != null);

        const mean = numericValues.length > 0
          ? numericValues.reduce((sum: number, v: number) => sum + v, 0) / numericValues.length
          : 0;
        const variance = numericValues.length > 0
          ? numericValues.reduce((sum: number, v: number) => sum + Math.pow(v - mean, 2), 0) / numericValues.length
          : 0;
        const stdDev = Math.sqrt(variance);

        stats.questions_stats.push({
          question_id: question.id,
          question_text: question.text,
          type: question.type,
          mean: mean.toFixed(2),
          std_dev: stdDev.toFixed(2),
          response_count: numericValues.length,
        });
      } else if (question.type === "text") {
        stats.questions_stats.push({
          question_id: question.id,
          question_text: question.text,
          type: question.type,
          response_count: answers.length,
        });
      }
    }

    // Prepare data for AI analysis
    const textResponses = survey.responses
      .flatMap((r: any) => r.answers)
      .filter((a: any) => {
        const q = survey.questions.find((q: any) => q.id === a.question_id);
        return q?.type === "text" && a.value;
      })
      .map((a: any) => a.value);

    let aiSummary = "";
    let aiRecommendations = "";

    // Build course context for AI prompts
    const courseContext = courseName ? ` للمقرر الدراسي "${courseName}"` : "";

    // Always generate AI analysis - even without text responses, use numeric stats
    const hasTextResponses = textResponses.length > 0;
    const hasNumericStats = stats.questions_stats.some((q: any) => q.type === "likert" || q.type === "rating");

    if (hasTextResponses || hasNumericStats) {
      // Generate summary
      const summaryPrompt = hasTextResponses
        ? `قم بتحليل هذه الردود النصية من استبيان "${survey.title}"${courseContext}:\n\n${textResponses.join("\n\n")}\n\nالإحصائيات الرقمية:\n${JSON.stringify(stats.questions_stats.filter((q: any) => q.mean), null, 2)}`
        : `قم بتحليل نتائج استبيان "${survey.title}"${courseContext} بناءً على الإحصائيات الرقمية التالية:\n\n${JSON.stringify(stats.questions_stats, null, 2)}\n\nعدد الاستجابات الكلي: ${stats.total_responses}`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "أنت محلل بيانات متخصص في تحليل استبيانات التعليم العالي. قم بتحليل البيانات واستخرج الموضوعات الرئيسية والمشاعر العامة ونقاط القوة والضعف. قدم تحليلاً شاملاً ومنظماً.",
            },
            {
              role: "user",
              content: summaryPrompt,
            },
          ],
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiSummary = aiData.choices[0].message.content;
      }

      // Generate recommendations - always generate based on stats
      const recPrompt = `بناءً على نتائج الاستبيان التالي${courseContext}:\n\nالإحصائيات: ${JSON.stringify(stats)}\n\n${aiSummary ? `التحليل: ${aiSummary}\n\n` : ''}قدم 3-5 توصيات قابلة للتنفيذ لتحسين الأداء${courseName ? ` في مقرر "${courseName}"` : ''}. يجب أن تكون التوصيات محددة وعملية ومرتبطة بنتائج الاستبيان.`;

      const recResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content:
                "أنت مستشار تعليمي متخصص في تطوير الجودة. قم بتقديم توصيات قابلة للتنفيذ بناءً على نتائج الاستبيان. التوصيات يجب أن تكون مرقمة وواضحة ومحددة.",
            },
            {
              role: "user",
              content: recPrompt,
            },
          ],
        }),
      });

      if (recResponse.ok) {
        const recData = await recResponse.json();
        aiRecommendations = recData.choices[0].message.content;
      }
    }

    // Save report
    const { data: report } = await supabase
      .from("reports")
      .insert({
        survey_id: surveyId,
        generated_by_ai: true,
        summary: aiSummary || "لم يتم توليد ملخص",
        recommendations_text: aiRecommendations || "لم يتم توليد توصيات",
        statistics: stats,
        semester: "خريف 2025",
        academic_year: "2025-2026",
      })
      .select()
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        report,
        stats,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
