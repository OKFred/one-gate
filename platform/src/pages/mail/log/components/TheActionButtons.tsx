import { memo } from 'react';
import { Refresh as RefreshIcon, Visibility as ViewIcon } from '@mui/icons-material';
import { ResponsiveButton, ResponsiveIconButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import { MAIL } from '@/hooks/usePermission';
import type { TheTableRef } from './TheTable';
import type { ListMailLogRes } from '@/api/mail/type';

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
      {t('table.refresh')}
    </ResponsiveButton>
  );
});

TheActionButtons.displayName = 'TheActionButtons';

// ==================== 查看日志详情按钮 ====================

export interface LogViewButtonProps {
  log: NonNullable<ListMailLogRes['list']>[0];
  onView: (log: NonNullable<ListMailLogRes['list']>[0]) => void;
}

/**
 * 查看日志详情按钮组件
 * 用于表格/卡片中的查看操作
 */
export const LogViewButton = memo(({ log, onView }: LogViewButtonProps) => {
  return (
    <ResponsiveIconButton
      onClick={() => onView(log)}
      color="primary"
      size="small"
      permissionCodes={[MAIL.LOG.VIEW]}
    >
      <ViewIcon />
    </ResponsiveIconButton>
  );
});

LogViewButton.displayName = 'LogViewButton';
