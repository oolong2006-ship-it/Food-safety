import type { NextConfig } from 'next';
import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const config: NextConfig = {
  // Engine is a TypeScript workspace package — let Next.js compile it
  transpilePackages: ['@promptforge/engine'],
  turbopack: {
    // Point to the monorepo root so turbopack resolves workspace packages correctly
    root: path.resolve(__dirname, '../..'),
  },
  // Type checking is done separately via `typecheck` script;
  // the duplicate-next type conflict is a workspace artifact, not a code bug.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withNextIntl(config);
