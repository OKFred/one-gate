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
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import * as RegionAPI from '@/api/i18n/region';
import type { GetUserRes, UpdateUserReq } from '@/api/system/type';
import type { ListAllRegionRes } from '@/api/i18n/type';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { authUtils, type UserInfo } from '@/utils/auth';

// 暴露给父组件的方法
export interface TheEditDialogRef {
  /** 打开对话框 */
  open: (user: GetUserRes) => void;
  /** 关闭对话框 */
  close: () => void;
  /** 设置保存回调 */
  setSaveHandler: (handler: (formData: UpdateUserReq) => void) => void;
}

const TheEditDialog = memo(
  forwardRef<TheEditDialogRef, Props>((_, ref) => {
    const t = useTranslation();
    const { isMobile } = useResponsive();
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<GetUserRes | null>(null);
    const [regionObj, setRegionObj] = useState<{ value: number; label: string } | null>(null);
    const [enabledRegions, setEnabledRegions] = useState<ListAllRegionRes>([]);
    const [saveHandler, setSaveHandler] = useState<((formData: UpdateUserReq) => void) | null>(
      null,
    );
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

    // 加载用户信息
    useEffect(() => {
      const user = authUtils.getUserInfo();
      setUserInfo(user);
    }, []);

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
        setSaveHandler: (handler: (formData: UpdateUserReq) => void) => {
          setSaveHandler(() => handler);
        },
      }),
      [],
    );

    // 处理保存
    const handleSave = () => {
      if (saveHandler && user) {
        const formData: UpdateUserReq = {
          id: user.id,
          username: user.username,
          regionObj: regionObj,
          departmentObj: user.departmentObj,
          roleArr: user.roleArr,
          isEnabled: user.isEnabled,
        };
        saveHandler(formData);
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
                  const displayName = labels?.[userInfo?.langCode || ''] || region.alpha2Code || '';
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
          <ResponsiveButton onClick={handleClose}>{t('dialog.cancel')}</ResponsiveButton>
          <ResponsiveButton onClick={handleSave} variant="contained">
            {t('dialog.save')}
          </ResponsiveButton>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheEditDialog.displayName = 'TheEditDialog';

export default TheEditDialog;
