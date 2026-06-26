import { describe, it, expect } from 'vitest';
import { classifyIntent, detectLanguage } from '../src/intents.js';
import { buildLocalPrompt } from '../src/localBuild.js';
import { buildMetaPrompt } from '../src/metaPrompt.js';

describe('detectLanguage', () => {
  it('detects Arabic text', () => {
    expect(detectLanguage('اكتب مقالاً عن الذكاء الاصطناعي')).toBe('ar');
  });

  it('detects English text', () => {
    expect(detectLanguage('Write an article about artificial intelligence')).toBe('en');
  });

  it('classifies mixed text by majority', () => {
    // mostly arabic characters → ar
    expect(detectLanguage('هذا نص عربي مع بعض الإنجليزية')).toBe('ar');
    // mostly latin → en
    expect(detectLanguage('This is mostly English with just one word عربي')).toBe('en');
  });

  it('returns en for numbers / symbols only', () => {
    expect(detectLanguage('123 456')).toBe('en');
  });
});

describe('classifyIntent', () => {
  it('classifies writing intents', () => {
    expect(classifyIntent('Write an email to my client about the project update')).toBe('writing');
    expect(classifyIntent('اكتب مقالاً عن مستقبل الذكاء الاصطناعي')).toBe('writing');
    expect(classifyIntent('write a blog post about travel')).toBe('writing');
  });

  it('classifies coding intents', () => {
    expect(classifyIntent('write a Python function to sort a list')).toBe('coding');
    expect(classifyIntent('fix this bug in my React component')).toBe('coding');
    expect(classifyIntent('اكتب كود TypeScript لـ API endpoint')).toBe('coding');
  });

  it('classifies image intents', () => {
    expect(classifyIntent('midjourney prompt for a cyberpunk city at night')).toBe('image');
    expect(classifyIntent('generate an image of a sunset over mountains')).toBe('image');
    expect(classifyIntent('stable diffusion prompt for a fantasy artwork')).toBe('image');
  });

  it('classifies education intents', () => {
    expect(classifyIntent('explain how neural networks work for beginners')).toBe('education');
    expect(classifyIntent('اشرح كيف تعمل الشبكات العصبية بأسلوب بسيط')).toBe('education');
    expect(classifyIntent('step by step tutorial for learning React')).toBe('education');
  });

  it('classifies analysis intents', () => {
    expect(classifyIntent('analyze this market data and give insights')).toBe('analysis');
    expect(classifyIntent('write a data analysis report on user statistics')).toBe('analysis');
  });

  it('classifies translation intents', () => {
    expect(classifyIntent('translate this text from arabic to english')).toBe('translation');
    expect(classifyIntent('ترجم هذا النص للإنجليزية')).toBe('translation');
  });

  it('defaults to writing for ambiguous input', () => {
    expect(classifyIntent('xyz abc def 123')).toBe('writing');
  });
});

describe('buildLocalPrompt', () => {
  it('builds a Claude XML prompt for writing', () => {
    const result = buildLocalPrompt({
      idea: 'Write a compelling marketing email for a product launch',
      targetModel: 'claude',
    });
    expect(result.prompt).toContain('<task>');
    expect(result.prompt).toContain('<role>');
    expect(result.intent).toBe('writing');
    expect(result.detectedLanguage).toBe('en');
  });

  it('builds an OpenAI Markdown prompt for coding', () => {
    const result = buildLocalPrompt({
      idea: 'implement a TypeScript class for JWT authentication',
      targetModel: 'openai',
    });
    expect(result.prompt).toContain('# Task');
    expect(result.prompt).toContain('# Role');
    expect(result.intent).toBe('coding');
  });

  it('builds a Midjourney /imagine prompt for images', () => {
    const result = buildLocalPrompt({
      idea: 'midjourney prompt for a beautiful sunset over the ocean',
      targetModel: 'midjourney',
    });
    expect(result.prompt).toContain('/imagine');
    expect(result.prompt).toContain('--ar');
    expect(result.intent).toBe('image');
  });

  it('builds a Stable Diffusion prompt with positive and negative parts', () => {
    const result = buildLocalPrompt({
      idea: 'a fantasy castle in the mountains',
      targetModel: 'stablediffusion',
    });
    expect(result.prompt).toContain('Positive prompt');
    expect(result.prompt).toContain('Negative prompt');
  });

  it('respects explicit output language', () => {
    const result = buildLocalPrompt({
      idea: 'اكتب مقالاً',
      targetModel: 'claude',
      outputLanguage: 'en',
    });
    expect(result.detectedLanguage).toBe('en');
  });

  it('auto-detects Arabic and returns Arabic role', () => {
    const result = buildLocalPrompt({
      idea: 'اكتب مقالاً عن الذكاء الاصطناعي',
      targetModel: 'claude',
    });
    expect(result.detectedLanguage).toBe('ar');
    expect(result.slots.role).toMatch(/أنت/);
  });
});

describe('buildMetaPrompt', () => {
  it('produces a string containing key sections', () => {
    const prompt = buildMetaPrompt({
      idea: 'Help me write a product description for a coffee maker',
      intent: 'writing',
      targetModel: 'claude',
      outputLanguage: 'en',
    });
    expect(prompt).toContain('prompt engineer');
    expect(prompt).toContain('Help me write a product description');
    expect(prompt).toContain('claude');
    expect(prompt).toContain('"prompt"');
    expect(prompt).toContain('"variants"');
    expect(prompt).toContain('"rationale"');
    expect(prompt).toContain('"tips"');
  });

  it('embeds model-specific instructions for Midjourney', () => {
    const prompt = buildMetaPrompt({
      idea: 'fantasy forest',
      intent: 'image',
      targetModel: 'midjourney',
      outputLanguage: 'en',
    });
    expect(prompt).toContain('/imagine');
  });

  it('mentions the output language in the rules', () => {
    const prompt = buildMetaPrompt({
      idea: 'write an article',
      intent: 'writing',
      targetModel: 'openai',
      outputLanguage: 'ar',
    });
    expect(prompt).toContain('ar');
  });
});
