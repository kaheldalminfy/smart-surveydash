import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionId, responses } = await req.json();
    
    if (!responses || responses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'لا توجد إجابات للتحليل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `أنت محلل متخصص في تحليل الإجابات النصية للاستبيانات الأكاديمية. مهمتك تحليل الإجابات وتقديم رؤى قيمة.`;

    const userPrompt = `قم بتحليل الإجابات النصية التالية وقدم:
1. الموضوعات الرئيسية المتكررة
2. المشاعر العامة (إيجابي/سلبي/محايد)
3. الاقتراحات والتوصيات الأكثر شيوعاً
4. نقاط القوة والضعف المذكورة
5. ملخص عام للإجابات

الإجابات (${responses.length} إجابة):
${responses.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

قدم التحليل بصيغة JSON:
{
  "themes": ["موضوع 1", "موضوع 2"],
  "sentiment": {
    "positive": 60,
    "negative": 20,
    "neutral": 20
  },
  "commonSuggestions": ["اقتراح 1", "اقتراح 2"],
  "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
  "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
  "summary": "ملخص شامل للإجابات"
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
          JSON.stringify({ error: 'يرجى إضافة رصيد إلى حساب Lovable AI' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in analyze-text-responses:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'حدث خطأ في التحليل' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
