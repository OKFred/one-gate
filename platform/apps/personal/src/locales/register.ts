import { getTranslations, mergeTranslations } from '@/hooks/useTranslation';
import appLocales from './index';

// Database hot fixes may already be loaded by the host application.
for (const [language, defaults] of Object.entries(appLocales)) {
  mergeTranslations(language, { ...defaults, ...getTranslations(language) });
}
