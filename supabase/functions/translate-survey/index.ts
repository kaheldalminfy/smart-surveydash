const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { texts, targetLang } = await req.json();
    if (!Array.isArray(texts) || texts.length === 0 || texts.length > 500) {
      return new Response(JSON.stringify({ error: 'Invalid texts' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (targetLang !== 'en' && targetLang !== 'ar') {
      return new Response(JSON.stringify({ error: 'Invalid targetLang' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cleanTexts = texts.map((t: unknown) => String(t ?? '').slice(0, 2000));
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const langName = targetLang === 'en' ? 'English' : 'Arabic';
    const systemPrompt = `You are a professional translator specialized in academic survey content. Translate the given items into ${langName}. Preserve meaning, tone, and any placeholders. Return ONLY a JSON object with an array "translations" of the same length and order as the input. Do not add commentary.`;
    const userPrompt = `Translate each item to ${langName}. Return JSON: { "translations": ["...", "..."] }.\n\nItems:\n${JSON.stringify(cleanTexts)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content);
    const translations = Array.isArray(parsed.translations) ? parsed.translations : [];
    if (translations.length !== cleanTexts.length) {
      throw new Error('Translation length mismatch');
    }

    return new Response(JSON.stringify({ translations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Translation failed';
    console.error('translate-survey error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
