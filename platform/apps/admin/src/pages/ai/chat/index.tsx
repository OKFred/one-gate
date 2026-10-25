import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddOutlined,
  Close,
  ContentCopy,
  Fullscreen,
  FullscreenExit,
  ImageOutlined,
  Person,
  Refresh,
  Send,
  SmartToy,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { askFn, modelsFn, type ChatRequest } from '@/api/admin/ai/chat';
import { classifyApiFailure } from '@/api/config';
import Markdown from '@/components/Markdown';
import { useTranslation } from '@/hooks/useTranslation';
import { permissions, usePermission } from '@/hooks/usePermission';
import { captureAuthSession, isCurrentAuthSession, subscribeAuthChanges } from '@/utils/auth';

type Catalog = Awaited<ReturnType<typeof modelsFn>>['data']['data'];
type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  timestamp: number;
  request?: ChatRequest;
  error?: string;
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function AiChatPage() {
  const t = useTranslation();
  const { permissionCodes } = usePermission();
  const allowed = permissionCodes.has(permissions.admin.ai.chat.read);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [modelKey, setModelKey] = useState('');
  const [input, setInput] = useState('');
  const [image, setImage] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<string>();
  const generation = useRef(0);
  const catalogGeneration = useRef(0);
  const uploadGeneration = useRef(0);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const selectedModel = catalog?.models.find((model) => model.modelKey === modelKey);
  const conversationHasImage = messages.some((message) => Boolean(message.image));
  const supportsImage = selectedModel?.capabilities.includes('image') === true;

  useEffect(() => {
    const auth = captureAuthSession();
    const requestGeneration = ++catalogGeneration.current;
    const abort = new AbortController();
    const current = () =>
      catalogGeneration.current === requestGeneration && isCurrentAuthSession(auth);
    setLoading(false);
    setError(undefined);
    setCatalog(null);
    setModelKey('');
    if (allowed) {
      setCatalogLoading(true);
      void modelsFn({
        signal: abort.signal,
        ignoreAbort: true,
        errorPresentation: 'local',
        shouldPresentError: current,
      })
        .then(
          (response) => {
            if (!current()) return;
            if (response.data.ok !== true || !Array.isArray(response.data.data?.models)) {
              setError(t('ai.chat.catalogError'));
              return;
            }
            const result = response.data.data;
            setCatalog(result);
            const defaultModel =
              result.models.find(
                (model) => model.available && model.modelKey === result.defaultModelKey,
              ) ?? result.models.find((model) => model.available);
            setModelKey(defaultModel?.modelKey ?? '');
          },
          (failure: unknown) => {
            if (current() && classifyApiFailure(failure).kind !== 'session') {
              setError(t('ai.chat.catalogError'));
            }
          },
        )
        .finally(() => {
          if (current()) setCatalogLoading(false);
        });
    }
    const unsubscribe = subscribeAuthChanges(() => {
      if (isCurrentAuthSession(auth)) return;
      generation.current += 1;
      catalogGeneration.current += 1;
      uploadGeneration.current += 1;
      abort.abort();
      controller.current?.abort();
      inFlight.current = false;
      setMessages([]);
      setImage(undefined);
      setInput('');
      setError(undefined);
      setLoading(false);
      setCatalog(null);
    });
    return () => {
      generation.current += 1;
      catalogGeneration.current += 1;
      uploadGeneration.current += 1;
      abort.abort();
      controller.current?.abort();
      inFlight.current = false;
      unsubscribe();
    };
  }, [allowed, t]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, loading]);

  const newConversation = () => {
    generation.current += 1;
    uploadGeneration.current += 1;
    controller.current?.abort();
    inFlight.current = false;
    setLoading(false);
    setMessages([]);
    setImage(undefined);
    setInput('');
    setError(undefined);
    setCopied(undefined);
  };

  const execute = async (request: ChatRequest, userMessage: Message, previous: Message[]) => {
    // A ref guards the interval before React commits the disabled button.
    if (inFlight.current || !allowed) return;
    inFlight.current = true;
    const requestGeneration = generation.current;
    const auth = captureAuthSession();
    const abort = new AbortController();
    controller.current = abort;
    const current = () =>
      generation.current === requestGeneration &&
      isCurrentAuthSession(auth) &&
      !abort.signal.aborted;
    setMessages([...previous, { ...userMessage, error: undefined }]);
    setError(undefined);
    setLoading(true);
    await askFn({
      data: request,
      signal: abort.signal,
      ignoreAbort: true,
      errorPresentation: 'local',
      shouldPresentError: current,
    })
      .then(
        (response) => {
          if (!current()) return;
          if (response.data.ok !== true || typeof response.data.data !== 'string') {
            setMessages([...previous, { ...userMessage, error: t('ai.chat.invalidResponse') }]);
            return;
          }
          setMessages([
            ...previous,
            { ...userMessage, error: undefined },
            {
              id: crypto.randomUUID(),
              role: 'assistant',
              content: response.data.data,
              timestamp: Date.now(),
            },
          ]);
        },
        (failure: unknown) => {
          if (!current()) return;
          const result = classifyApiFailure(failure);
          if (result.kind !== 'session') {
            setMessages([
              ...previous,
              { ...userMessage, error: result.message ?? t('ai.chat.failed') },
            ]);
          }
        },
      )
      .finally(() => {
        if (generation.current === requestGeneration && isCurrentAuthSession(auth)) {
          inFlight.current = false;
          setLoading(false);
          controller.current = null;
        }
      });
  };

  const send = (prompt?: string) => {
    const q = (prompt ?? input).trim();
    if (!q || inFlight.current || !selectedModel?.available || !allowed) return;
    if ((image || conversationHasImage) && !supportsImage) {
      setError(t('ai.chat.imageModelRequired'));
      return;
    }
    const request: ChatRequest = {
      q,
      image,
      modelKey,
      history: messages.map((message) => ({
        role: message.role,
        content: message.image
          ? [
              { type: 'text' as const, text: message.content },
              { type: 'image_url' as const, image_url: { url: message.image } },
            ]
          : message.content,
      })),
    };
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: q,
      image,
      timestamp: Date.now(),
      request,
    };
    setInput('');
    setImage(undefined);
    uploadGeneration.current += 1;
    void execute(request, userMessage, messages);
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || inFlight.current || conversationHasImage) return;
    const uploadId = ++uploadGeneration.current;
    const requestGeneration = generation.current;
    const auth = captureAuthSession();
    const current = () =>
      generation.current === requestGeneration &&
      uploadGeneration.current === uploadId &&
      isCurrentAuthSession(auth);
    if (!supportsImage) {
      setError(t('ai.chat.imageModelRequired'));
      return;
    }
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
      setError(t('ai.chat.imageInvalid'));
      return;
    }
    try {
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte);
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if ((file.type === 'image/png' && !png) || (file.type === 'image/jpeg' && !jpeg)) {
        if (current()) setError(t('ai.chat.imageInvalid'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (!current()) return;
        if (typeof reader.result === 'string') {
          setImage(reader.result);
          setError(undefined);
        }
      };
      reader.onerror = () => {
        if (current()) {
          setError(t('ai.chat.imageInvalid'));
        }
      };
      reader.readAsDataURL(file);
    } catch {
      if (current()) setError(t('ai.chat.imageInvalid'));
    }
  };

  const copy = async (message: Message) => {
    const requestGeneration = generation.current;
    const auth = captureAuthSession();
    const current = () => generation.current === requestGeneration && isCurrentAuthSession(auth);
    try {
      await navigator.clipboard.writeText(message.content);
      if (current()) setCopied(message.id);
    } catch {
      if (current()) setError(t('ai.chat.copyFailed'));
    }
  };

  if (!allowed) return <Alert severity="info">{t('ai.chat.permissionRequired')}</Alert>;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minHeight: 500,
        bgcolor: 'background.default',
        color: 'text.primary',
        height: 'calc(100dvh - 140px)',
        ...(expanded
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 1400,
              p: 2,
              height: '100dvh',
              bgcolor: 'background.default',
            }
          : {}),
      }}
    >
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ alignItems: { md: 'center' } }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">{t('sidebar.menu.ai.chat')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('ai.chat.subtitle')}
            </Typography>
          </Box>
          <FormControl size="small" sx={{ minWidth: { md: 280 }, maxWidth: '100%' }}>
            <InputLabel id="chat-model-label">{t('ai.chat.modelSelect')}</InputLabel>
            <Select
              labelId="chat-model-label"
              label={t('ai.chat.modelSelect')}
              value={modelKey}
              disabled={loading || catalogLoading}
              onChange={(event) => {
                setModelKey(event.target.value);
                setError(undefined);
              }}
            >
              {catalog?.models.map((model) => (
                <MenuItem
                  key={model.modelKey}
                  value={model.modelKey}
                  disabled={!model.available}
                  title={model.unavailableReason ?? undefined}
                >
                  {model.label}
                  {model.capabilities.includes('image') ? ` · ${t('ai.chat.vision')}` : ''}
                  {!model.available && model.unavailableReason
                    ? ` · ${model.unavailableReason}`
                    : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction="row" spacing={1}>
            <Button startIcon={<AddOutlined />} onClick={newConversation}>
              {t('ai.chat.newChat')}
            </Button>
            <Tooltip title={t(expanded ? 'common.exitFullScreen' : 'common.fullScreen')}>
              <IconButton
                aria-label={t(expanded ? 'common.exitFullScreen' : 'common.fullScreen')}
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Paper>
      {error && (
        <Alert severity="error" onClose={() => setError(undefined)}>
          {error}
        </Alert>
      )}
      {selectedModel?.providerKind === 'cloudflare' && supportsImage && (
        <Alert severity="info">{t('ai.chat.license')}</Alert>
      )}
      {!catalogLoading && catalog && !catalog.models.some((model) => model.available) && (
        <Alert severity="info">{t('ai.chat.noModels')}</Alert>
      )}
      <Paper
        variant="outlined"
        sx={{ flex: 1, minHeight: 180, p: { xs: 1.5, md: 3 }, overflowY: 'auto' }}
      >
        {messages.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <SmartToy color="primary" sx={{ fontSize: 40 }} />
            <Typography sx={{ my: 2 }}>{t('ai.chat.welcome')}</Typography>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: 'wrap', justifyContent: 'center' }}
            >
              {[1, 2, 3, 4].map((index) => (
                <Chip
                  key={index}
                  label={t(`ai.chat.prompt${index}`)}
                  onClick={() => send(t(`ai.chat.prompt${index}`))}
                  disabled={!selectedModel?.available || loading}
                />
              ))}
            </Stack>
          </Box>
        )}
        <Stack spacing={2}>
          {messages.map((message, index) => (
            <Stack
              key={message.id}
              direction="row"
              spacing={1.5}
              sx={{ flexDirection: message.role === 'user' ? 'row-reverse' : 'row', gap: 1 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: message.role === 'user' ? 'secondary.main' : 'primary.main',
                }}
              >
                {message.role === 'user' ? (
                  <Person fontSize="small" />
                ) : (
                  <SmartToy fontSize="small" />
                )}
              </Avatar>
              <Box sx={{ minWidth: 0, maxWidth: { xs: '85%', md: '80%' } }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: message.role === 'user' ? 'action.hover' : 'background.paper',
                    overflowWrap: 'anywhere',
                  }}
                >
                  {message.image && (
                    <Box
                      component="img"
                      src={message.image}
                      alt={t('ai.chat.attachment')}
                      sx={{
                        display: 'block',
                        maxWidth: '100%',
                        maxHeight: 260,
                        mb: 1,
                        borderRadius: 1,
                      }}
                    />
                  )}
                  {message.role === 'assistant' ? (
                    <Markdown content={message.content} />
                  ) : (
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{message.content}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {dayjs(message.timestamp).format('HH:mm')}
                  </Typography>
                </Paper>
                {message.error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {message.error}
                  </Alert>
                )}
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    startIcon={<ContentCopy />}
                    onClick={() => void copy(message)}
                  >
                    {t(copied === message.id ? 'ai.chat.copied' : 'ai.chat.copy')}
                  </Button>
                  {message.request && (
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      disabled={loading}
                      onClick={() => {
                        if (message.request)
                          void execute(message.request, message, messages.slice(0, index));
                      }}
                    >
                      {t('ai.chat.retry')}
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          ))}
          {(loading || catalogLoading) && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="status">
              <CircularProgress size={20} />
              <Typography>{t(loading ? 'ai.chat.thinking' : 'ai.chat.loadingModels')}</Typography>
            </Stack>
          )}
          <div ref={end} />
        </Stack>
      </Paper>
      {image && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            component="img"
            src={image}
            alt={t('ai.chat.preview')}
            sx={{ maxWidth: 160, maxHeight: 90, borderRadius: 1 }}
          />
          <IconButton
            aria-label={t('ai.chat.removeImage')}
            onClick={() => {
              uploadGeneration.current += 1;
              setImage(undefined);
            }}
          >
            <Close />
          </IconButton>
        </Box>
      )}
      {conversationHasImage && (
        <Typography variant="caption" color="text.secondary">
          {t('ai.chat.oneImage')}
        </Typography>
      )}
      {(Boolean(image) || conversationHasImage) && !supportsImage && (
        <Alert severity="info">{t('ai.chat.imageModelRequired')}</Alert>
      )}
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', alignItems: 'flex-end', gap: 1 }}>
        <input
          ref={fileInput}
          type="file"
          hidden
          accept="image/png,image/jpeg"
          onChange={(event) => void uploadImage(event)}
          data-testid="chat-image-input"
        />
        <Tooltip title={t('ai.chat.imageHint')}>
          <span>
            <IconButton
              aria-label={t('ai.chat.attachImage')}
              disabled={loading || conversationHasImage || !supportsImage}
              onClick={() => fileInput.current?.click()}
            >
              <ImageOutlined />
            </IconButton>
          </span>
        </Tooltip>
        <TextField
          fullWidth
          multiline
          maxRows={5}
          variant="standard"
          value={input}
          placeholder={t('ai.chat.inputPlaceholder')}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              send();
            }
          }}
          slotProps={{ input: { disableUnderline: true } }}
        />
        <IconButton
          color="primary"
          aria-label={t('ai.chat.send')}
          onClick={() => send()}
          disabled={
            loading ||
            !input.trim() ||
            !selectedModel?.available ||
            ((Boolean(image) || conversationHasImage) && !supportsImage)
          }
        >
          <Send />
        </IconButton>
      </Paper>
    </Box>
  );
}
