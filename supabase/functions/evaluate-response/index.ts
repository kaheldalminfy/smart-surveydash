import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { 
      indicatorId,
      responseText,
      indicatorName,
      indicatorDescription,
      indicatorObjective,
      requiredEvidence
    } = await req.json();
    
    if (!responseText) {
      return new Response(
        JSON.stringify({ error: 'لا يوجد رد للتقييم' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت مقيّم متخصص في الاعتماد الأكاديمي. مهمتك تقييم الردود على مؤشرات الاعتماد وتحديد نسبة الاستيفاء ونقاط القوة والفجوات.`;

    const userPrompt = `قم بتقييم الرد التالي على مؤشر الاعتماد:

المؤشر: ${indicatorName}
الوصف: ${indicatorDescription || 'غير محدد'}
الهدف: ${indicatorObjective || 'غير محدد'}
الأدلة المطلوبة: ${JSON.stringify(requiredEvidence || [])}

الرد المقدم:
${responseText}

قم بتقييم الرد وقدم النتيجة بصيغة JSON كالتالي:
{
  "compliance_percentage": 75,
  "compliance_level": "partial",
  "score": 75,
  "feedback": "تقييم عام للرد...",
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "gaps": ["فجوة 1", "فجوة 2"],
  "improvement_notes": "اقتراحات للتحسين..."
}

ملاحظات:
- compliance_level: "compliant" (80-100%), "partial" (50-79%), "non_compliant" (<50%)
- كن موضوعياً ودقيقاً في التقييم
- اذكر نقاط القوة الفعلية الموجودة في الرد
- حدد الفجوات والجوانب الناقصة
- قدم اقتراحات عملية للتحسين`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const evaluation = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(evaluation),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'حدث خطأ في التقييم';
    console.error('Error in evaluate-response:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
