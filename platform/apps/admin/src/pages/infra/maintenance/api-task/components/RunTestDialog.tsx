import React, { useState, useTransition, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Chip,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import { PlayArrow as PlayIcon } from '@mui/icons-material';
import { Field } from '@/components/Form';
import { useTranslation } from '@/hooks/useTranslation';
import type { ApiTaskObj } from '@/api/infra/maintenance/type';
import * as ApiTaskAPI from '@/api/infra/maintenance/api-task';

const monoStyle = {
  '& .MuiInputBase-root': {
    fontFamily: '"Fira Code", "Courier New", Courier, monospace',
    fontSize: '13px',
    backgroundColor: '#1a1a2e',
    color: '#e2e8f0',
    padding: '8px',
    borderRadius: '4px',
    lineHeight: '1.5',
  },
};

interface RunTestDialogProps {
  open: boolean;
  onClose: () => void;
  selectedTask: ApiTaskObj | null;
}

export const RunTestDialog: React.FC<RunTestDialogProps> = ({ open, onClose, selectedTask }) => {
  const t = useTranslation();
  const [paramsInput, setParamsInput] = useState('{}');
  const [isRunning, startRunning] = useTransition();
  const [resultTab, setResultTab] = useState<'body' | 'headers'>('body');
  const [runResult, setRunResult] = useState<{
    success?: boolean;
    statusCode?: number;
    durationMs?: number;
    responseBody?: string | null;
    errorMessage?: string | null;
    responseHeaders?: Record<string, unknown> | null;
    statusText?: string | null;
    url?: string | null;
    redirected?: boolean;
    schemaValidation?: {
      hasSchema: boolean;
      valid: boolean;
      errors?: string[];
    } | null;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setParamsInput('{}');
      setRunResult(null);
      setResultTab('body');
    }
  }, [open, selectedTask]);

  const handleRunTest = () => {
    if (!selectedTask) return;
    setRunResult(null);
    setResultTab('body');
    startRunning(async () => {
      try {
        const response = await ApiTaskAPI.runTestFn({
          data: {
            id: selectedTask.id,
            parameters: paramsInput.trim() || null,
          },
        });
        if (response?.data?.data) {
          setRunResult(response.data.data);
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } }; message?: string };
        setRunResult({
          success: false,
          statusCode: 0,
          durationMs: 0,
          errorMessage: error.response?.data?.message || error.message || String(err),
        });
      }
    });
  };

  return (
    <Dialog open={open} onClose={() => !isRunning && onClose()} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {selectedTask?.name} — {t('apiTask.test.title')}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, fontFamily: 'monospace' }}
        >
          {selectedTask?.method} {selectedTask?.baseUrl}
          {selectedTask?.path}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {selectedTask?.requestSchema && (
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {t('apiTask.test.paramsSchema')}
              </Typography>
              <Box
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  bgcolor: '#0d1117',
                  color: '#8b949e',
                  p: 1.5,
                  borderRadius: 1,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
              >
                {selectedTask.requestSchema}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {t('apiTask.test.paramsInput')}
            </Typography>
            <Field
              name="paramsInput"
              value={paramsInput}
              onChange={(e) => setParamsInput(e.target.value)}
              fullWidth
              multiline
              rows={5}
              sx={monoStyle}
            />
          </Box>

          {runResult && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                {t('apiTask.test.result')}
              </Typography>
              <Stack spacing={1.5} sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                {/* Status Metrics Bar */}
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                  <Chip
                    label={`HTTP ${runResult.statusCode}`}
                    color={runResult.success ? 'success' : 'error'}
                    size="small"
                    sx={{ fontWeight: 'bold' }}
                  />
                  {runResult.statusText && (
                    <Chip
                      label={runResult.statusText}
                      variant="outlined"
                      color={runResult.success ? 'success' : 'error'}
                      size="small"
                    />
                  )}
                  <Chip
                    label={`${runResult.durationMs} ms`}
                    variant="outlined"
                    color="primary"
                    size="small"
                  />
                  {runResult.redirected && (
                    <Chip label="Redirected" color="warning" variant="outlined" size="small" />
                  )}
                  {/* Schema Validation Status Chip */}
                  {runResult.schemaValidation && runResult.schemaValidation.hasSchema && (
                    <Chip
                      label={
                        runResult.schemaValidation.valid
                          ? t('apiTask.test.schemaValid')
                          : t('apiTask.test.schemaInvalid')
                      }
                      color={runResult.schemaValidation.valid ? 'success' : 'error'}
                      size="small"
                      sx={{ fontWeight: 'medium' }}
                    />
                  )}
                  {runResult.schemaValidation && !runResult.schemaValidation.hasSchema && (
                    <Chip
                      label={t('apiTask.test.noSchema')}
                      color="default"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>

                {/* URL Display */}
                {runResult.url && (
                  <Box
                    sx={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      color: 'text.secondary',
                      wordBreak: 'break-all',
                      bgcolor: 'action.selected',
                      p: 1,
                      borderRadius: 0.5,
                    }}
                  >
                    <strong>URL:</strong> {runResult.url}
                  </Box>
                )}

                {/* Schema Validation Details Alert (Only when invalid) */}
                {runResult.schemaValidation &&
                  runResult.schemaValidation.hasSchema &&
                  !runResult.schemaValidation.valid && (
                    <Alert severity="error" sx={{ mt: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {t('apiTask.test.schemaInvalid')}
                      </Typography>
                      {runResult.schemaValidation.errors &&
                        runResult.schemaValidation.errors.length > 0 && (
                          <Box sx={{ mt: 1, maxHeight: 150, overflowY: 'auto' }}>
                            {runResult.schemaValidation.errors.map((err, idx) => (
                              <Typography
                                key={idx}
                                variant="caption"
                                sx={{
                                  display: 'block',
                                  fontFamily: 'monospace',
                                  wordBreak: 'break-all',
                                }}
                              >
                                • {err}
                              </Typography>
                            ))}
                          </Box>
                        )}
                    </Alert>
                  )}

                {/* Tab Toggles */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  <Tabs
                    value={resultTab}
                    onChange={(_, newVal) => setResultTab(newVal)}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{
                      minHeight: 32,
                      '& .MuiTab-root': { py: 0.5, minHeight: 32, fontSize: '13px' },
                    }}
                  >
                    <Tab label={t('apiTask.test.response')} value="body" />
                    <Tab
                      label={`${t('apiTask.test.headers')} (${Object.keys(runResult.responseHeaders || {}).length})`}
                      value="headers"
                    />
                  </Tabs>
                </Box>

                {/* Body Content */}
                {resultTab === 'body' && (
                  <Box
                    sx={{
                      fontFamily: '"Fira Code", monospace',
                      fontSize: '13px',
                      bgcolor: '#0d0d0d',
                      color: '#e2e8f0',
                      p: 2,
                      borderRadius: 1,
                      maxHeight: 250,
                      overflowY: 'auto',
                    }}
                  >
                    {runResult.responseBody ? (
                      <Box sx={{ whiteSpace: 'pre-wrap' }}>
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(runResult.responseBody), null, 2);
                          } catch {
                            return runResult.responseBody;
                          }
                        })()}
                      </Box>
                    ) : (
                      <Box sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        {t('apiTask.test.noResponse')}
                      </Box>
                    )}
                    {runResult.errorMessage && (
                      <Box sx={{ mt: 1, color: '#f44336' }}>
                        {t('apiTask.test.errorDetails')}: {runResult.errorMessage}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Headers Content */}
                {resultTab === 'headers' && (
                  <Box
                    sx={{
                      fontFamily: '"Fira Code", monospace',
                      fontSize: '13px',
                      bgcolor: '#0d0d0d',
                      color: '#8b949e',
                      p: 2,
                      borderRadius: 1,
                      maxHeight: 250,
                      overflowY: 'auto',
                    }}
                  >
                    {runResult.responseHeaders &&
                    Object.keys(runResult.responseHeaders).length > 0 ? (
                      <Stack spacing={0.5}>
                        {Object.entries(runResult.responseHeaders).map(([key, val]) => (
                          <Box key={key} sx={{ display: 'flex', wordBreak: 'break-all' }}>
                            <Box
                              sx={{ color: '#58a6ff', mr: 1, fontWeight: 'bold', flexShrink: 0 }}
                            >
                              {key}:
                            </Box>
                            <Box sx={{ color: '#c9d1d9' }}>{String(val)}</Box>
                          </Box>
                        ))}
                      </Stack>
                    ) : (
                      <Box sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                        {t('apiTask.test.noHeaders')}
                      </Box>
                    )}
                  </Box>
                )}
              </Stack>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogTitle sx={{ display: 'none' }} /> {/* accessibility title placeholder if needed */}
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button disabled={isRunning} onClick={onClose} variant="outlined">
          {t('apiTask.test.close')}
        </Button>
        <Button
          onClick={handleRunTest}
          variant="contained"
          color="success"
          startIcon={isRunning ? <CircularProgress size={16} color="inherit" /> : <PlayIcon />}
          disabled={isRunning}
        >
          {isRunning ? t('apiTask.test.running') : t('apiTask.test.run')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
