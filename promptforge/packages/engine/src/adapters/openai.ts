import type { FrameworkSlots } from '../frameworks';

export function adaptForOpenAI(slots: FrameworkSlots): string {
  const sections: string[] = [];

  if (slots.role) {
    sections.push(`# Role\n${slots.role}`);
  }

  sections.push(`# Task\n${slots.objective}`);

  if (slots.context) {
    sections.push(`# Context\n${slots.context}`);
  }

  if (slots.constraints?.length) {
    const list = slots.constraints.map(c => `- ${c}`).join('\n');
    sections.push(`# Constraints\n${list}`);
  }

  if (slots.tone) {
    sections.push(`# Tone & Style\n${slots.tone}`);
  }

  if (slots.examples?.length) {
    sections.push(`# Examples\n${slots.examples.join('\n\n')}`);
  }

  if (slots.outputFormat) {
    sections.push(`# Output Format\n${slots.outputFormat}`);
  }

  if (slots.reasoning) {
    sections.push(
      `# Instructions\n1. Think step by step before writing your final answer.\n2. Show your reasoning process clearly.\n3. Double-check your conclusion before responding.`,
    );
  }

  return sections.join('\n\n');
}

/** Separate system prompt and user message for the Chat Completions API */
export function adaptForOpenAIChat(slots: FrameworkSlots): {
  system: string;
  user: string;
} {
  const systemParts: string[] = [];

  if (slots.role) systemParts.push(slots.role);
  if (slots.constraints?.length) {
    systemParts.push(`Rules:\n${slots.constraints.map(c => `- ${c}`).join('\n')}`);
  }
  if (slots.tone) systemParts.push(`Tone: ${slots.tone}`);
  if (slots.outputFormat) systemParts.push(`Output format: ${slots.outputFormat}`);
  if (slots.reasoning) systemParts.push('Think step by step before answering.');

  const userParts: string[] = [slots.objective];
  if (slots.context) userParts.push(`\nContext: ${slots.context}`);
  if (slots.examples?.length) userParts.push(`\nExamples:\n${slots.examples.join('\n')}`);

  return {
    system: systemParts.join('\n\n'),
    user: userParts.join(''),
  };
}
