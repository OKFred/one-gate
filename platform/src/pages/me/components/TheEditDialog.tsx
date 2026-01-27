import { useState, forwardRef, useImperativeHandle, memo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Button,
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import * as RegionAPI from '@/api/i18n/region';
import * as AuthAPI from '@/api/system/auth';
import { showSnackbar } from '@/components/Notification';
import type { GetUserRes, UpdateProfileReq } from '@/api/system/type';
import type { ListAllRegionRes } from '@/api/i18n/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';

// 暴露给父组件的方法
export interface TheEditDialogRef {
  /** 打开对话框 */
  open: (user: GetUserRes) => void;
  /** 关闭对话框 */
  close: () => void;
}

const TheEditDialog = memo(
  forwardRef<TheEditDialogRef, Props>(({ localObj }, ref) => {
    const t = useTranslation();
    const { isMobile } = useResponsive();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<GetUserRes | null>(null);
    const [regionObj, setRegionObj] = useState<{ value: number; label: string } | null>(null);
    const [enabledRegions, setEnabledRegions] = useState<ListAllRegionRes>([]);

    // 获取启用的地区列表
    useEffect(() => {
      const fetchRegions = async () => {
        try {
          const res = await RegionAPI.listAllFn({ data: { isEnabled: true } });
          setEnabledRegions(res.data.data || []);
        } catch (error) {
          console.error('Failed to fetch regions:', error);
        }
      };
      fetchRegions();
    }, []);

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        open: (userData: GetUserRes) => {
          setUser(userData);
          setRegionObj(userData.regionObj || null);
          setOpen(true);
        },
        close: () => {
          setOpen(false);
        },
      }),
      [],
    );

    // 处理保存
    const handleSave = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const updateData: UpdateProfileReq = {
          regionObj: regionObj,
        };
        await AuthAPI.updateProfileFn({ data: { ...updateData } });
        showSnackbar({ type: 'success', message: t('dialog.operationSuccess') });
        setOpen(false);

        // 通知index刷新数据
        localObj.onRefresh();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    // 处理关闭
    const handleClose = () => {
      setOpen(false);
    };

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <EditIcon sx={{ mr: 1 }} />
            {t('dialog.edit')}
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth size={isMobile ? 'medium' : 'medium'}>
              <InputLabel>{t('me.region')}</InputLabel>
              <Select
                value={regionObj?.value || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) {
                    const region = enabledRegions.find((r) => r.id === value);
                    setRegionObj(
                      region
                        ? {
                            value: region.id,
                            label: region.alpha2Code || '',
                          }
                        : null,
                    );
                  } else {
                    setRegionObj(null);
                  }
                }}
                label={t('me.region')}
              >
                <MenuItem value="">
                  <em>{t('form.select')}</em>
                </MenuItem>
                {enabledRegions.map((region) => {
                  const labels = region.labels as Record<string, string> | undefined;
                  const displayName = labels?.[user?.langCode || ''] || region.alpha2Code || '';
                  return (
                    <MenuItem key={region.id} value={region.id}>
                      {displayName} ({region.alpha2Code})
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            variant="outlined"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            fullWidth={isMobile}
            size={isMobile ? 'large' : 'medium'}
            disabled={loading}
          >
            {t('dialog.save')}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheEditDialog.displayName = 'TheEditDialog';

export default TheEditDialog;
