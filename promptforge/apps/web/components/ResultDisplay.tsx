'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ForgeResult } from './PromptForge';

interface Props {
  result: ForgeResult;
  onReset: () => void;
}

export default function ResultDisplay({ result, onReset }: Props) {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(result.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasExtras = result.variants?.length || result.rationale || result.tips?.length;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--color-forge-card)',
        borderColor: 'var(--color-forge-border)',
      }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--color-forge-border)' }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="font-semibold"
            style={{ color: 'var(--color-forge-text)' }}
          >
            {t('result.title')}
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              backgroundColor: result.isAI ? '#2e1a5e' : '#1a2e1a',
              color: result.isAI ? '#a78bfa' : '#4ade80',
            }}
          >
            {result.isAI ? t('result.ai_badge') : t('result.local_badge')}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: 'var(--color-forge-surface)', color: 'var(--color-forge-muted)' }}
          >
            {t(`intents.${result.intent}`)}
          </span>
        </div>

        <button
          onClick={onReset}
          className="text-xs px-3 py-1.5 rounded-lg border"
          style={{
            borderColor: 'var(--color-forge-border)',
            color: 'var(--color-forge-muted)',
          }}
        >
          {t('result.generate_new')}
        </button>
      </div>

      {/* Main prompt */}
      <div className="p-6 space-y-3">
        <div
          className="prompt-block rounded-xl p-4 relative group"
          style={{
            backgroundColor: 'var(--color-forge-surface)',
            color: 'var(--color-forge-text)',
            border: '1px solid var(--color-forge-border)',
          }}
        >
          <pre className="prompt-block whitespace-pre-wrap">{result.prompt}</pre>

          <button
            onClick={handleCopy}
            className="absolute top-3 end-3 px-3 py-1.5 rounded-lg text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
            style={{
              backgroundColor: copied ? '#065f46' : 'var(--color-forge-primary)',
              color: '#fff',
            }}
          >
            {copied ? t('result.copied') : t('result.copy')}
          </button>
        </div>

        {/* Always-visible copy button for mobile */}
        <button
          onClick={handleCopy}
          className="w-full py-2 rounded-xl text-sm font-medium sm:hidden"
          style={{
            backgroundColor: copied ? '#065f46' : 'var(--color-forge-primary)',
            color: '#fff',
          }}
        >
          {copied ? t('result.copied') : t('result.copy')}
        </button>
      </div>

      {/* Expandable extras (AI-only sections) */}
      {hasExtras && (
        <div
          className="border-t"
          style={{ borderColor: 'var(--color-forge-border)' }}
        >
          {/* Variants */}
          {result.variants?.length ? (
            <Accordion
              title={t('result.variants_title')}
              open={variantsOpen}
              onToggle={() => setVariantsOpen(v => !v)}
            >
              <div className="space-y-3">
                {result.variants.map((v, i) => (
                  <VariantBlock key={i} text={v} copyLabel={t('result.copy')} copiedLabel={t('result.copied')} />
                ))}
              </div>
            </Accordion>
          ) : null}

          {/* Rationale */}
          {result.rationale && (
            <Accordion
              title={t('result.rationale_title')}
              open={rationaleOpen}
              onToggle={() => setRationaleOpen(v => !v)}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-forge-text)' }}>
                {result.rationale}
              </p>
            </Accordion>
          )}

          {/* Tips */}
          {result.tips?.length ? (
            <Accordion
              title={t('result.tips_title')}
              open={tipsOpen}
              onToggle={() => setTipsOpen(v => !v)}
            >
              <ul className="space-y-2">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-forge-text)' }}>
                    <span style={{ color: 'var(--color-forge-primary)' }}>•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </Accordion>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t" style={{ borderColor: 'var(--color-forge-border)' }}>
      <button
        onClick={onToggle}
        className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-start"
        style={{ color: 'var(--color-forge-muted)' }}
      >
        <span>{title}</span>
        <span
          className="text-xs"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}
        >
          ▾
        </span>
      </button>
      {open && (
        <div className="px-6 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

function VariantBlock({
  text,
  copyLabel,
  copiedLabel,
}: {
  text: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="prompt-block rounded-lg p-3 relative group"
      style={{
        backgroundColor: 'var(--color-forge-surface)',
        border: '1px solid var(--color-forge-border)',
        color: 'var(--color-forge-text)',
      }}
    >
      <pre className="text-xs whitespace-pre-wrap">{text}</pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 end-2 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: copied ? '#065f46' : 'var(--color-forge-primary)',
          color: '#fff',
        }}
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
