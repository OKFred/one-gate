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
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
  AddOutlined as NewChatIcon,
  Refresh as RetryIcon,
  Image as ImageIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { PageLayout } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { askFn } from '@/api/ai/chat';
import Markdown from '@/components/Markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

export default function HomePage() {
  const t = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (customMsg?: string) => {
    const userMsg = (customMsg || input).trim();
    if (!userMsg || loading) return;

    const currentImage = selectedImage;
    if (!customMsg) {
      setInput('');
      setSelectedImage(null);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: userMsg, image: currentImage || undefined },
      ]);
    }
    setLoading(true);

    try {
      const history = messages.map((m) => {
        const content = m.image
          ? [
              { type: 'text' as const, text: m.content },
              { type: 'image_url' as const, image_url: { url: m.image } },
            ]
          : m.content;
        return { role: m.role, content };
      });

      const res = await askFn({
        data: { q: userMsg, image: currentImage || undefined, history },
      });

      if (res.data?.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.data }]);
      } else {
        throw new Error(res.data?.message || 'Failed to get response');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${t('errorHandler.ai.chat.apiError')}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput('');
  };

  const handleRetry = (idx: number) => {
    if (loading) return;
    const userMsg = messages[idx].content;
    // 移除 idx 之后的所有消息（包括当前的错误响应）
    setMessages((prev) => prev.slice(0, idx + 1));
    handleSend(userMsg);
  };

  return (
    <PageLayout title={t('sidebar.menu.home')}>
      <Container
        maxWidth="md"
        sx={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
          <IconButton
            onClick={handleNewChat}
            color="success"
            size="small"
            title={t('ai.chat.newChat')}
          >
            <NewChatIcon fontSize="small" />
            <Typography variant="caption" sx={{ ml: 0.5 }}>
              {t('ai.chat.newChat')}
            </Typography>
          </IconButton>
        </Box>
        <Paper
          elevation={0}
          sx={{
            flex: 1,
            mb: 2,
            p: 2,
            overflowY: 'auto',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
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
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    alignItems: 'center',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    maxWidth: '80%',
                  }}
                >
                  <Paper
                    sx={{
                      p: 1.5,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                      color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                      borderRadius:
                        msg.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                      boxShadow: 1,
                    }}
                  >
                    {msg.image && (
                      <Box sx={{ mb: 1 }}>
                        <img
                          src={msg.image}
                          alt="upload"
                          style={{ maxWidth: '100%', borderRadius: 4, display: 'block' }}
                        />
                      </Box>
                    )}
                    {msg.role === 'assistant' ? (
                      <Markdown content={msg.content} />
                    ) : (
                      <Typography
                        variant="body1"
                        sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                      >
                        {msg.content}
                      </Typography>
                    )}
                  </Paper>
                  {msg.role === 'user' && idx === messages.length - 2 && (
                    <IconButton size="small" onClick={() => handleRetry(idx)} disabled={loading}>
                      <RetryIcon fontSize="inherit" />
                    </IconButton>
                  )}
                </Stack>
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

        {selectedImage && (
          <Box sx={{ mb: 1, position: 'relative', display: 'inline-block' }}>
            <img
              src={selectedImage}
              alt="preview"
              style={{ height: 80, borderRadius: 8, border: '1px solid #ddd' }}
            />
            <IconButton
              size="small"
              sx={{
                position: 'absolute',
                top: -8,
                right: -8,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': { bgcolor: 'error.light', color: 'white' },
              }}
              onClick={() => setSelectedImage(null)}
            >
              <CloseIcon fontSize="inherit" />
            </IconButton>
          </Box>
        )}
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
          <input
            type="file"
            hidden
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageUpload}
          />
          <IconButton color="primary" onClick={() => fileInputRef.current?.click()}>
            <ImageIcon />
          </IconButton>
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
            onClick={() => handleSend()}
            disabled={(!input.trim() && !selectedImage) || loading}
            sx={{ ml: 1 }}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Container>
    </PageLayout>
  );
}
