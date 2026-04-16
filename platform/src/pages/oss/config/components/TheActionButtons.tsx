import { Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheFormRef } from './TheForm';

interface ActionButtonsProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = ({ formRef }: ActionButtonsProps) => {
  const t = useTranslation();

  return (
    <Button variant="contained" startIcon={<Add />} onClick={() => formRef.current?.open()}>
      {t('dialog.add')}
    </Button>
  );
};
