import Anthropic from '@anthropic-ai/sdk';
import { classifyIntent, detectLanguage, buildMetaPrompt } from '@promptforge/engine';
import type { TargetModel } from '@promptforge/engine';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY not configured' },
      { status: 500 },
    );
  }

  let body: { idea?: string; targetModel?: string; outputLanguage?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { idea, targetModel, outputLanguage } = body;

  if (!idea?.trim()) {
    return Response.json({ error: 'idea is required' }, { status: 400 });
  }

  const resolvedModel = (targetModel ?? 'claude') as TargetModel;
  const intent = classifyIntent(idea);
  const lang = outputLanguage ?? detectLanguage(idea);

  const metaPrompt = buildMetaPrompt({
    idea,
    intent,
    targetModel: resolvedModel,
    outputLanguage: lang,
  });

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: metaPrompt }],
    });

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Strip any accidental markdown code fences Claude might add
    const clean = rawText
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```$/m, '')
      .trim();

    const result = JSON.parse(clean) as {
      prompt: string;
      variants: string[];
      rationale: string;
      tips: string[];
    };

    return Response.json({ ...result, intent, detectedLanguage: lang });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ error: message }, { status: 502 });
  }
}
