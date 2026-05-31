import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { SchemaForm, DynamicForm } from '@/components/Form/index';
import type { SchemaCrudConfig } from '../types';

interface FormDialogProps<TRecord, TFilters, TApiData, TExtra = unknown> {
  open: boolean;
  onClose: () => void;
  editId: number | null;
  form: Partial<TRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<TRecord>>>;
  formLoading: boolean;
  errorContextValue: {
    fieldErrors: Record<string, string>;
    clearFieldError: (path: string) => void;
    rootSchema?: Record<string, unknown>;
  };
  config: SchemaCrudConfig<TRecord, TFilters, TApiData, TExtra>;
  extraContext?: TExtra;
  onSubmit: (e: React.FormEvent) => void;
  isMobile: boolean;
  t: (key: string) => string;
}

export function FormDialog<TRecord, TFilters, TApiData, TExtra = unknown>({
  open,
  onClose,
  editId,
  form,
  setForm,
  formLoading,
  errorContextValue,
  config,
  extraContext,
  onSubmit,
  isMobile,
  t,
}: FormDialogProps<TRecord, TFilters, TApiData, TExtra>) {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(4),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: isMobile ? 1 : 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {editId ? t('dialog.edit') : t('dialog.add')}
        </Box>
        {isMobile && (
          <IconButton edge="end" color="inherit" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          pb: isMobile ? 1 : 2,
          px: isMobile ? 2 : 3,
        }}
      >
        <SchemaForm schema={config.form.schema} contextValue={errorContextValue}>
          <Box sx={{ pt: 2 }}>
            {config.form.renderForm ? (
              config.form.renderForm(form, setForm, isMobile, t, extraContext)
            ) : (
              <DynamicForm
                schema={config.form.schema}
                value={form as Record<string, unknown>}
                onChange={(val) => setForm(val as Partial<TRecord>)}
                disabled={formLoading}
              />
            )}
          </Box>
        </SchemaForm>
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          disabled={formLoading}
        >
          {t('dialog.cancel')}
        </Button>
        <Button
          onClick={onSubmit}
          variant="contained"
          color="primary"
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
          disabled={formLoading}
        >
          {t('dialog.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
