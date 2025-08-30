import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';

export default function LoginForm() {
  return (
    <>
      <TextField label="Username" variant="outlined" fullWidth margin="normal" />
      <TextField label="Password" type="password" variant="outlined" fullWidth margin="normal" />
      {/* forgot password */}
      <Button variant="text" color="primary">
        Forgot Password?
      </Button>
      <Button variant="contained" color="primary" fullWidth sx={{ mt: 2 }}>
        Login
      </Button>
      <Button variant="contained" color="success" fullWidth sx={{ mt: 2 }}>
        Login with WeChat
      </Button>
    </>
  );
}
