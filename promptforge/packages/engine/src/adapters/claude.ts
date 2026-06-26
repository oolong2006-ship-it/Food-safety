import type { FrameworkSlots } from '../frameworks';

export function adaptForClaude(slots: FrameworkSlots): string {
  const parts: string[] = [];

  if (slots.role) {
    parts.push(`<role>\n${slots.role}\n</role>`);
  }

  parts.push(`<task>\n${slots.objective}\n</task>`);

  if (slots.context) {
    parts.push(`<context>\n${slots.context}\n</context>`);
  }

  if (slots.constraints?.length) {
    const list = slots.constraints.map(c => `- ${c}`).join('\n');
    parts.push(`<constraints>\n${list}\n</constraints>`);
  }

  if (slots.tone) {
    parts.push(`<tone>${slots.tone}</tone>`);
  }

  if (slots.examples?.length) {
    parts.push(`<examples>\n${slots.examples.join('\n\n')}\n</examples>`);
  }

  if (slots.outputFormat) {
    parts.push(`<output_format>\n${slots.outputFormat}\n</output_format>`);
  }

  if (slots.reasoning) {
    parts.push(
      `<thinking>\nBefore responding, think step by step through the problem. Show your reasoning process explicitly.\n</thinking>`,
    );
  }

  return parts.join('\n\n');
}
