import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Box } from '@mui/material';
import { MenuContext } from '@/contexts/MenuContext';
import { PermissionContext } from '@/contexts/PermissionContext';
import { setTranslations } from '@/hooks/useTranslation';
import sharedZh from '@/locales/zh-CN';
import sharedEn from '@/locales/en-US';
import PersonalAssetPage from '../../../apps/personal/src/pages/asset';
import personalLocales from '../../../apps/personal/src/locales';
import PreviewTheme from './PreviewTheme';

// This localhost-only fixture has no real identity, token or production connection.
localStorage.setItem(
  'userInfo',
  JSON.stringify({
    id: 42,
    username: 'preview-user',
    token: 'synthetic-preview',
    langCode: 'zh-CN',
  }),
);
setTranslations('zh-CN', { ...sharedZh, ...personalLocales['zh-CN'] });
setTranslations('en-US', { ...sharedEn, ...personalLocales['en-US'] });
const codes = new Set([
  'personal.asset:read',
  'personal.asset:update',
  'enterprise.tenant:read',
  'enterprise.asset:read',
]);
const root = document.getElementById('root');
if (!root) throw new Error('Missing preview container');

createRoot(root).render(
  <PreviewTheme>
    <HashRouter>
      <MenuContext.Provider
        value={{ navItems: [], setNavItems: () => {}, loading: false, loadMenus: async () => [] }}
      >
        <PermissionContext.Provider
          value={{
            permissions: [],
            permissionCodes: codes,
            loading: false,
            hasAnyPermission: (wanted) => wanted.some((code) => codes.has(code)),
            hasAllPermissions: (wanted) => wanted.every((code) => codes.has(code)),
            refreshPermissions: async () => {},
          }}
        >
          <Box sx={{ bgcolor: 'warning.light', color: 'warning.contrastText', px: 2, py: 1 }}>
            隔离本地预览 · 全部为合成数据 · 不连接生产或真实设备
          </Box>
          <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: 'auto' }}>
            <PersonalAssetPage />
          </Box>
        </PermissionContext.Provider>
      </MenuContext.Provider>
    </HashRouter>
  </PreviewTheme>,
);
