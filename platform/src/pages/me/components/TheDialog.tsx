import { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import type { GetUserRes, UpdateUserReq } from '@/api/system/type';
import type { Props } from '../index';

// 暴露给父组件的方法
export interface TheDialogRef {
  /** 打开对话框 */
  open: (user: GetUserRes) => void;
  /** 关闭对话框 */
  close: () => void;
  /** 设置保存回调 */
  setSaveHandler: (handler: (formData: UpdateUserReq) => void) => void;
}

const TheDialog = memo(
  forwardRef<TheDialogRef, Props>((_, ref) => {
    const t = useTranslation();
    const [open, setOpen] = useState(false);
    const [user, setUser] = useState<GetUserRes | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [saveHandler, setSaveHandler] = useState<((formData: UpdateUserReq) => void) | null>(
      null,
    );

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        open: (userData: GetUserRes) => {
          setUser(userData);
          setOpen(true);
        },
        close: () => {
          setOpen(false);
          setShowPassword(false);
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
      setShowPassword(false);
    };

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <SettingsIcon sx={{ mr: 1 }} />
            {t('me.edit.title')}
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box pt={1}>
            <TextField
              fullWidth
              label={t('me.edit.username')}
              value={user?.username || ''}
              margin="normal"
              disabled
              helperText={t('me.edit.usernameHelper')}
            />
            <TextField
              fullWidth
              label={t('me.edit.newPassword')}
              type={showPassword ? 'text' : 'password'}
              margin="normal"
              helperText={t('me.edit.passwordHelper')}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions>
          <ResponsiveButton onClick={handleClose}>{t('common.cancel')}</ResponsiveButton>
          <ResponsiveButton onClick={handleSave} variant="contained">
            {t('common.actions.save')}
          </ResponsiveButton>
        </DialogActions>
      </Dialog>
    );
  }),
);

TheDialog.displayName = 'TheDialog';

export default TheDialog;
