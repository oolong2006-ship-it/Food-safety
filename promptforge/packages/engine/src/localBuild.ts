import { classifyIntent, detectLanguage, type Intent } from './intents';
import { INTENT_SLOTS, type FrameworkSlots, type TargetModel } from './frameworks';
import { adaptForClaude } from './adapters/claude';
import { adaptForOpenAI } from './adapters/openai';
import { adaptForMidjourney } from './adapters/midjourney';
import { adaptForStableDiffusion, formatStableDiffusionOutput } from './adapters/diffusion';

export interface LocalBuildInput {
  idea: string;
  targetModel: TargetModel;
  outputLanguage?: string;
}

export interface LocalBuildResult {
  prompt: string;
  intent: Intent;
  detectedLanguage: string;
  slots: FrameworkSlots;
}

const ROLES: Record<Intent, Record<string, string>> = {
  writing: {
    ar: 'أنت كاتب محترف متخصص في إنتاج محتوى إبداعي وفعّال يترك أثراً في القارئ',
    en: 'You are a professional writer specializing in compelling, high-impact content that resonates with readers',
  },
  coding: {
    ar: 'أنت مهندس برمجيات خبير بأكثر من 10 سنوات من الخبرة، متخصص في كتابة كود نظيف قابل للصيانة',
    en: 'You are a senior software engineer with 10+ years of experience, specializing in clean, maintainable, and efficient code',
  },
  image: { ar: '', en: '' },
  analysis: {
    ar: 'أنت محلل بيانات خبير مع خلفية قوية في الإحصاء والتحليل الكمي والنوعي',
    en: 'You are an expert data analyst with a strong background in both quantitative and qualitative analysis',
  },
  agent: {
    ar: 'أنت مصمم أنظمة ذكاء اصطناعي متخصص في بناء مساعدين ذكيين فعّالين ومركّزين',
    en: 'You are an AI systems designer specializing in building focused and effective intelligent assistants',
  },
  reasoning: {
    ar: 'أنت خبير في حل المشكلات والتفكير المنطقي المنهجي',
    en: 'You are an expert in systematic problem-solving and logical reasoning',
  },
  roleplay: {
    ar: 'أنت ممثل بارع قادر على تجسيد أي شخصية بواقعية عالية والتفاعل بأسلوبها الخاص',
    en: 'You are a skilled method actor capable of fully embodying any character with authentic voice and mannerisms',
  },
  education: {
    ar: 'أنت معلم محترف وموهوب قادر على شرح أعقد المفاهيم بأسلوب واضح ومبسّط ومشوّق',
    en: 'You are a gifted educator capable of explaining complex concepts clearly, simply, and engagingly',
  },
  translation: {
    ar: 'أنت مترجم محترف متخصص في الترجمة الدقيقة التي تحافظ على الروح والمعنى والفروق الثقافية',
    en: 'You are a professional translator specializing in accurate translation that preserves nuance, tone, and cultural context',
  },
};

