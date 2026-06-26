import type { Intent } from './intents';
import type { TargetModel } from './frameworks';

export interface MetaPromptInput {
  idea: string;
  intent: Intent;
  targetModel: TargetModel;
  outputLanguage: string;
}

const MODEL_INSTRUCTIONS: Record<TargetModel, string> = {
  claude:
    'Use explicit XML structural tags: <role>, <task>, <context>, <constraints>, <output_format>, <thinking>. ' +
    'Claude performs best with clearly scoped, structured prompts. Use a <thinking> tag for reasoning tasks.',

  openai:
    'Use Markdown headers (# Role, # Task, # Context, # Output Format). ' +
    'Structure for the Chat Completions API: the role/rules go in the system message, the task in the user message. ' +
    'Use numbered lists for multi-step instructions.',

  gemini:
    'Be detailed and context-rich — Gemini handles long, comprehensive prompts well. ' +
    'Use clear section labels. Provide abundant background context before the main ask.',

  midjourney:
    'Generate a /imagine command. Format: /imagine [subject], [environment/background], [art style], [lighting], [mood/atmosphere], [camera/lens details] --ar 16:9 --v 6 --style raw --q 1. ' +
    'Use evocative, comma-separated visual descriptors. Do NOT use full sentences.',

  dalle:
    'Create a detailed visual description in 2-3 flowing sentences. Include: subject, action/pose, environment, art style (e.g., "oil painting", "photorealistic"), lighting (e.g., "golden hour", "studio lighting"), color palette, mood, and perspective. ' +
    'DALL-E responds well to artistic style references.',

  stablediffusion:
    'Create two sections: (1) Positive prompt — comma-separated visual tags including subject, style, quality boosters (masterpiece, highly detailed, 8k), lighting, and mood; (2) Negative prompt — comma-separated list of things to avoid (blurry, deformed, watermark, etc.). ' +
    'Also suggest cfg_scale (7) and steps (30).',
};

export function buildMetaPrompt(input: MetaPromptInput): string {
  const { idea, intent, targetModel, outputLanguage } = input;

  return `You are a world-class prompt engineer with deep expertise across all major AI models. Your task is to transform the user's raw idea into a professional, high-quality prompt that is optimized specifically for the target model.

<user_idea>${idea}</user_idea>
<intent>${intent}</intent>
<target_model>${targetModel}</target_model>
<output_language>${outputLanguage}</output_language>
<model_specific_instructions>
${MODEL_INSTRUCTIONS[targetModel] ?? MODEL_INSTRUCTIONS.claude}
</model_specific_instructions>

Rules:
1. Write the final prompt ENTIRELY in the output_language (${outputLanguage}) — no exceptions.
2. Apply the structural style specified in model_specific_instructions exactly.
3. Fill ALL relevant framework slots for this intent type (${intent}): role/persona, objective, context, constraints, output format, examples if helpful, tone, reasoning instructions.
4. Intelligently infer and expand any missing information — never leave slots empty; fill them with sensible, high-quality defaults.
5. Make the prompt immediately copy-pasteable and production-ready.
6. The result must be substantially better than the user's raw idea.

Return ONLY valid JSON — no markdown code fences, no extra text:
{
  "prompt": "<the complete professional prompt in ${outputLanguage}>",
  "variants": [
    "<a shorter, more concise variant>",
    "<a more creative or experimental variant>"
  ],
  "rationale": "<2-3 sentences explaining why this prompt is effective, in ${outputLanguage}>",
  "tips": [
    "<actionable tip to improve the prompt further>",
    "<another specific tip>"
  ]
}`;
}
