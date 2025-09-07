import {
  TextField,
  Button,
  Box,
  Stack,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { useState } from 'react';
import { loginAPI, type LoginCredentials } from '@/api/auth';

export default function LoginForm() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // 状态管理
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 处理输入变化
  const handleInputChange =
    (field: keyof LoginCredentials) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
      // 清除错误信息
      if (error) setError('');
    };

  // 处理普通登录
  const handleLogin = async () => {
    if (!credentials.username || !credentials.password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginAPI.commonLogin(credentials);
      // 登录成功，跳转到首页
      navigate('/home');
    } catch (err) {
      console.log(err);
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理微信登录
  const handleWechatLogin = async () => {
    setError('微信登录功能正在开发中...');
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
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="用户名"
          variant="outlined"
          fullWidth
          size={isMobile ? 'medium' : 'medium'}
          value={credentials.username}
          onChange={handleInputChange('username')}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />

        <TextField
          label="密码"
          type="password"
          variant="outlined"
          fullWidth
          size={isMobile ? 'medium' : 'medium'}
          value={credentials.password}
          onChange={handleInputChange('password')}
          onKeyDown={handleKeyPress}
          disabled={loading}
        />

        <Box sx={{ textAlign: 'right' }}>
          <Button variant="text" color="primary" size="small">
            忘记密码？
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
          {loading ? '登录中...' : '登录'}
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
          微信登录
        </Button>
      </Stack>
    </Box>
  );
}