const OUTPUT_FORMATS: Record<Intent, Record<string, string>> = {
  writing: {
    ar: 'اكتب النص بشكل منظم ومترابط. استخدم عناوين فرعية إذا كان المحتوى طويلاً. لغة سلسة وجذابة تناسب الجمهور المستهدف.',
    en: 'Write in an organized, flowing structure. Use subheadings for longer content. Language should be smooth and engaging, tailored to the target audience.',
  },
  coding: {
    ar: 'قدّم الكود داخل code block واضح مع تعليقات توضيحية مختصرة. اشرح منطق الحل بإيجاز قبل الكود وبعده.',
    en: 'Present code in a clearly formatted code block with brief inline comments. Explain the solution logic concisely before and after the code.',
  },
  image: {
    ar: 'وصف بصري تفصيلي وغني بالعناصر المرئية الرئيسية والأسلوب الفني والإضاءة والمزاج',
    en: 'Rich visual description with key elements, art style, lighting, mood, and composition details',
  },
  analysis: {
    ar: 'ملخص تنفيذي في البداية ثم التحليل التفصيلي في نقاط واضحة، ختام بالتوصيات',
    en: 'Executive summary first, then detailed analysis in clear points, concluding with actionable recommendations',
  },
  agent: {
    ar: 'تعليمات واضحة وشاملة تغطي: هوية المساعد، نطاق عمله، طريقة تعامله مع المستخدمين، القيود، أمثلة على الردود المثالية',
    en: 'Clear, comprehensive instructions covering: assistant identity, scope of work, interaction style, boundaries, and examples of ideal responses',
  },
  reasoning: {
    ar: 'اعرض تفكيرك خطوة بخطوة بشكل واضح قبل الإجابة النهائية. وضّح افتراضاتك وأثبت استنتاجاتك',
    en: 'Show your thinking step by step before the final answer. State your assumptions and prove your conclusions explicitly.',
  },
  roleplay: {
    ar: 'ابق في الشخصية طوال المحادثة. ردود نابعة من منطق الشخصية وتجاربها وطريقة تفكيرها. أضف عمقاً ووصفاً للحظات الدرامية',
    en: 'Stay in character throughout. Responses should emerge from the character\'s logic, experiences, and mindset. Add depth and description to dramatic moments.',
  },
  education: {
    ar: 'اشرح بأسلوب تدريجي من البسيط للمعقد. استخدم تشبيهات ومقارنات من الحياة اليومية. أضف أمثلة عملية وأسئلة للتفكير',
    en: 'Explain progressively from simple to complex. Use analogies from everyday life. Include practical examples and thought-provoking questions.',
  },
  translation: {
    ar: 'ترجمة طبيعية تراعي الفروق الثقافية والسياقية. لا تترجم حرفياً بل اهتم بالمعنى والأسلوب. إذا كان هناك تعبير محلي مناسب استخدمه',
    en: 'Natural translation that considers cultural and contextual nuances. Focus on meaning and style, not word-for-word. Use local expressions where appropriate.',
  },
};

const TONES: Record<Intent, Record<string, string>> = {
  writing:     { ar: 'احترافي وجذاب، يناسب الجمهور المستهدف', en: 'Professional and engaging, suited to the target audience' },
  coding:      { ar: 'تقني ودقيق مع توضيحات واضحة', en: 'Technical and precise with clear explanations' },
  image:       { ar: 'سينمائي، حيوي، بصري', en: 'Cinematic, vibrant, visually striking' },
  analysis:    { ar: 'موضوعي ومنهجي', en: 'Objective and systematic' },
  agent:       { ar: 'واضح ومباشر وشامل', en: 'Clear, direct, and comprehensive' },
  reasoning:   { ar: 'منطقي وتحليلي', en: 'Logical and analytical' },
  roleplay:    { ar: 'غامر وتفاعلي', en: 'Immersive and interactive' },
  education:   { ar: 'ودود، صبور، محفّز', en: 'Friendly, patient, encouraging' },
  translation: { ar: 'أمين للمعنى الأصلي', en: 'Faithful to the original meaning' },
};

function inferSlots(idea: string, intent: Intent, lang: string): FrameworkSlots {
  const slots: FrameworkSlots = { objective: idea };
  const relevant = INTENT_SLOTS[intent];

  if (relevant.includes('role') && ROLES[intent]?.[lang]) {
    slots.role = ROLES[intent][lang];
  }

  if (relevant.includes('outputFormat') && OUTPUT_FORMATS[intent]?.[lang]) {
    slots.outputFormat = OUTPUT_FORMATS[intent][lang];
  }

  if (relevant.includes('tone') && TONES[intent]?.[lang]) {
    slots.tone = TONES[intent][lang];
  }

  if (relevant.includes('reasoning')) {
    slots.reasoning = true;
  }

  return slots;
}

export function buildLocalPrompt(input: LocalBuildInput): LocalBuildResult {
  const { idea, targetModel, outputLanguage } = input;
  const detectedLanguage = outputLanguage ?? detectLanguage(idea);
  const intent = classifyIntent(idea);
  const slots = inferSlots(idea, intent, detectedLanguage);

  let prompt: string;

  switch (targetModel) {
    case 'claude':
      prompt = adaptForClaude(slots);
      break;
    case 'openai':
    case 'gemini':
      prompt = adaptForOpenAI(slots);
      break;
    case 'midjourney':
      prompt = adaptForMidjourney(slots, {
        ar: intent === 'image' ? '1:1' : '16:9',
        v: '6',
        q: 1,
        style: 'raw',
      });
      break;
    case 'dalle':
    case 'stablediffusion': {
      const result = adaptForStableDiffusion(slots);
      prompt = formatStableDiffusionOutput(result);
      break;
    }
    default:
      prompt = adaptForClaude(slots);
  }

  return { prompt, intent, detectedLanguage, slots };
}
