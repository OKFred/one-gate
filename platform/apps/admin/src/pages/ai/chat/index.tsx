import { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Avatar,
  CircularProgress,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  useTheme,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import { askFn } from '@/api/admin/ai/chat';
import { modelsFn } from '@/api/admin/ai/openai';
import { useTranslation } from '@/hooks/useTranslation';

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ModelOption {
  id: string;
  label: string;
}

const DEFAULT_MODELS: ModelOption[] = [
  { id: '@cf/meta/llama-3.3-70b-instruct', label: 'Llama 3.3 70B Instruct' },
  { id: '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b', label: 'DeepSeek R1 Distill Qwen 32B' },
  { id: '@cf/qwen/qwen2.5-7b-instruct', label: 'Qwen 2.5 7B Instruct' },
  { id: '@cf/meta/llama-3.2-3b-instruct', label: 'Llama 3.2 3B Instruct' },
];

export default function AiChatPage() {
  const t = useTranslation();
  const theme = useTheme();
  const [model, setModel] = useState('@cf/meta/llama-3.3-70b-instruct');
  const [modelOptions, setModelOptions] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: t('ai.chat.welcome'),
      timestamp: Date.now(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    modelsFn()
      .then((res) => {
        const list = res?.data?.data?.data;
        if (Array.isArray(list) && list.length > 0) {
          setModelOptions(list.map((m) => ({ id: m.id, label: m.id })));
        }
      })
      .catch(() => {
        // Fallback to default options
      });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    t('ai.chat.prompt1'),
    t('ai.chat.prompt2'),
    t('ai.chat.prompt3'),
    t('ai.chat.prompt4'),
  ];

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || loading) return;

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await askFn({
        data: {
          q,
          history: historyPayload,
        },
      });

      const replyContent = res?.data?.data || res?.data?.message || '';

      const assistantMsg: MessageItem = {
        id: `ast-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : '';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errMsg,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content: t('ai.chat.cleared'),
        timestamp: Date.now(),
      },
    ]);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 1,
      }}
    >
      {/* 头部控制栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
            <SmartToyIcon />
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {t('sidebar.menu.ai.chat')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('ai.chat.subtitle')}
            </Typography>
          </Box>
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important' }} />}
            label="Workers AI Powered"
            color="primary"
            variant="outlined"
            size="small"
            sx={{ ml: 1, fontWeight: 500 }}
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 260 }}>
            <InputLabel id="ai-model-select-label">{t('ai.chat.modelSelect')}</InputLabel>
            <Select
              labelId="ai-model-select-label"
              value={model}
              label={t('ai.chat.modelSelect')}
              onChange={(e) => setModel(e.target.value)}
            >
              {modelOptions.map((item) => (
                <MenuItem key={item.id} value={item.id}>
                  {item.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Tooltip title={t('ai.chat.clearHistory')}>
            <IconButton onClick={handleClear} color="default" size="small">
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* 主对话区 */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          p: 2.5,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.default',
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                flexDirection: isUser ? 'row-reverse' : 'row',
                gap: 1.5,
                alignItems: 'flex-start',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: isUser ? 'secondary.main' : 'primary.main',
                  width: 36,
                  height: 36,
                }}
              >
                {isUser ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
              </Avatar>

              <Box
                sx={{
                  maxWidth: '78%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    {isUser ? t('ai.chat.user') : t('ai.chat.assistant')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {dayjs(msg.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                  </Typography>
                </Box>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    borderTopRightRadius: isUser ? 0 : 2.5,
                    borderTopLeftRadius: isUser ? 2.5 : 0,
                    bgcolor: isUser ? theme.palette.primary.main : 'background.paper',
                    color: isUser ? theme.palette.primary.contrastText : 'text.primary',
                    border: isUser ? 'none' : '1px solid',
                    borderColor: 'divider',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    position: 'relative',
                    '&:hover .copy-btn': { opacity: 1 },
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.6, fontSize: '0.92rem' }}>
                    {msg.content}
                  </Typography>

                  {!isUser && (
                    <IconButton
                      className="copy-btn"
                      size="small"
                      onClick={() => handleCopy(msg.content)}
                      sx={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        p: 0.5,
                      }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  )}
                </Paper>
              </Box>
            </Box>
          );
        })}

        {loading && (
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <SmartToyIcon fontSize="small" />
            </Avatar>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                px: 2.5,
                borderRadius: 2.5,
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <CircularProgress size={16} />
              <Typography variant="body2" color="text.secondary">
                {t('ai.chat.thinking')}
              </Typography>
            </Paper>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Paper>

      {/* 快捷推荐 Prompt 词条 */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', px: 0.5 }}>
        {quickPrompts.map((promptText) => (
          <Chip
            key={promptText}
            label={promptText}
            onClick={() => handleSend(promptText)}
            size="small"
            variant="outlined"
            clickable
            sx={{
              bgcolor: 'background.paper',
              borderColor: 'divider',
              '&:hover': { bgcolor: 'action.hover' },
            }}
          />
        ))}
      </Box>

      {/* 输入控制栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 1.5,
          display: 'flex',
          gap: 1.5,
          alignItems: 'flex-end',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          minRows={1}
          placeholder={t('ai.chat.inputPlaceholder')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          variant="standard"
          slotProps={{ input: { disableUnderline: true } }}
          sx={{ px: 1, py: 0.5 }}
        />
        <Button
          variant="contained"
          color="primary"
          disabled={!input.trim() || loading}
          onClick={() => handleSend()}
          endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
          sx={{ px: 3, py: 1, borderRadius: 2, whiteSpace: 'nowrap' }}
        >
          {t('ai.chat.send')}
        </Button>
      </Paper>
    </Box>
  );
}
