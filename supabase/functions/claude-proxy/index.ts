import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_MODEL = 'gemini-2.5-flash';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY غير مضبوط في Supabase Secrets' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const { system, messages, max_tokens = 1500 } = await req.json();

    // تحويل تنسيق Claude إلى تنسيق Gemini
    const parts = (messages?.[0]?.content || []);
    const geminiParts = Array.isArray(parts)
      ? parts.map((item: any) => item.type === 'image'
          ? { inlineData: { mimeType: item.source.media_type, data: item.source.data } }
          : { text: item.text || '' })
      : [{ text: String(parts) }];

    const geminiBody = {
      systemInstruction: { parts: [{ text: system || '' }] },
      contents: [{ parts: geminiParts }],
      generationConfig: { maxOutputTokens: max_tokens },
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: data.error?.message || 'خطأ من Gemini API' }), {
        status: response.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // إعادة النتيجة بتنسيق Claude لتوافق الكود الحالي
    const text = (data.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('\n');
    return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
