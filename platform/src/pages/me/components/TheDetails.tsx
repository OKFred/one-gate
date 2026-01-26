import { forwardRef, useImperativeHandle, useState, memo } from 'react';
import { Card, CardContent, Typography, Box, Chip, Paper } from '@mui/material';
import { AccountBox as AccountBoxIcon, Edit as EditIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import type { GetUserRes } from '@/api/system/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

// 暴露给父组件的方法
export interface TheDetailsRef {
  /** 更新用户数据 */
  updateUser: (user: GetUserRes | null) => void;
}

const TheDetails = memo(
  forwardRef<TheDetailsRef, Props>(({ localObj }, ref) => {
    const { dataRef } = localObj;
    const t = useTranslation();
    const [user, setUser] = useState<GetUserRes | null>(null);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        updateUser: (userData: GetUserRes | null) => {
          setUser(userData);
        },
      }),
      [],
    );

    const handleEdit = () => {
      dataRef.current?.openEditInfoDialog();
    };

    if (!user) return null;

    return (
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center">
              <AccountBoxIcon sx={{ mr: 1 }} />
              <Typography variant="h6">{t('me.subtitle')}</Typography>
            </Box>
            <ResponsiveButton variant="contained" startIcon={<EditIcon />} onClick={handleEdit}>
              {t('dialog.edit')}
            </ResponsiveButton>
          </Box>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('columns.id')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.id}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('login.username')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.username}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('me.department')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.departmentObj?.label || t('column.unassigned')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('me.region')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.regionObj?.label || t('column.unassigned')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('me.role')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.roleArr.map((role) => role.label).join(', ') || t('column.unassigned')}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('me.accountStatus')}
                </Typography>
                <Chip
                  label={user.isEnabled ? t('status.enabled') : t('status.disabled')}
                  color={user.isEnabled ? 'success' : 'error'}
                  size="small"
                />
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">
                  {t('columns.createTime')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.createTimeUtc
                    ? dayjs(user.createTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                    : t('column.noData')}
                </Typography>
              </Box>

              <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                <Typography variant="body2" color="text.secondary">
                  {t('columns.updateTime')}
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {user.updateTimeUtc
                    ? dayjs(user.updateTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                    : t('column.noData')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </CardContent>
      </Card>
    );
  }),
);

TheDetails.displayName = 'TheDetails';

export default TheDetails;
