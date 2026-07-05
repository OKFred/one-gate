import { useState, useEffect, memo } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import { DynamicForm } from '@/components/Form';
import * as SchemaFormAPI from '@/api/infra/system/schemaForm';
import { useTranslation } from '@/hooks/useTranslation';

export interface TheDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  formCode: string;
  dataContent: string;
  businessId: number | null;
}

const TheDetailsDialog = memo(
  ({ open, onClose, formCode, dataContent, businessId }: TheDetailsDialogProps) => {
    const t = useTranslation();
    const [loading, setLoading] = useState(false);
    const [schema, setSchema] = useState<Record<string, unknown> | null>(null);
    const [formData, setFormData] = useState<Record<string, unknown>>({});
    const [errorMessage, setErrorMessage] = useState('');
    const [rawJsonMode, setRawJsonMode] = useState(false);

    useEffect(() => {
      if (!open) return;

      setLoading(true);
      setErrorMessage('');
      setSchema(null);
      setRawJsonMode(false);

      // 解析表单数据
      let parsedData: Record<string, unknown> = {};
      try {
        parsedData = JSON.parse(dataContent || '{}');
        setFormData(parsedData);
      } catch {
        setFormData({});
      }

      async function fetchSchema() {
        try {
          // 异步加载该表单 Code 对应的 Schema 配置
          const res = await SchemaFormAPI.getFn({ data: { code: formCode } });
          const config = res.data?.data;
          if (config && config.schemaData) {
            const parsedSchema = JSON.parse(config.schemaData);
            setSchema(parsedSchema);
          } else {
            throw new Error(t('schemaFormData.errors.noSchemaConfig'));
          }
        } catch (err: unknown) {
          console.warn('Failed to load Schema form config, falling back to raw JSON:', err);
          setRawJsonMode(true);
          setErrorMessage(t('schemaFormData.errors.fallbackToRaw'));
        } finally {
          setLoading(false);
        }
      }

      fetchSchema();
    }, [open, formCode, dataContent, t]);

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {t('schemaFormData.detailsTitle')} - {formCode} ({t('schemaFormData.filter.businessId')}:{' '}
          {businessId})
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3}>
              {errorMessage && <Alert severity="warning">{errorMessage}</Alert>}

              {rawJsonMode ? (
                <Box>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                    {t('schemaFormData.rawJsonData')}
                  </Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      fontFamily: 'Consolas, Monaco, monospace',
                      fontSize: '0.875rem',
                      whiteSpace: 'pre-wrap',
                      overflowX: 'auto',
                    }}
                  >
                    {JSON.stringify(formData, null, 2)}
                  </Box>
                </Box>
              ) : (
                schema && (
                  <DynamicForm
                    schema={schema}
                    value={formData}
                    onChange={() => {}}
                    disabled={true}
                  />
                )
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="contained" color="primary">
            {t('dialog.close')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

TheDetailsDialog.displayName = 'TheDetailsDialog';

export default TheDetailsDialog;
