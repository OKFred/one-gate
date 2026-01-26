import { memo } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheFormRef } from './TheForm';

interface TheActionButtonsProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = memo(({ formRef }: TheActionButtonsProps) => {
  const t = useTranslation();

  const handleAdd = () => {
    formRef.current?.onOpen();
  };

  return (
    <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      {t('dialog.add')}
    </ResponsiveButton>
  );
});

TheActionButtons.displayName = 'TheActionButtons';
