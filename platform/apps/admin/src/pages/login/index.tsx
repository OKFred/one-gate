import { Box, Container } from '@mui/material';
import TheForm from './components/TheForm';
import TheHeader from './components/TheHeader';

export default function Login() {
  return (
    <Container sx={{ maxWidth: 'sm' }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: { xs: 2, md: 4 },
          px: { xs: 2, md: 0 },
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 400,
            display: 'flex',
            flexDirection: 'column',
            gap: { xs: 3, md: 4 },
          }}
        >
          <TheHeader />
          <TheForm />
        </Box>
      </Box>
    </Container>
  );
}
