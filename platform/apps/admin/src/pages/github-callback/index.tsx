import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress } from '@mui/material';
import { showSnackbar } from '@/components/Notification';
import { authUtils } from '@/utils/auth';
import { githubLoginFn, githubBindFn } from '@/api/admin/system/auth';
import { useMenu } from '@/hooks/useMenu';
import { findFirstValidPath } from '@/hooks/useFirstValidPath';
import { usePermission } from '@/hooks/usePermission';
import { useTranslation } from '@/hooks/useTranslation';

export default function GithubCallback() {
  const navigate = useNavigate();
  const t = useTranslation();
  const [errorMsg, setErrorMsg] = useState('');
  const { loadMenus } = useMenu();
  const { refreshPermissions } = usePermission();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setErrorMsg(t('github.noCode'));
      return;
    }

    const doCallback = async () => {
      try {
        const isBindMode = state === 'bind';

        if (isBindMode) {
          // 明确为绑定模式
          if (!authUtils.isAuthenticated()) {
            setErrorMsg(t('github.authFailedRetry'));
            return;
          }
          await githubBindFn({ data: { code } });
          
          showSnackbar({ message: t('github.bindSuccess'), type: 'success' });
          // 清除 URL 中的 code
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          
          navigate('/me', { replace: true });
        } else {
          // 明确为登录模式，先清理可能的旧 token 避免污染请求
          authUtils.removeUserInfo();

          const response = await githubLoginFn({ data: { code } });
          const { userObj } = response.data.data;
          authUtils.setUserInfo(userObj);
          
          const [menus] = await Promise.all([loadMenus(), refreshPermissions()]);
          const nextPath = findFirstValidPath(menus);
          
          // 清除 URL 中的 code
          window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
          
          navigate(nextPath, { replace: true });
          showSnackbar({ message: t('github.loginSuccess'), type: 'success' });
        }
      } catch {
        setErrorMsg(t('github.authFailedRetry'));
      }
    };

    doCallback();
  }, [navigate, loadMenus, refreshPermissions, t]);

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      {errorMsg ? (
        <>
          <Typography color="error" variant="h6">
            {t('github.authFailed')}
          </Typography>
          <Typography color="error">{errorMsg}</Typography>
          <Typography
            sx={{ mt: 2, cursor: 'pointer', color: 'primary.main', textDecoration: 'underline' }}
            onClick={() => navigate(authUtils.isAuthenticated() ? '/me' : '/login', { replace: true })}
          >
            {t('github.back')}
          </Typography>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography>{t('github.verifying')}</Typography>
        </>
      )}
    </Box>
  );
}
