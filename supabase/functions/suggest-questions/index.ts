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
    const { surveyTitle, surveyDescription, questionType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت مساعد ذكي متخصص في تصميم الاستبيانات الأكاديمية. مهمتك اقتراح أسئلة ذات جودة عالية ومناسبة للسياق الأكاديمي.`;

    const userPrompt = `اقترح 5 أسئلة ${questionType === 'likert' ? 'بمقياس ليكرت' : questionType === 'mcq' ? 'اختيار من متعدد' : questionType === 'rating' ? 'تقييم بالنجوم' : 'نصية مفتوحة'} لاستبيان بعنوان "${surveyTitle}"${surveyDescription ? ` ووصف: "${surveyDescription}"` : ''}.

يجب أن تكون الأسئلة:
- واضحة ومباشرة
- مناسبة للسياق الأكاديمي
- قابلة للقياس
- خالية من التحيز

${questionType === 'mcq' ? 'قدم 4 خيارات مناسبة لكل سؤال.' : ''}

قدم الإجابة بصيغة JSON فقط بدون أي نص إضافي:
{
  "questions": [
    {
      "text": "نص السؤال",
      ${questionType === 'mcq' ? '"choices": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"]' : ''}
    }
  ]
}`;

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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'يرجى إضافة رصيد إلى حساب Lovable AI الخاص بك' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const suggestions = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(suggestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in suggest-questions:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'حدث خطأ في معالجة الطلب' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
