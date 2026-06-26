import type { Intent } from './intents';

export type TargetModel =
  | 'claude'
  | 'openai'
  | 'gemini'
  | 'midjourney'
  | 'dalle'
  | 'stablediffusion';

export interface FrameworkSlots {
  role?: string;
  objective: string;
  context?: string;
  constraints?: string[];
  input?: string;
  outputFormat?: string;
  examples?: string[];
  tone?: string;
  reasoning?: boolean;
}

// Which slots are relevant for each intent
export const INTENT_SLOTS: Record<Intent, (keyof FrameworkSlots)[]> = {
  writing:     ['role', 'objective', 'context', 'tone', 'constraints', 'outputFormat'],
  coding:      ['role', 'objective', 'context', 'constraints', 'outputFormat', 'reasoning'],
  image:       ['objective', 'context', 'tone', 'outputFormat'],
  analysis:    ['role', 'objective', 'context', 'outputFormat', 'reasoning'],
  agent:       ['role', 'objective', 'context', 'constraints', 'outputFormat'],
  reasoning:   ['objective', 'context', 'reasoning', 'outputFormat'],
  roleplay:    ['role', 'objective', 'context', 'tone', 'constraints'],
  education:   ['role', 'objective', 'context', 'examples', 'outputFormat', 'tone'],
  translation: ['role', 'objective', 'context', 'constraints', 'outputFormat'],
};
