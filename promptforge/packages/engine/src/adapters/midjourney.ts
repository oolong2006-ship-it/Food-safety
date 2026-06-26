import type { FrameworkSlots } from '../frameworks';

export interface MidjourneyParams {
  ar?: string;       // aspect ratio, e.g. "16:9"
  v?: string;        // version, e.g. "6"
  style?: string;    // e.g. "raw"
  q?: number;        // quality 0.25–2
  chaos?: number;    // 0–100
  no?: string[];     // negative prompts
  stylize?: number;  // 0–1000
}

const DEFAULT_PARAMS: MidjourneyParams = {
  ar: '16:9',
  v: '6',
  q: 1,
};

export function adaptForMidjourney(
  slots: FrameworkSlots,
  params: MidjourneyParams = DEFAULT_PARAMS,
): string {
  const visualTerms: string[] = [];

  // Core description
  visualTerms.push(slots.objective);

  if (slots.context) visualTerms.push(slots.context);

  // Style / mood
  if (slots.tone) visualTerms.push(slots.tone);

  // Default quality boosters for Midjourney
  visualTerms.push('highly detailed', 'professional photography', 'cinematic lighting');

  let prompt = `/imagine ${visualTerms.filter(Boolean).join(', ')}`;

  // Append parameters
  if (params.ar) prompt += ` --ar ${params.ar}`;
  if (params.v) prompt += ` --v ${params.v}`;
  if (params.style) prompt += ` --style ${params.style}`;
  if (params.q !== undefined) prompt += ` --q ${params.q}`;
  if (params.chaos !== undefined) prompt += ` --chaos ${params.chaos}`;
  if (params.stylize !== undefined) prompt += ` --stylize ${params.stylize}`;
  if (params.no?.length) prompt += ` --no ${params.no.join(', ')}`;

  return prompt;
}
