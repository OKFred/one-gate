import { forwardRef, useImperativeHandle, useState, memo, useRef, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, Paper, Tooltip } from '@mui/material';
import { AccountBox as AccountBoxIcon, Edit as EditIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { AUTH } from '@/hooks/usePermission';
import type { GetUserRes } from '@/api/system/type';
import type { Props } from '../index';
import dayjs from 'dayjs';
import { useTranslation } from '@/hooks/useTranslation';
import TheEditDialog, { type TheEditDialogRef } from './TheEditDialog';
import * as RegionAPI from '@/api/i18n/region';
import * as LanguageAPI from '@/api/i18n/language';
import type { ListAllRegionRes, ListAllLanguageRes } from '@/api/i18n/type';

// 暴露给父组件的方法
export interface TheDetailsRef {
  /** 更新用户数据 */
  updateUser: (user: GetUserRes | null) => void;
  /** 启用的地区列表 */
  enabledRegions: ListAllRegionRes;
}

const TheDetails = memo(
  forwardRef<TheDetailsRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const [user, setUser] = useState<GetUserRes | null>(null);
    const editDialogRef = useRef<TheEditDialogRef>(null);
    const [enabledRegions, setEnabledRegions] = useState<ListAllRegionRes>([]);
    const [enabledLanguages, setEnabledLanguages] = useState<ListAllLanguageRes>([]);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        updateUser: (userData: GetUserRes | null) => {
          setUser(userData);
        },
        enabledRegions,
      }),
      [enabledRegions],
    );
    // 获取启用的地区列表和语言列表
    useEffect(() => {
      const fetchRegions = async () => {
        try {
          const res = await RegionAPI.listAllFn({ data: { isEnabled: true } });
          setEnabledRegions(res.data.data || []);
        } catch (error) {
          console.error('Failed to fetch regions:', error);
        }
      };
      const fetchLanguages = async () => {
        try {
          const res = await LanguageAPI.listAllFn({ data: { isEnabled: true } });
          setEnabledLanguages(res.data.data || []);
        } catch (error) {
          console.error('Failed to fetch languages:', error);
        }
      };
      fetchRegions();
      fetchLanguages();
    }, []);

    const handleEdit = () => {
      editDialogRef.current?.open(user!);
    };

    if (!user) return null;

    return (
      <>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 1,
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AccountBoxIcon sx={{ mr: 1 }} />
                <Typography variant="h6">{t('me.subtitle')}</Typography>
              </Box>
              <ResponsiveButton
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                permissionCodes={[AUTH.PROFILE.UPDATE_PROFILE]}
              >
                {t('dialog.edit')}
              </ResponsiveButton>
            </Box>

            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box
                sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
              >
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
                    {String(
                      (user.regionObj?.value &&
                        enabledRegions?.find((region) => region.id === user.regionObj?.value)
                          ?.labels?.[user.langCode]) ||
                        t('column.unassigned'),
                    )}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('me.role')}
                  </Typography>
                  <Box>
                    {user.roleArr?.map((role) => (
                      <Chip key={role.value} label={role.label} color="success" size="small" />
                    )) || <Chip label={t('column.unassigned')} color="warning" size="small" />}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('column.language')}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {enabledLanguages.find((lang) => lang.langCode === user.langCode)?.nativeName ||
                      user.langCode ||
                      t('column.unassigned')}
                  </Typography>
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
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    {t('column.remark')}
                  </Typography>
                  <Tooltip title={user.remark || ''} placement="top" arrow>
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        wordBreak: 'break-word',
                        cursor: user.remark ? 'pointer' : 'default',
                      }}
                    >
                      {user.remark || t('column.noData')}
                    </Typography>
                  </Tooltip>
                </Box>
                <Box>
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
        <TheEditDialog ref={editDialogRef} localObj={localObj} />
      </>
    );
  }),
);

TheDetails.displayName = 'TheDetails';

export default TheDetails;
