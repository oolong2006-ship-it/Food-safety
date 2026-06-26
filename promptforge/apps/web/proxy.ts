import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for those that should not be internationalized
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
