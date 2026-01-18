/**
 * 邮件发送日志页面 - 重构示例
 * 展示如何使用新的响应式组件系统来简化移动端适配
 */

import { useEffect, useState, useCallback } from 'react';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import * as mailLogAPI from '@/api/mail/log';
import { PageLayout, ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import TheFilter from './components/TheFilter';
import TheTable from './components/TheTable';
import TheDetail from './components/TheDetail';
import type { ListMailLog, FilterState } from './type';

export default function MailLogRefactored() {
  const t = useTranslation();
  const [logs, setLogs] = useState<ListMailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<ListMailLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    keyword: '',
    orderBy: 'id',
    descend: true, // 默认按ID降序，显示最新的日志
  });

  const fetchLogs = useCallback(async (searchParams: FilterState) => {
    setLoading(true);
    try {
      const requestData = {
        pageNo: 1,
        pageSize: 100,
        ...(searchParams.keyword && { keyword: searchParams.keyword }),
        orderBy: searchParams.orderBy,
        descend: searchParams.descend,
      };

      const res = await mailLogAPI.listFn({ data: requestData });
      const response = res.data;
      const logsList = response?.data?.list || [];
      const total = response?.data?.total || 0;

      setLogs(logsList);
      setTotalCount(total);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFilterChange = useCallback(
    (newFilters: FilterState) => {
      setFilters(newFilters);
      fetchLogs(newFilters);
    },
    [fetchLogs],
  );

  const handleRefresh = () => {
    fetchLogs(filters);
  };

  const handleViewLog = (log: ListMailLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedLog(null);
  };

  useEffect(() => {
    fetchLogs({
      keyword: '',
      orderBy: 'id',
      descend: true,
    });
  }, [fetchLogs]);

  return (
    <PageLayout
      title={t('mail.log.title')}
      actions={
        <ResponsiveButton variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
          {t('common.refresh')}
        </ResponsiveButton>
      }
    >
      {/* 筛选组件 */}
      <TheFilter onFilterChange={handleFilterChange} filterCount={totalCount} />

      {/* 数据表格 */}
      <TheTable logs={logs} loading={loading} onView={handleViewLog} />

      {/* 详情对话框 */}
      <TheDetail open={detailOpen} log={selectedLog} onClose={handleCloseDetail} />
    </PageLayout>
  );
}
