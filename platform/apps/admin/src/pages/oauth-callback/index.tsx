import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { showSnackbar } from '@/components/Notification';
import { authUtils } from '@/utils/auth';
import { oauthAccountCallbackFn, oauthLoginCallbackFn } from '@/api/admin/system/auth';
import { useTranslation } from '@/hooks/useTranslation';

function readCallbackParameters() {
  const hash = window.location.hash;
  const queryIndex = hash.indexOf('?');
  const hashSearch = queryIndex >= 0 ? hash.slice(queryIndex + 1) : '';
  const searchParams = new URLSearchParams(window.location.search || hashSearch);
  return {
    code: searchParams.get('code'),
    state: searchParams.get('state'),
  };
}

export default function OAuthCallback() {
  const navigate = useNavigate();
  const t = useTranslation();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const { code, state } = readCallbackParameters();
    if (!code || !state) {
      setErrorMessage(t('oauth.missingCallbackParameters'));
      return;
    }

    const processCallback = async () => {
      try {
        if (authUtils.isAuthenticated()) {
          const response = await oauthAccountCallbackFn({ data: { code, state } });
          showSnackbar({
            message: response.data.data.unbound ? t('oauth.unbindSuccess') : t('oauth.bindSuccess'),
            type: 'success',
          });
          navigate('/me', { replace: true });
          return;
        }

        authUtils.removeUserInfo();
        const response = await oauthLoginCallbackFn({ data: { code, state } });
        authUtils.setUserInfo(response.data.data.userObj);
        navigate('/login', { replace: true });
        showSnackbar({ message: t('oauth.loginSuccess'), type: 'success' });
      } catch {
        setErrorMessage(t('oauth.authFailedRetry'));
      }
    };

    void processCallback();
  }, [navigate, t]);

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
            {t('oauth.authFailed')}
          </Typography>
          <Typography color="error">{errorMessage}</Typography>
          <Typography
            role="link"
            tabIndex={0}
            sx={{ mt: 2, cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
            onClick={() =>
              navigate(authUtils.isAuthenticated() ? '/me' : '/login', { replace: true })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                navigate(authUtils.isAuthenticated() ? '/me' : '/login', { replace: true });
              }
            }}
          >
            {t('oauth.back')}
          </Typography>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography>{t('oauth.verifying')}</Typography>
        </>
      )}
    </Box>
  );
}
