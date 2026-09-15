import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

import { totpGateLogoutFn, totpGateStatusFn } from '@/api/admin/system/auth';
import { TotpGateForm } from '@/components/TotpGateForm';
import {
  TOTP_GATE_REQUIRED_EVENT,
  authUtils,
  captureAuthSession,
  commitAuthViewSession,
  isCurrentAuthSession,
  subscribeAuthChanges,
  type UserInfo,
} from '@/utils/auth';
import {
  clearPrimaryAuthReturnTarget,
  completePrimaryAuthReturn,
  readTransferredToken,
  rememberPrimaryAuthReturnTarget,
} from '@/utils/authFlow';

export type AuthenticationPhase =
  | 'PRIMARY_AUTH_REQUIRED'
  | 'PRIMARY_AUTH_CALLBACK'
  | 'TOTP_REQUIRED'
  | 'READY'
  | 'CHECKING';

interface AuthenticationBoundaryProps {
  readonly scope: 'admin' | 'enterprise' | 'personal';
  readonly renderPrimaryAuth: () => ReactNode;
  readonly renderPrimaryAuthCallback: () => ReactNode;
  readonly children: ReactNode;
}

function isAuthenticationCallback(pathname: string): boolean {
  return pathname === '/sso/callback';
}

function transferredUser(token: string): UserInfo {
  return { id: 0, username: 'Loading...', langCode: 'zh-CN', token };
}

function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

export function AuthenticationBoundary({
  scope,
  renderPrimaryAuth,
  renderPrimaryAuthCallback,
  children,
}: AuthenticationBoundaryProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const session = useSyncExternalStore(subscribeAuthChanges, captureAuthSession);
  const evaluation = useRef(0);
  const transferredTokenHandled = useRef(false);
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);
  const [state, setState] = useState<{ phase: AuthenticationPhase; revision: number }>({
    phase: 'CHECKING',
    revision: session.revision,
  });
  const phase = state.revision === session.revision ? state.phase : 'CHECKING';

  const setPhase = useCallback(
    (next: AuthenticationPhase) => setState({ phase: next, revision: session.revision }),
    [session.revision],
  );

  useLayoutEffect(() => {
    pathnameRef.current = location.pathname;
    navigateRef.current = navigate;
  }, [location.pathname, navigate]);

  useLayoutEffect(() => {
    commitAuthViewSession(session);
  }, [session]);

  const redirectToAdmin = useCallback(() => {
    const adminUrl = import.meta.env.VITE_ADMIN_URL || '/admin';
    window.location.assign(
      `${adminUrl}/#/login?redirect=${encodeURIComponent(window.location.href)}`,
    );
  }, []);

  const evaluate = useCallback(async () => {
    const currentEvaluation = evaluation.current + 1;
    evaluation.current = currentEvaluation;
    const pathname = pathnameRef.current;
    const callback = isAuthenticationCallback(pathname);
    if (scope === 'admin') rememberPrimaryAuthReturnTarget();

    if (!transferredTokenHandled.current) {
      transferredTokenHandled.current = true;
      const urlToken = readTransferredToken();
      if (!session.token && urlToken) {
        authUtils.setUserInfo(transferredUser(urlToken));
        return;
      }
    }

    if (!session.token) {
      if (scope !== 'admin') {
        redirectToAdmin();
        return;
      }
      setPhase(callback ? 'PRIMARY_AUTH_CALLBACK' : 'PRIMARY_AUTH_REQUIRED');
      return;
    }

    setPhase('CHECKING');
    try {
      const response = await totpGateStatusFn({ data: {} });
      if (evaluation.current !== currentEvaluation || !isCurrentAuthSession(session)) return;
      if (!response.data.data.verified) {
        setPhase('TOTP_REQUIRED');
        return;
      }
      if (scope === 'admin' && pathname === '/login') {
        setPhase('READY');
        if (!completePrimaryAuthReturn()) navigateRef.current('/home', { replace: true });
        return;
      }
      setPhase('READY');
    } catch {
      if (evaluation.current !== currentEvaluation || !isCurrentAuthSession(session)) return;
      if (!authUtils.isAuthenticated()) {
        setPhase(callback ? 'PRIMARY_AUTH_CALLBACK' : 'PRIMARY_AUTH_REQUIRED');
      } else {
        setPhase('TOTP_REQUIRED');
      }
    }
  }, [redirectToAdmin, scope, session, setPhase]);

  useEffect(() => {
    void evaluate();
    return () => {
      evaluation.current += 1;
    };
  }, [evaluate]);

  useEffect(() => {
    const handleGateRequired = () => {
      if (!isCurrentAuthSession(session)) return;
      evaluation.current += 1;
      setPhase('TOTP_REQUIRED');
    };
    window.addEventListener(TOTP_GATE_REQUIRED_EVENT, handleGateRequired);
    return () => {
      window.removeEventListener(TOTP_GATE_REQUIRED_EVENT, handleGateRequired);
    };
  }, [session, setPhase]);

  useEffect(() => {
    if (phase === 'TOTP_REQUIRED' && scope !== 'admin') redirectToAdmin();
  }, [phase, redirectToAdmin, scope]);

  const logout = async () => {
    const currentEvaluation = evaluation.current;
    if (!isCurrentAuthSession(session)) return;
    try {
      await totpGateLogoutFn({ data: {}, timeout: 5_000 });
    } catch {
      // Clear local auth even if the cookie cleanup service is unavailable.
    }
    if (evaluation.current !== currentEvaluation || !isCurrentAuthSession(session)) return;
    clearPrimaryAuthReturnTarget();
    const loginUrl = new URL(window.location.href);
    loginUrl.search = '';
    loginUrl.hash = '/login';
    window.history.replaceState(window.history.state, '', loginUrl);
    // logout emits synchronously: it must not re-enter the abandoned SSO callback.
    pathnameRef.current = '/login';
    navigateRef.current('/login', { replace: true });
    authUtils.logout();
  };

  if (phase === 'CHECKING') return <LoadingScreen />;
  if (phase === 'PRIMARY_AUTH_CALLBACK') return <>{renderPrimaryAuthCallback()}</>;
  if (phase === 'PRIMARY_AUTH_REQUIRED') return <>{renderPrimaryAuth()}</>;
  if (phase === 'TOTP_REQUIRED') {
    if (scope !== 'admin') return <LoadingScreen />;
    const formEvaluation = evaluation.current;
    return (
      <TotpGateForm
        key={`${session.revision}:${formEvaluation}`}
        onLogout={logout}
        onVerified={() => {
          if (evaluation.current !== formEvaluation || !isCurrentAuthSession(session)) return;
          if (isAuthenticationCallback(location.pathname)) {
            setPhase('READY');
            return;
          }
          if (location.pathname === '/login') {
            setPhase('READY');
            if (!completePrimaryAuthReturn()) navigate('/home', { replace: true });
            return;
          }
          setPhase('READY');
        }}
      />
    );
  }
  return <Fragment key={session.revision}>{children}</Fragment>;
}
