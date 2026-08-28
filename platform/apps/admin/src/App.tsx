import AppRoutes from './routes';
import { useLoadTranslations } from '@/hooks/useLoadTranslations';
import { ThemeProvider } from '@/theme';
import { MenuProvider } from '@/contexts/MenuContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { ChunkErrorBoundary } from '@/components/ChunkErrorBoundary';
import { mergeTranslations, getPreferredLangCode } from '@/hooks/useTranslation';
import appLocales from './locales';

// 根据用户偏好语言同步注入 admin 专属文案（优先英语 en-US，偏好语言同步合并）
const userLang = getPreferredLangCode();
if (appLocales['en-US']) mergeTranslations('en-US', appLocales['en-US']);
if (appLocales[userLang]) {
  mergeTranslations(userLang, appLocales[userLang]);
}

import keySvg from '@/assets/imgs/key.svg?raw';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useThemeMode } from '@/hooks/useThemeMode';
import { AuthenticationBoundary } from '@/components/AuthenticationBoundary';
import { CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';

const Login = lazy(() => import('./pages/login'));
const OAuthCallback = lazy(() => import('./pages/oauth-callback'));
const SsoCallback = lazy(() => import('./pages/sso-callback'));

function AuthPageLoading() {
  return <CircularProgress />;
}

function renderPrimaryAuth() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <Login />
    </Suspense>
  );
}

function PrimaryAuthCallback() {
  const location = useLocation();
  const Callback = location.pathname === '/sso/callback' ? SsoCallback : OAuthCallback;
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <Callback />
    </Suspense>
  );
}

function renderPrimaryAuthCallback() {
  return <PrimaryAuthCallback />;
}

function App() {
  const isTranslationsLoaded = useLoadTranslations();
  const [progress, setProgress] = useState(0);
  const [shouldRender, setShouldRender] = useState(false);
  const { isDark, mode } = useThemeMode();

  // 提前设置 data-theme，确保加载屏幕期间 CSS 变量也能正确生效
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    let timer: number | undefined;
    if (!isTranslationsLoaded) {
      timer = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 92) return prev;
          const remaining = 95 - prev;
          const diff = Math.random() * remaining * 0.15 + 0.5;
          return Math.min(92, prev + diff);
        });
      }, 100);
    } else {
      setProgress(100);
      const delayTimer = window.setTimeout(() => {
        setShouldRender(true);
      }, 300);
      return () => window.clearTimeout(delayTimer);
    }

    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isTranslationsLoaded]);

  if (!shouldRender) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? '#111827' : '#f9fafb',
          transition: 'opacity 0.3s',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* 扁平优雅的 SVG Key 标志 */}
          <div
            style={{
              width: 48,
              height: 48,
              marginBottom: 32,
              opacity: 0.8,
              color: isDark ? '#90caf9' : '#1976d2',
            }}
            dangerouslySetInnerHTML={{ __html: keySvg }}
          />

          {/* 进度条轨道 */}
          <div
            style={{
              width: 180,
              height: 3,
              borderRadius: 9999,
              overflow: 'hidden',
              position: 'relative',
              backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
            }}
          >
            <div
              style={{
                height: '100%',
                transition: 'all 0.3s ease-out',
                background: 'linear-gradient(to right, #1976d2, #9c27b0)',
                width: `${progress}%`,
              }}
            />
          </div>

          {/* 加载文字提示 */}
          <span
            style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              marginTop: 20,
              fontFamily: 'monospace',
              color: isDark ? '#4b5563' : '#9ca3af',
            }}
          >
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <ChunkErrorBoundary>
      <ThemeProvider>
        <AuthenticationBoundary
          scope="admin"
          renderPrimaryAuth={renderPrimaryAuth}
          renderPrimaryAuthCallback={renderPrimaryAuthCallback}
        >
          <PermissionProvider>
            <MenuProvider>
              <AppRoutes />
            </MenuProvider>
          </PermissionProvider>
        </AuthenticationBoundary>
      </ThemeProvider>
    </ChunkErrorBoundary>
  );
}

export default App;
