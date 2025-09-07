/**
 * 邮件发送日志页面 - 重构示例
 * 展示如何使用新的响应式组件系统来简化移动端适配
 */

import { useEffect, useState, useCallback } from 'react';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { listMailLog } from '@/api/mail';
import { PageLayout, ResponsiveButton } from '@/layout/responsive';
import LogFilter from './components/LogFilter';
import LogTable from './components/LogTable';
import LogDetail from './components/LogDetail';

interface MailLog {
  id?: number;
  mailTo?: string;
  mailFrom?: string;
  title?: string;
  templateId?: string;
  templateParams?: string;
  sendStatus?: boolean;
  exceptionCode?: string;
  exceptionDetails?: string;
  createTimeUtc?: number;
  updateTimeUtc?: number | null;
}

interface FilterState {
  keyword: string;
  orderBy: 'id' | 'mailTo' | 'mailFrom' | 'createTimeUtc';
  descend: boolean;
}

export default function MailLogRefactored() {
  const [logs, setLogs] = useState<MailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<MailLog | null>(null);
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

      const res = await listMailLog({ data: requestData });
      const response = res.data as { data?: { list?: MailLog[]; total?: number } };
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

  const handleViewLog = (log: MailLog) => {
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
      title="邮件发送日志"
      actions={
        <ResponsiveButton variant="outlined" startIcon={<RefreshIcon />} onClick={handleRefresh}>
          刷新
        </ResponsiveButton>
      }
    >
      {/* 筛选组件 */}
      <LogFilter onFilterChange={handleFilterChange} filterCount={totalCount} />

      {/* 数据表格 */}
      <LogTable
        logs={logs}
        loading={loading}
        onView={handleViewLog}
      />

      {/* 详情对话框 */}
      <LogDetail
        open={detailOpen}
        log={selectedLog}
        onClose={handleCloseDetail}
      />
    </PageLayout>
  );
}

/**
 * 重构前后对比：
 *
 * 重构前：
 * - 使用原生HTML表格，没有响应式设计
 * - 缺少搜索和筛选功能
 * - 没有详情查看功能
 * - 样式简陋，用户体验差
 *
 * 重构后：
 * - 使用响应式组件系统，自动适配移动端
 * - 支持关键词搜索和多字段排序
 * - 提供详细的日志查看功能
 * - 统一的设计风格和良好的用户体验
 * - 包含错误信息展示和模板参数查看
 */
