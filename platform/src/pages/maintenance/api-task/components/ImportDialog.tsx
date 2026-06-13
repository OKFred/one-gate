import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Box,
  Alert,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  InputAdornment,
  Checkbox,
  Chip,
  CircularProgress,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import * as ApiDocsAPI from '@/api/maintenance/api-docs';
import * as ApiTaskAPI from '@/api/maintenance/api-task';
import type { ApiDocsObj } from '@/api/maintenance/type';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sanitizeTaskKey = (prefix: string, method: string, path: string) => {
  let cleanPath = path.replace(/\{([^}]+)\}/g, '$1');
  cleanPath = cleanPath.replace(/[^a-zA-Z0-9]/g, '_');
  const baseKey = `${method.toLowerCase()}_${cleanPath}`;
  const combined = `${prefix}${baseKey}`;
  return combined.replace(/_+/g, '_').replace(/^_|_$/g, '').toLowerCase();
};

export const ImportDialog: React.FC<ImportDialogProps> = ({ open, onClose, onSuccess }) => {
  const t = useTranslation();
  const [docsList, setDocsList] = useState<ApiDocsObj[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<number | ''>('');
  const [endpoints, setEndpoints] = useState<
    Array<{
      method: string;
      path: string;
      summary?: string;
      description?: string;
      requestSchema?: string;
      responseSchema?: string;
    }>
  >([]);
  const [selectedEndpoints, setSelectedEndpoints] = useState<Record<string, boolean>>({});
  const [baseUrl, setBaseUrl] = useState('');
  const [taskKeyPrefix, setTaskKeyPrefix] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    failedCount: number;
    errors: { taskKey: string; message: string }[];
  } | null>(null);

  // Load docs list when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDocId('');
      setEndpoints([]);
      setSelectedEndpoints({});
      setBaseUrl('');
      setTaskKeyPrefix('');
      setSearchQuery('');
      setImportResult(null);

      const loadDocs = async () => {
        try {
          const res = await ApiDocsAPI.listFn({ data: { pageNo: 1, pageSize: 1000 } });
          if (res.data?.data?.list) {
            setDocsList(res.data.data.list);
          }
        } catch (err) {
          console.error('Failed to load docs list', err);
        }
      };
      loadDocs();
    }
  }, [open]);

  // Handle document selection change
  const handleDocChange = async (docId: number) => {
    setSelectedDocId(docId);
    setEndpoints([]);
    setSelectedEndpoints({});
    const doc = docsList.find((d) => d.id === docId);
    if (doc) {
      const sanitizedPrefix = doc.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setTaskKeyPrefix(sanitizedPrefix ? `${sanitizedPrefix}_` : '');
    }

    try {
      const res = await ApiDocsAPI.parseFn({ data: { id: docId } });
      if (res.data?.data?.apis) {
        setEndpoints(res.data.data.apis);
        const initialSelected: Record<string, boolean> = {};
        res.data.data.apis.forEach((ep: { method: string; path: string }) => {
          initialSelected[`${ep.method} ${ep.path}`] = true;
        });
        setSelectedEndpoints(initialSelected);
      }
      if (res.data?.data?.baseUrl) {
        setBaseUrl(res.data.data.baseUrl);
      }
    } catch (err) {
      console.error('Failed to parse doc', err);
    }
  };

  // Filter endpoints by search query
  const filteredEndpoints = endpoints.filter((ep) => {
    const query = searchQuery.toLowerCase();
    return (
      ep.path.toLowerCase().includes(query) ||
      (ep.summary && ep.summary.toLowerCase().includes(query)) ||
      ep.method.toLowerCase().includes(query)
    );
  });

  const allFilteredSelected =
    filteredEndpoints.length > 0 &&
    filteredEndpoints.every((ep) => selectedEndpoints[`${ep.method} ${ep.path}`]);

  const toggleSelectAllFiltered = () => {
    setSelectedEndpoints((prev) => {
      const next = { ...prev };
      filteredEndpoints.forEach((ep) => {
        next[`${ep.method} ${ep.path}`] = !allFilteredSelected;
      });
      return next;
    });
  };

  const toggleEndpoint = (method: string, path: string) => {
    setSelectedEndpoints((prev) => ({
      ...prev,
      [`${method} ${path}`]: !prev[`${method} ${path}`],
    }));
  };

  const handleImportSubmit = async () => {
    const selectedList = endpoints.filter((ep) => selectedEndpoints[`${ep.method} ${ep.path}`]);
    if (selectedList.length === 0) return;

    setImporting(true);
    try {
      const tasks = selectedList.map((ep) => ({
        taskKey: sanitizeTaskKey(taskKeyPrefix, ep.method, ep.path),
        name: ep.summary || `${ep.method} ${ep.path}`,
        description: ep.description || null,
        baseUrl: baseUrl.trim() || 'http://localhost',
        path: ep.path,
        method: ep.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        headers: '{}',
        requestSchema: ep.requestSchema || null,
        responseSchema: ep.responseSchema || null,
        timeoutMs: 30000,
        isEnabled: true,
      }));

      const res = await ApiTaskAPI.bulkAddFn({ data: { tasks } });
      if (res.data?.data) {
        setImportResult(res.data.data);
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to import tasks', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => !importing && onClose()} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>{t('apiTask.import.title')}</DialogTitle>
      <DialogContent>
        {importResult ? (
          <Box sx={{ mt: 2 }}>
            <Alert severity={importResult.failedCount === 0 ? 'success' : 'warning'} sx={{ mb: 3 }}>
              {t('apiTask.import.successPrefix')}
              <strong>{importResult.successCount}</strong>
              {t('apiTask.import.successMiddle')}
              <strong>{importResult.failedCount}</strong>
              {t('apiTask.import.successSuffix')}
            </Alert>

            {importResult.errors.length > 0 && (
              <Box>
                <Typography variant="subtitle2" color="error" sx={{ mb: 1, fontWeight: 'bold' }}>
                  {t('apiTask.import.failedDetails')}
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{ maxHeight: 300, bgcolor: 'rgba(244, 67, 54, 0.04)' }}
                >
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {t('apiTask.import.taskKey')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {t('apiTask.import.errorReason')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {importResult.errors.map((err, idx) => (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{err.taskKey}</TableCell>
                          <TableCell sx={{ color: 'error.main' }}>{err.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        ) : (
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth size="small" required>
                <InputLabel>{t('apiTask.import.selectDoc')}</InputLabel>
                <Select
                  value={selectedDocId}
                  label={t('apiTask.import.selectDoc')}
                  onChange={(e) => handleDocChange(Number(e.target.value))}
                >
                  {docsList.map((doc) => (
                    <MenuItem key={doc.id} value={doc.id}>
                      {doc.name} (v{doc.version || '1.0.0'}) [{doc.docType}]
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label={t('apiTask.import.baseUrl')}
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="e.g. https://api.example.com"
                size="small"
                fullWidth
                required
              />

              <TextField
                label={t('apiTask.import.keyPrefix')}
                value={taskKeyPrefix}
                onChange={(e) => setTaskKeyPrefix(e.target.value)}
                placeholder="e.g. prefix_"
                size="small"
                fullWidth
              />
            </Stack>

            {endpoints.length > 0 && (
              <Stack spacing={2}>
                <Divider />
                <Stack
                  direction="row"
                  sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {t('apiTask.import.selectedEndpoints', {
                      selected: endpoints.filter(
                        (ep) => selectedEndpoints[`${ep.method} ${ep.path}`],
                      ).length,
                      total: endpoints.length,
                    })}
                  </Typography>
                  <TextField
                    variant="outlined"
                    placeholder={t('apiTask.import.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ width: 300 }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ fontSize: 18 }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Stack>

                <TableContainer component={Paper} sx={{ maxHeight: 350 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
                          <Checkbox
                            indeterminate={
                              filteredEndpoints.some(
                                (ep) => selectedEndpoints[`${ep.method} ${ep.path}`],
                              ) && !allFilteredSelected
                            }
                            checked={allFilteredSelected}
                            onChange={toggleSelectAllFiltered}
                          />
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 'bold', width: 100, bgcolor: 'background.paper' }}
                        >
                          Method
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>
                          Path
                        </TableCell>
                        <TableCell sx={{ fontWeight: 'bold', bgcolor: 'background.paper' }}>
                          {t('apiTask.import.endpointName')}
                        </TableCell>
                        <TableCell
                          sx={{ fontWeight: 'bold', width: 220, bgcolor: 'background.paper' }}
                        >
                          {t('apiTask.import.generatedKey')}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredEndpoints.map((ep, idx) => {
                        const keyName = `${ep.method} ${ep.path}`;
                        const isChecked = !!selectedEndpoints[keyName];
                        const generatedKey = sanitizeTaskKey(taskKeyPrefix, ep.method, ep.path);
                        return (
                          <TableRow key={idx} hover selected={isChecked}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isChecked}
                                onChange={() => toggleEndpoint(ep.method, ep.path)}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={ep.method}
                                color={
                                  ep.method === 'GET'
                                    ? 'info'
                                    : ep.method === 'POST'
                                      ? 'success'
                                      : ep.method === 'DELETE'
                                        ? 'error'
                                        : 'warning'
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: '13px' }}>
                              {ep.path}
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                {ep.summary || '-'}
                              </Typography>
                              {ep.description && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  noWrap
                                  sx={{ maxWidth: 300, display: 'block' }}
                                >
                                  {ep.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: 'monospace',
                                fontSize: '12px',
                                color: 'text.secondary',
                              }}
                            >
                              {generatedKey}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogTitle sx={{ display: 'none' }} />
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {importResult ? (
          <Button
            onClick={() => {
              onClose();
              setImportResult(null);
            }}
            variant="contained"
            color="primary"
          >
            {t('apiTask.import.done')}
          </Button>
        ) : (
          <>
            <Button disabled={importing} onClick={onClose} variant="outlined">
              {t('apiTask.import.cancel')}
            </Button>
            <Button
              onClick={handleImportSubmit}
              variant="contained"
              color="secondary"
              disabled={
                importing ||
                !selectedDocId ||
                !baseUrl.trim() ||
                endpoints.filter((ep) => selectedEndpoints[`${ep.method} ${ep.path}`]).length === 0
              }
              startIcon={importing && <CircularProgress size={16} color="inherit" />}
            >
              {importing ? t('apiTask.import.importing') : t('apiTask.import.start')}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
