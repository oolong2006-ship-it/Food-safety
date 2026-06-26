import type { FrameworkSlots } from '../frameworks';

export interface StableDiffusionResult {
  positive: string;
  negative: string;
  params: {
    steps: number;
    cfg_scale: number;
    width: number;
    height: number;
    sampler?: string;
  };
}

const QUALITY_BOOSTERS = [
  'masterpiece', 'best quality', 'highly detailed', '8k resolution',
  'sharp focus', 'professional', 'award-winning',
];

const DEFAULT_NEGATIVE = [
  'blurry', 'low quality', 'low resolution', 'pixelated', 'distorted',
  'deformed', 'ugly', 'watermark', 'text', 'signature', 'artifacts',
  'noise', 'overexposed', 'underexposed',
];

export function adaptForStableDiffusion(slots: FrameworkSlots): StableDiffusionResult {
  const positiveParts = [
    slots.objective,
    slots.context,
    slots.tone,
    ...QUALITY_BOOSTERS,
  ].filter(Boolean) as string[];

  return {
    positive: positiveParts.join(', '),
    negative: DEFAULT_NEGATIVE.join(', '),
    params: {
      steps: 30,
      cfg_scale: 7,
      width: 768,
      height: 512,
      sampler: 'DPM++ 2M Karras',
    },
  };
}

export function formatStableDiffusionOutput(result: StableDiffusionResult): string {
  return [
    `**Positive prompt:**\n${result.positive}`,
    `**Negative prompt:**\n${result.negative}`,
    `**Parameters:** Steps: ${result.params.steps} | CFG: ${result.params.cfg_scale} | Size: ${result.params.width}×${result.params.height}`,
  ].join('\n\n');
}
