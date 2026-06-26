'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { buildLocalPrompt } from '@promptforge/engine';
import type { TargetModel, Intent } from '@promptforge/engine';
import ResultDisplay from './ResultDisplay';

type OutputLang = 'ar' | 'en' | 'es' | 'fr' | 'de';

export interface ForgeResult {
  prompt: string;
  variants?: string[];
  rationale?: string;
  tips?: string[];
  intent: Intent;
  detectedLanguage: string;
  isAI: boolean;
}

const TARGET_MODELS: TargetModel[] = [
  'claude', 'openai', 'gemini', 'midjourney', 'dalle', 'stablediffusion',
];

const OUTPUT_LANGUAGES: OutputLang[] = ['ar', 'en', 'es', 'fr', 'de'];

const MODEL_ICONS: Record<TargetModel, string> = {
  claude:          '🤖',
  openai:          '💬',
  gemini:          '♊',
  midjourney:      '🎨',
  dalle:           '🖼️',
  stablediffusion: '⚗️',
};

export default function PromptForge() {
  const t = useTranslations();

  const [idea, setIdea] = useState('');
  const [targetModel, setTargetModel] = useState<TargetModel>('claude');
  const [outputLang, setOutputLang] = useState<OutputLang>('ar');
  const [result, setResult] = useState<ForgeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickGenerate = useCallback(async () => {
    if (!idea.trim()) {
      setError(t('errors.empty_idea'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const built = buildLocalPrompt({ idea, targetModel, outputLanguage: outputLang });
      setResult({
        prompt: built.prompt,
        intent: built.intent,
        detectedLanguage: built.detectedLanguage,
        isAI: false,
      });
    } finally {
      setLoading(false);
    }
  }, [idea, targetModel, outputLang, t]);

  const handleAIUpgrade = useCallback(async () => {
    if (!idea.trim()) {
      setError(t('errors.empty_idea'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, targetModel, outputLanguage: outputLang }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error ?? t('errors.api_error'));
      }

      const data = await res.json() as Omit<ForgeResult, 'isAI'>;
      setResult({ ...data, isAI: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.api_error'));
    } finally {
      setLoading(false);
    }
  }, [idea, targetModel, outputLang, t]);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">

      {/* Forge Card */}
      <div
        className="rounded-2xl border p-6 space-y-5"
        style={{
          backgroundColor: 'var(--color-forge-card)',
          borderColor: 'var(--color-forge-border)',
        }}
      >
        {/* Idea textarea */}
        <div className="space-y-2">
          <label
            className="text-sm font-medium"
            style={{ color: 'var(--color-forge-muted)' }}
          >
            {t('form.idea_label')}
          </label>
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value)}
            placeholder={t('form.idea_placeholder')}
            rows={5}
            className="w-full rounded-xl border px-4 py-3 resize-none outline-none text-sm"
            style={{
              backgroundColor: 'var(--color-forge-surface)',
              borderColor: 'var(--color-forge-border)',
              color: 'var(--color-forge-text)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-forge-primary)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-forge-border)')}
          />
        </div>

        {/* Model + Language selectors */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Target model */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--color-forge-muted)' }}
            >
              {t('form.target_model_label')}
            </label>
            <div className="flex flex-wrap gap-2">
              {TARGET_MODELS.map(m => (
                <button
                  key={m}
                  onClick={() => setTargetModel(m)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                  style={{
                    backgroundColor: targetModel === m ? 'var(--color-forge-primary)' : 'var(--color-forge-surface)',
                    borderColor: targetModel === m ? 'var(--color-forge-primary)' : 'var(--color-forge-border)',
                    color: targetModel === m ? '#fff' : 'var(--color-forge-muted)',
                  }}
                >
                  {MODEL_ICONS[m]} {t(`models.${m}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Output language */}
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              style={{ color: 'var(--color-forge-muted)' }}
            >
              {t('form.output_language_label')}
            </label>
            <select
              value={outputLang}
              onChange={e => setOutputLang(e.target.value as OutputLang)}
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{
                backgroundColor: 'var(--color-forge-surface)',
                borderColor: 'var(--color-forge-border)',
                color: 'var(--color-forge-text)',
              }}
            >
              {OUTPUT_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>
                  {t(`languages.${lang}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-sm rounded-lg px-4 py-2" style={{ color: '#f87171', backgroundColor: '#1f1520' }}>
            {error}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleQuickGenerate}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-semibold text-sm border disabled:opacity-50"
            style={{
              backgroundColor: 'var(--color-forge-surface)',
              borderColor: 'var(--color-forge-border)',
              color: 'var(--color-forge-text)',
            }}
          >
            {loading ? t('form.generating') : t('form.btn_quick')}
            <span
              className="block text-xs font-normal mt-0.5"
              style={{ color: 'var(--color-forge-muted)' }}
            >
              {t('form.btn_quick_hint')}
            </span>
          </button>

          <button
            onClick={handleAIUpgrade}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--color-forge-primary), #a855f7)',
              color: '#fff',
            }}
          >
            {loading ? t('form.upgrading') : t('form.btn_upgrade')}
            <span className="block text-xs font-normal mt-0.5 opacity-80">
              {t('form.btn_upgrade_hint')}
            </span>
          </button>
        </div>
      </div>

      {/* Result */}
      {result && !loading && (
        <ResultDisplay
          result={result}
          onReset={() => setResult(null)}
        />
      )}
    </div>
  );
}
