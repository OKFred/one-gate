import { Stack, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import type { TheTableRef } from './TheTable';

interface ActionButtonsProps {
  tableRef: React.RefObject<TheTableRef | null>;
}

export const TheActionButtons = ({ tableRef }: ActionButtonsProps) => {
  const t = useTranslation();

  const handleRefresh = () => {
    tableRef.current?.refresh();
  };

  return (
    <Stack direction="row" spacing={1}>
      <Button
        variant="contained"
        startIcon={<RefreshIcon />}
        onClick={handleRefresh}
      >
        {t('table.refresh')}
      </Button>
    </Stack>
  );
};
