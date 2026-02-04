import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      indicatorId,
      indicatorName,
      indicatorDescription,
      indicatorObjective,
      requiredEvidence,
      responseGuidelines
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت مستشار متخصص في الاعتماد الأكاديمي ومعايير الجودة. مهمتك تحليل مؤشرات الاعتماد وتقديم إرشادات واضحة لصياغة الردود.`;

    const userPrompt = `قم بتحليل المؤشر التالي وتقديم اقتراح صياغة للرد:

اسم المؤشر: ${indicatorName}

الوصف: ${indicatorDescription || 'غير محدد'}

الهدف: ${indicatorObjective || 'غير محدد'}

الأدلة المطلوبة: ${JSON.stringify(requiredEvidence || [])}

إرشادات الرد: ${responseGuidelines || 'غير محددة'}

المطلوب:
1. تحليل ما يتطلبه المؤشر
2. اقتراح صياغة رد نموذجية تتضمن:
   - وصف الإجراءات المتخذة
   - آلية التطبيق
   - أمثلة عملية
   - الأدلة والمستندات الداعمة

قدم الرد بصياغة رسمية مناسبة لتقارير الاعتماد.`;

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

    const data = await response.json();
    const suggestion = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-indicator:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'حدث خطأ في التحليل' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
