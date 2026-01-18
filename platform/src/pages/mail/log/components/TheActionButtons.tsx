import { memo } from 'react';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheTableRef } from './TheTable';

interface TheActionButtonsProps {
  tableRef: React.RefObject<TheTableRef | null>;
}

export const TheActionButtons = memo(({ tableRef }: TheActionButtonsProps) => {
  const t = useTranslation();

  const handleRefresh = () => {
    tableRef.current?.refresh();
  };

  return (
    <ResponsiveButton variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
      {t('common.refresh')}
    </ResponsiveButton>
  );
});

TheActionButtons.displayName = 'TheActionButtons';
