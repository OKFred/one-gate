import { Card, CardContent, Typography, Box, Chip, Paper } from '@mui/material';
import { AccountBox as AccountBoxIcon, Edit as EditIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import type { User } from '@/pages/me/type';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';

interface UserDetailsProps {
  user: User;
  onEdit: () => void;
}

export default function UserDetails({ user, onEdit }: UserDetailsProps) {
  const t = useTranslation();

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <AccountBoxIcon sx={{ mr: 1 }} />
            <Typography variant="h6">{t('me.details.title')}</Typography>
          </Box>
          <ResponsiveButton variant="contained" startIcon={<EditIcon />} onClick={onEdit}>
            {t('common.actions.edit')}
          </ResponsiveButton>
        </Box>

        <Paper variant="outlined" sx={{ p: 2 }}>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('me.details.userId')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.id}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('me.details.username')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.username}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('me.details.department')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.departmentObj?.label || t('common.unassigned')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('me.details.role')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.roleArr.map((role) => role.label).join(', ') || t('common.unassigned')}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('me.details.accountStatus')}
              </Typography>
              <Chip
                label={user.isEnabled ? t('common.status.enabled') : t('common.status.disabled')}
                color={user.isEnabled ? 'success' : 'error'}
                size="small"
              />
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">
                {t('common.columns.createTime')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.createTimeUtc
                  ? new Date(user.createTimeUtc).toLocaleString()
                  : t('common.noData')}
              </Typography>
            </Box>

            <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
              <Typography variant="body2" color="text.secondary">
                {t('common.columns.updateTime')}
              </Typography>
              <Typography variant="body1" gutterBottom>
                {user.updateTimeUtc
                  ? dayjs(user.updateTimeUtc).format('YYYY-MM-DD HH:mm:ss')
                  : t('common.noData')}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
}
