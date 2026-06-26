export type Intent =
  | 'writing'
  | 'coding'
  | 'image'
  | 'analysis'
  | 'agent'
  | 'reasoning'
  | 'roleplay'
  | 'education'
  | 'translation';

// Longer keywords score 2 points; single words score 1 — reduces false positives
const INTENT_KEYWORDS: Record<Intent, string[]> = {
  writing: [
    'write', 'اكتب', 'article', 'مقال', 'email', 'رسالة', 'blog', 'post',
    'marketing', 'تسويق', 'content', 'محتوى', 'essay', 'story', 'قصة',
    'رواية', 'caption', 'newsletter', 'announcement', 'إعلان', 'copywriting',
    'social media post', 'تغريدة', 'منشور', 'cover letter',
  ],
  coding: [
    'code', 'كود', 'function', 'دالة', 'bug', 'debug', 'class', 'api',
    'script', 'برمج', 'implement', 'refactor', 'برمجة', 'algorithm',
    'خوارزمية', 'component', 'unit test', 'اختبار وحدة', 'database query',
    'sql', 'endpoint', 'type', 'interface', 'typescript', 'python', 'react',
  ],
  image: [
    'image', 'صورة', 'photo', 'illustration', 'رسم', 'artwork', 'portrait',
    'landscape', 'generate image', 'midjourney', 'dall-e', 'stable diffusion',
    'visual', 'فن', 'art style', 'fantasy', 'realistic photo', 'render',
    'generate a', 'visualize', 'draw me', 'create an image', 'صمّم صورة',
  ],
  analysis: [
    'analyze', 'حلل', 'analysis', 'تحليل', 'data', 'بيانات', 'report',
    'تقرير', 'statistics', 'إحصاء', 'evaluate', 'assess', 'compare', 'قارن',
    'benchmark', 'market analysis', 'تحليل السوق', 'insights', 'trends',
  ],
  agent: [
    'agent', 'وكيل', 'system prompt', 'assistant', 'مساعد', 'chatbot', 'bot',
    'autonomous', 'workflow', 'customer support agent', 'sales bot',
    'شخصية النظام', 'build an ai', 'ai assistant',
  ],
  reasoning: [
    'solve', 'حل', 'problem', 'مشكلة', 'logic', 'منطق', 'plan', 'strategy',
    'استراتيجية', 'decision', 'why', 'لماذا', 'proof', 'برهان', 'debate',
    'نقاش', 'pros and cons', 'مزايا وعيوب', 'think through', 'calculate',
  ],
  roleplay: [
    'pretend', 'roleplay', 'act as', 'character', 'شخصية', 'play', 'scenario',
    'imagine', 'تخيل', 'simulate', 'تمثيل', 'impersonate', 'you are',
    'تصرف كأنك', 'play the role',
  ],
  education: [
    'explain', 'اشرح', 'teach', 'علّم', 'tutorial', 'lesson', 'درس',
    'beginner guide', 'how to learn', 'step by step', 'خطوة بخطوة',
    'what is', 'ما هو', 'ما هي', 'how does', 'كيف يعمل', 'دليل المبتدئين',
    'simplify', 'اشرح ببساطة',
  ],
  translation: [
    'translate', 'ترجم', 'translation', 'ترجمة', 'from arabic to',
    'from english to', 'للعربية', 'للإنجليزية', 'into arabic', 'into english',
    'localize', 'توطين',
  ],
};

export function classifyIntent(text: string): Intent {
  const lower = text.toLowerCase();
  const scores = {} as Record<Intent, number>;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [Intent, string[]][]) {
    scores[intent] = 0;
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        // Multi-word phrases score higher to reduce ambiguity
        scores[intent] += kw.includes(' ') ? 3 : kw.length > 5 ? 2 : 1;
      }
    }
  }

  const sorted = (Object.entries(scores) as [Intent, number][]).sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'writing';
}

export function detectLanguage(text: string): 'ar' | 'en' {
  const arabicCount = (text.match(/[؀-ۿ]/g) ?? []).length;
  const letterCount = (text.match(/[a-zA-Z؀-ۿ]/g) ?? []).length;
  if (letterCount === 0) return 'en';
  // Majority-wins threshold: > 50% Arabic characters → Arabic
  return arabicCount / letterCount > 0.5 ? 'ar' : 'en';
}
