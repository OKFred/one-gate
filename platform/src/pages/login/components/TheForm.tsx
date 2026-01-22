import { TextField, Button, Box, Stack, CircularProgress, IconButton } from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { commonLogin } from '@/api/system/auth';
import { authUtils } from '@/utils/auth';
import type { CommonLoginReq, CommonLoginData } from '@/pages/login/type';
import { useResponsive } from '@/hooks/useResponsive';
import { showSnackbar } from '@/components/Notification';
import { useTranslation } from '@/hooks/useTranslation';

export default function TheForm() {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const t = useTranslation();

  // 状态管理
  const [credentials, setCredentials] = useState<CommonLoginReq>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 处理输入变化
  const handleInputChange =
    (field: keyof CommonLoginReq) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev: CommonLoginReq) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  // 处理普通登录
  const handleLogin = async () => {
    if (!credentials.username || !credentials.password) {
      showSnackbar({ message: t('login.missingCredentials'), type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const data = { ...credentials };
      data.password = globalThis.btoa(credentials.password); // 防小白
      const response = await commonLogin({ data });
      const loginData = response.data.data as CommonLoginData['data'];
      const { userObj } = loginData;
      authUtils.setUserInfo(userObj);
      // 登录成功，跳转到首页
      navigate('/home');
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // 处理微信登录
  const handleWechatLogin = async () => {
    showSnackbar({ message: t('login.wechatWIP'), type: 'info' });
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
          InputProps={{
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
          }}
        />

        <Box sx={{ textAlign: 'right' }}>
          <Button variant="text" color="primary" size="small">
            {t('login.forgotPassword')}
          </Button>
        </Box>

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
          color="success"
          fullWidth
          size={isMobile ? 'large' : 'medium'}
          sx={{ py: isMobile ? 1.5 : 1 }}
          onClick={handleWechatLogin}
          disabled={loading}
        >
          {t('login.wechatSignIn')}
        </Button>
      </Stack>
    </Box>
  );
}
