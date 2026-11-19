import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import type { DetailDialogItemSpec, DetailDialogSpec } from '@hodor/contracts/types';
import { postCrudEndpoint } from '@/api/crud';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import { renderContractIcon } from './iconRegistry';
import { evaluateCondition, getValueByPath, resolvePayloadMap } from './utils';

interface ContractDetailDialogProps {
  open: boolean;
  onClose: () => void;
  spec: DetailDialogSpec;
  row: Record<string, unknown> | null;
}

function formatJsonPretty(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') {
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
  return JSON.stringify(raw, null, 2);
}

function renderDetailItem(
  item: DetailDialogItemSpec,
  record: Record<string, unknown>,
  t: (key: string) => string,
) {
  if (item.visibleWhen && !evaluateCondition(item.visibleWhen, record, true)) {
    return null;
  }

  const val = getValueByPath(record, item.field);
  const label = item.labelKey ? t(item.labelKey) : item.field;
  const fallback = item.fallbackKey ? t(item.fallbackKey) : (item.fallback ?? '-');
  const renderer = item.renderer ?? 'text';

  if (renderer === 'alert') {
    if (!val) return null;
    return (
      <Alert key={item.field} severity={item.severity ?? 'info'}>
        {item.labelKey && <Typography variant="subtitle2">{label}</Typography>}
        <Typography variant="body2">{String(val)}</Typography>
      </Alert>
    );
  }

  if (renderer === 'jsonPre' || renderer === 'codePre') {
    if (!val && val !== 0) return null;
    const text = renderer === 'jsonPre' ? formatJsonPretty(val) : String(val);
    return (
      <Box key={item.field}>
        {item.labelKey && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {label}
          </Typography>
        )}
        <Box
          component="pre"
          sx={{
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
            p: 2,
            borderRadius: 1,
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            overflow: 'auto',
            maxHeight: 320,
            m: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text}
        </Box>
      </Box>
    );
  }

  if (renderer === 'booleanChip') {
    const boolVal = Boolean(val);
    return (
      <Box key={item.field}>
        {item.labelKey && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {label}
          </Typography>
        )}
        <Chip
          label={
            boolVal
              ? t(item.trueLabelKey ?? 'status.success')
              : t(item.falseLabelKey ?? 'status.failure')
          }
          color={boolVal ? (item.trueColor ?? 'success') : (item.falseColor ?? 'error')}
          variant="outlined"
          size="small"
        />
      </Box>
    );
  }

  if (renderer === 'enumChip') {
    const opt = item.options?.[String(val)];
    return (
      <Box key={item.field}>
        {item.labelKey && (
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {label}
          </Typography>
        )}
        <Chip
          label={opt?.labelKey ? t(opt.labelKey) : (opt?.label ?? String(val ?? fallback))}
          color={opt?.color ?? 'default'}
          variant={opt?.variant ?? 'outlined'}
          size="small"
        />
      </Box>
    );
  }

  let displayStr = fallback;
  if (renderer === 'datetime') {
    if (val !== null && val !== undefined && val !== '') {
      displayStr = dayjs(typeof val === 'number' ? val : String(val)).format(
        item.format ?? 'YYYY-MM-DD HH:mm:ss',
      );
    }
  } else if (val !== null && val !== undefined && val !== '') {
    displayStr = String(val);
  }

  return (
    <Box key={item.field}>
      {item.labelKey && (
        <Typography variant="subtitle2" color="text.secondary">
          {label}
        </Typography>
      )}
      <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
        {displayStr}
      </Typography>
    </Box>
  );
}

export function ContractDetailDialog({ open, onClose, spec, row }: ContractDetailDialogProps) {
  const { isMobile } = useResponsive();
  const t = useTranslation();
  const [fetchedData, setFetchedData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!open || !row || !spec.fetchUrl) {
      setFetchedData(null);
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      setLoading(true);
      try {
        const payload = resolvePayloadMap(spec.fetchPayloadMap, row);
        const res = await postCrudEndpoint<unknown>(spec.fetchUrl!, { data: payload });
        if (!active) return;
        const data = res.data?.data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          setFetchedData({ ...row, ...(data as Record<string, unknown>) });
        } else {
          setFetchedData({ ...row, value: data });
        }
      } catch {
        if (active) setFetchedData(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchDetail();
    return () => {
      active = false;
    };
  }, [open, row, spec.fetchUrl, spec.fetchPayloadMap]);

  if (!row) return null;
  const record = fetchedData ?? row;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={spec.maxWidth ?? 'md'}
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {spec.titleIcon && renderContractIcon(spec.titleIcon)}
          <Typography variant="h6" component="span">
            {t(spec.titleKey ?? 'page.details')}
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {(spec.sections ?? []).map((sec, idx) => {
              if (sec.visibleWhen && !evaluateCondition(sec.visibleWhen, record, true)) {
                return null;
              }
              const items = sec.items
                .map((it) => renderDetailItem(it, record, t))
                .filter((node) => node !== null);
              if (items.length === 0) return null;

              return (
                <Box key={sec.titleKey ?? idx}>
                  {idx > 0 && <Divider sx={{ mb: 2 }} />}
                  {sec.titleKey && (
                    <Typography variant="h6" gutterBottom>
                      {sec.icon && renderContractIcon(sec.icon)}
                      {t(sec.titleKey)}
                    </Typography>
                  )}
                  <Stack spacing={1.5}>{items}</Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" variant="contained">
          {t('dialog.close')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
