import { useCallback, memo } from 'react';
import { Add as AddIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import type { TheFormRef } from './TheForm';
import { useTranslation } from '@/hooks/useTranslation';

export interface AddButtonProps {
  formRef: React.RefObject<TheFormRef | null>;
}

export const TheActionButtons = memo(({ formRef }: AddButtonProps) => {
  const t = useTranslation();
  const handleAdd = useCallback(() => {
    formRef.current?.openAdd();
  }, [formRef]);

  return (
    <ResponsiveButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd}>
      {t('schemaForm.actions.add')}
    </ResponsiveButton>
  );
});
