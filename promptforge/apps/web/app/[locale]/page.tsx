import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/navigation';
import PromptForge from '../../components/PromptForge';

export default function HomePage() {
  const t = useTranslations();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-forge-bg)' }}>
      {/* Navigation */}
      <nav
        className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: 'var(--color-forge-border)', backgroundColor: 'var(--color-forge-surface)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #7c6af5, #f59e0b)' }}
          >
            PF
          </div>
          <span className="font-semibold text-lg" style={{ color: 'var(--color-forge-text)' }}>
            {t('app.title')}
          </span>
        </div>

        <Link
          href={t('nav.switch_lang_href')}
          className="text-sm px-4 py-2 rounded-lg border font-medium"
          style={{
            borderColor: 'var(--color-forge-border)',
            color: 'var(--color-forge-muted)',
          }}
        >
          {t('nav.switch_lang')}
        </Link>
      </nav>

      {/* Hero */}
      <div className="text-center pt-16 pb-8 px-6">
        <h1
          className="text-4xl font-bold mb-3"
          style={{ color: 'var(--color-forge-text)' }}
        >
          {t('app.title')}
        </h1>
        <p className="text-xl" style={{ color: 'var(--color-forge-muted)' }}>
          {t('app.tagline')}
        </p>
      </div>

      {/* Main forge area */}
      <main className="flex-1 px-4 pb-16">
        <PromptForge />
      </main>

      {/* Footer */}
      <footer
        className="text-center py-4 text-sm border-t"
        style={{ borderColor: 'var(--color-forge-border)', color: 'var(--color-forge-muted)' }}
      >
        {t('footer.text')}
      </footer>
    </div>
  );
}
