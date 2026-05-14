import { Button, Stack } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheFormRef } from './TheForm';

interface ActionButtonsProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = ({ formRef }: ActionButtonsProps) => {
  const t = useTranslation();

  return (
    <Stack direction="row" spacing={1}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => formRef.current?.open()}>
        {t('dialog.add')}
      </Button>
    </Stack>
  );
};
