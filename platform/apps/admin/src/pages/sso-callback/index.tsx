import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { showSnackbar } from '@/components/Notification';
import { authUtils } from '@/utils/auth';
import { ssoAccountCallbackFn, ssoLoginCallbackFn } from '@/api/admin/system/auth';
import { useTranslation } from '@/hooks/useTranslation';
import type { SsoCallbackIntent } from '@/utils/oauthCallback';

function readCallbackParameters() {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  const hashSearch = queryIndex >= 0 ? hash.slice(queryIndex + 1) : '';
  const searchParams = new URLSearchParams(window.location.search || hashSearch);
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
    intent: searchParams.get('intent'),
  };
}

function isSsoCallbackIntent(value: string | null): value is SsoCallbackIntent {
  return value === 'login' || value === 'bind';
}

export default function SsoCallback() {
  const navigate = useNavigate();
  const t = useTranslation();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const { code, state, intent } = readCallbackParameters();
    if (!code || !state || !isSsoCallbackIntent(intent)) {
      setErrorMessage(t('sso.missingCallbackParameters'));
      return;
    }

    const processCallback = async () => {
      try {
        if (intent === 'bind') {
          await ssoAccountCallbackFn({ data: { code, state } });
          showSnackbar({ message: t('sso.bindSuccess'), type: 'success' });
          navigate('/me', { replace: true });
          return;
        }

        authUtils.removeUserInfo();
        const response = await ssoLoginCallbackFn({ data: { code, state } });
        authUtils.setUserInfo(response.data.data.userObj);
        navigate('/login', { replace: true });
        showSnackbar({ message: t('sso.loginSuccess'), type: 'success' });
      } catch {
        setErrorMessage(t('sso.authFailedRetry'));
      }
    };

    void processCallback();
  }, [navigate, t]);

  const backPath = authUtils.isAuthenticated() ? '/me' : '/login';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {errorMessage ? (
        <>
          <Typography color="error" variant="h6">
            {t('sso.authFailed')}
          </Typography>
          <Typography color="error">{errorMessage}</Typography>
          <Typography
            role="link"
            tabIndex={0}
            sx={{ mt: 2, cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
            onClick={() => navigate(backPath, { replace: true })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') navigate(backPath, { replace: true });
            }}
          >
            {t('sso.back')}
          </Typography>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography>{t('sso.verifying')}</Typography>
        </>
      )}
    </Box>
  );
}
