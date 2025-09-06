import { TextField, Button, Box, Stack, useTheme, useMediaQuery } from '@mui/material';
import { useNavigate } from 'react-router';

export default function LoginForm() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box sx={{ width: '100%', maxWidth: 400, mx: 'auto' }}>
      <Stack spacing={isMobile ? 2 : 3}>
        <TextField
          label="用户名"
          variant="outlined"
          fullWidth
          size={isMobile ? 'medium' : 'medium'}
        />
        <TextField
          label="密码"
          type="password"
          variant="outlined"
          fullWidth
          size={isMobile ? 'medium' : 'medium'}
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
          onClick={() => {
            navigate('/home');
          }}
        >
          登录
        </Button>

        <Button
          variant="outlined"
          color="success"
          fullWidth
          size={isMobile ? 'large' : 'medium'}
          sx={{ py: isMobile ? 1.5 : 1 }}
        >
          微信登录
        </Button>
      </Stack>
    </Box>
  );
}
