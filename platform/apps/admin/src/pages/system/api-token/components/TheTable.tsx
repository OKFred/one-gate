import { Chip, Tooltip } from '@mui/material';
import dayjs from 'dayjs';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { ListApiTokenRes } from '@/api/admin/system/type';

export type ApiTokenRes = NonNullable<ListApiTokenRes['list']>[0];

/**
 * 解析 permissions JSON 字符串并格式化为权限摘要
 * @param permissionsJson JSON 数组字符串
 * @returns 显示用的权限文本
 */
function formatPermissions(permissionsJson: string): { summary: string; full: string } {
  try {
    const codes: string[] = JSON.parse(permissionsJson);
    if (codes.length === 0) return { summary: '--', full: '--' };
    const summary =
      codes.length <= 2 ? codes.join(', ') : `${codes.slice(0, 2).join(', ')} +${codes.length - 2}`;
    return { summary, full: codes.join('\n') };
  } catch {
    return { summary: permissionsJson, full: permissionsJson };
  }
}

/**
 * 计算令牌有效状态（组合 status + 过期时间）
 */
function getEffectiveStatus(row: ApiTokenRes): {
  label: string;
  color: 'success' | 'error' | 'warning';
} {
  if (row.status === 'revoked') return { label: 'Revoked', color: 'error' };
  if (row.expireTimeUtc && Date.now() > row.expireTimeUtc)
    return { label: 'Expired', color: 'warning' };
  if (row.startTimeUtc && Date.now() < row.startTimeUtc)
    return { label: 'Pending', color: 'warning' };
  return { label: 'Active', color: 'success' };
}

export const tableConfig: SchemaCrudConfig<ApiTokenRes, FilterState, unknown>['table'] = {
  columns: (t) => [
    { title: t('columns.id'), render: (row) => row.id },
    { title: t('apiToken.name'), render: (row) => row.name },
    {
      title: t('apiToken.tokenPrefix'),
      render: (row) => (
        <code style={{ fontSize: '0.85em', opacity: 0.7 }}>{row.tokenPrefix}••••</code>
      ),
    },
    {
      title: t('apiToken.permissions'),
      render: (row) => {
        const { summary, full } = formatPermissions(row.permissions);
        return (
          <Tooltip title={<pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{full}</pre>} arrow>
            <span>{summary}</span>
          </Tooltip>
        );
      },
    },
    {
      title: t('apiToken.lastUsed'),
      render: (row) =>
        row.lastUsedTimeUtc ? dayjs(row.lastUsedTimeUtc).format('YYYY-MM-DD HH:mm') : '--',
    },
    {
      title: t('apiToken.expireTime'),
      render: (row) =>
        row.expireTimeUtc
          ? dayjs(row.expireTimeUtc).format('YYYY-MM-DD HH:mm')
          : t('apiToken.never'),
    },
    {
      title: t('apiToken.status'),
      render: (row) => {
        const { label, color } = getEffectiveStatus(row);
        return <Chip label={label} color={color} size="small" variant="outlined" />;
      },
    },
  ],

  cardFields: (t) => [
    { type: 'title', render: (row) => row.name },
    {
      type: 'subtitle',
      label: t('apiToken.tokenPrefix'),
      render: (row) => `${row.tokenPrefix}••••`,
    },
    {
      type: 'content',
      label: t('apiToken.permissions'),
      render: (row) => formatPermissions(row.permissions).summary,
    },
    {
      type: 'content',
      label: t('apiToken.lastUsed'),
      render: (row) =>
        row.lastUsedTimeUtc ? dayjs(row.lastUsedTimeUtc).format('YYYY-MM-DD HH:mm') : '--',
    },
    {
      type: 'tags',
      render: (row) => {
        const { label, color } = getEffectiveStatus(row);
        return <Chip label={label} color={color} size="small" />;
      },
    },
  ],
};
