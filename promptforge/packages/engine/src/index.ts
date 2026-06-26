// Intent classification & language detection
export { classifyIntent, detectLanguage } from './intents';
export type { Intent } from './intents';

// Framework types
export type { TargetModel, FrameworkSlots } from './frameworks';
export { INTENT_SLOTS } from './frameworks';

// Local (free, instant) layer
export { buildLocalPrompt } from './localBuild';
export type { LocalBuildInput, LocalBuildResult } from './localBuild';

// AI meta-prompt builder
export { buildMetaPrompt } from './metaPrompt';
export type { MetaPromptInput } from './metaPrompt';

// Target-model adapters (exported for advanced use)
export { adaptForClaude } from './adapters/claude';
export { adaptForOpenAI, adaptForOpenAIChat } from './adapters/openai';
export { adaptForMidjourney } from './adapters/midjourney';
export type { MidjourneyParams } from './adapters/midjourney';
export { adaptForStableDiffusion, formatStableDiffusionOutput } from './adapters/diffusion';
export type { StableDiffusionResult } from './adapters/diffusion';
