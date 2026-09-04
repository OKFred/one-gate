import { TextField, Button, Box, Stack, CircularProgress, IconButton } from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { loginFn, ssoLoginUrlFn } from '@/api/admin/system/auth';
import type { LoginReq } from '@/api/admin/system/type';
import { authUtils } from '@/utils/auth';
import { useResponsive } from '@/hooks/useResponsive';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';
import { getSsoCallbackUrl } from '@/utils/ssoCallback';

export default function TheForm() {
  const { isMobile } = useResponsive();
  const t = useTranslation();

  // 状态管理
  const [credentials, setCredentials] = useState<LoginReq>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 处理输入变化
  const handleInputChange =
    (field: keyof LoginReq) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev: LoginReq) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  // 处理普通登录
  const handleLogin = async () => {
    if (!credentials.username || !credentials.password) {
      showSnackbar({ message: t('form.missingCredentials'), type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const data = { ...credentials };
      data.password = globalThis.btoa(credentials.password); // 防小白
      const response = await loginFn({ data });
      const loginData = response.data.data;
      const { userObj } = loginData;
      authUtils.setUserInfo(userObj);
    } catch {
      // Global HTTP interception presents the error.
    } finally {
      setLoading(false);
    }
  };

  const handleSsoLogin = async () => {
    try {
      setLoading(true);
      const response = await ssoLoginUrlFn({
        data: { redirectUri: getSsoCallbackUrl(window.location.origin, 'login') },
      });
      window.location.assign(response.data.data.url);
    } catch {
      // Global HTTP interception presents the error.
    } finally {
      setLoading(false);
    }
  };

  // 处理回车键登录
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
      <Stack spacing={isMobile ? 2 : 3}>
        <TextField
          label={t('login.username')}
          variant="outlined"
          fullWidth
          size={isMobile ? 'medium' : 'medium'}
          value={credentials.username}
          onChange={handleInputChange('username')}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />

        <TextField
          label={t('login.password')}
          type={showPassword ? 'text' : 'password'}
          variant="outlined"
          fullWidth
          size={isMobile ? 'medium' : 'medium'}
          value={credentials.password}
          onChange={handleInputChange('password')}
          onKeyDown={handleKeyPress}
          disabled={loading}
          slotProps={{
            input: {
              endAdornment: (
                <IconButton
                  aria-label="toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                  onMouseDown={(e) => e.preventDefault()}
                  edge="end"
                  disabled={loading}
                >
                  {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              ),
            },
          }}
        />

        <Button
          variant="contained"
          color="primary"
          fullWidth
          size={isMobile ? 'large' : 'medium'}
          sx={{ py: isMobile ? 1.5 : 1 }}
          onClick={handleLogin}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : undefined}
        >
          {t('login.signIn')}
        </Button>

        <Button
          variant="outlined"
          color="primary"
          fullWidth
          size={isMobile ? 'large' : 'medium'}
          sx={{ py: isMobile ? 1.5 : 1 }}
          onClick={handleSsoLogin}
          disabled={loading}
        >
          {t('sso.signIn')}
        </Button>
      </Stack>
    </Box>
  );
}
