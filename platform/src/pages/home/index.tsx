import { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Typography,
  Paper,
  Stack,
  Avatar,
  CircularProgress,
  Container,
} from '@mui/material';
import { Send as SendIcon, SmartToy as BotIcon, Person as UserIcon } from '@mui/icons-material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { askFn } from '@/api/ai/chat';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function HomePage() {
  const t = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await askFn({
        data: { q: userMsg },
      });

      if (res.data?.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data }]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: 'Error: ' + (res.data?.message || 'Failed to get response'),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network Error' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout title={t('sidebar.menu.home')}>
      <Container
        maxWidth="md"
        sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}
      >
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            mb: 2,
            p: 2,
            overflowY: 'auto',
            borderRadius: 2,
            border: '1px solid',
          }}
          ref={scrollRef}
        >
          {messages.length === 0 && (
            <Box
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5,
              }}
            >
              <Typography variant="h6">{t('ai.chat.inputPlaceholder')}</Typography>
            </Box>
          )}
          <Stack spacing={2}>
            {messages.map((msg, idx) => (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 1,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main',
                    width: 32,
                    height: 32,
                  }}
                >
                  {msg.role === 'user' ? (
                    <UserIcon fontSize="small" />
                  ) : (
                    <BotIcon fontSize="small" />
                  )}
                </Avatar>
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: '80%',
                    bgcolor: msg.role === 'user' ? 'primary' : 'secondary',
                    borderRadius: msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    boxShadow: 1,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {msg.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                  <BotIcon fontSize="small" />
                </Avatar>
                <Paper sx={{ p: 1.5, borderRadius: '4px 12px 12px 12px', boxShadow: 1 }}>
                  <CircularProgress size={20} />
                </Paper>
              </Box>
            )}
          </Stack>
        </Paper>

        <Paper
          elevation={3}
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.light',
          }}
        >
          <TextField
            fullWidth
            placeholder={t('ai.chat.inputPlaceholder')}
            variant="standard"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            sx={{ px: 2 }}
            slotProps={{
              input: { disableUnderline: true },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            sx={{ ml: 1 }}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Container>
    </PageLayout>
  );
}
