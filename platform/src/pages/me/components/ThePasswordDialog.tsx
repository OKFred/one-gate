import { useState, forwardRef, useImperativeHandle, memo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  IconButton,
  Button,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useTranslation } from '@/hooks/useTranslation';
import { updatePasswordFn } from '@/api/system/auth';
import { showSnackbar } from '@/components/Notification';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';

// 暴露给父组件的方法
export interface ThePasswordDialogRef {
  /** 打开对话框 */
  open: () => void;
  /** 关闭对话框 */
  close: () => void;
}

const ThePasswordDialog = memo(
  forwardRef<ThePasswordDialogRef, Props>((_, ref) => {
    const t = useTranslation();
    const { isMobile } = useResponsive();
    const [open, setOpen] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // 表单数据
    const [formData, setFormData] = useState({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    // 表单错误
    const [errors, setErrors] = useState({
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });

    // 暴露给父组件的方法
    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setOpen(true);
          resetForm();
        },
        close: () => {
          setOpen(false);
          resetForm();
        },
      }),
      [],
    );

    // 重置表单
    const resetForm = () => {
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setErrors({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowOldPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    };

    // 验证表单
    const validateForm = (): boolean => {
      const newErrors = {
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      };
      let isValid = true;
      const getRegExp = () => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{7,30}$/;
      // 验证旧密码
      if (!formData.oldPassword) {
        newErrors.oldPassword = t('dialog.required');
        isValid = false;
      } else if (getRegExp().test(formData.oldPassword) === false) {
        newErrors.oldPassword = t('me.changePassword.passwordFormatHint');
        isValid = false;
      }

      // 验证新密码
      if (!formData.newPassword) {
        newErrors.newPassword = t('dialog.required');
        isValid = false;
      } else if (getRegExp().test(formData.newPassword) === false) {
        newErrors.newPassword = t('me.changePassword.passwordFormatHint');
        isValid = false;
      } else if (formData.newPassword === formData.oldPassword) {
        newErrors.newPassword = t('me.changePassword.sameAsOldPassword');
        isValid = false;
      }

      // 验证确认密码
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = t('me.changePassword.confirmPasswordRequired');
        isValid = false;
      } else if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = t('me.changePassword.passwordMismatch');
        isValid = false;
      }

      setErrors(newErrors);
      return isValid;
    };

    // 处理输入变化
    const handleInputChange =
      (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
          ...prev,
          [field]: e.target.value,
        }));
        // 清除对应字段的错误
        if (errors[field]) {
          setErrors((prev) => ({
            ...prev,
            [field]: '',
          }));
        }
      };

    // 处理保存
    const handleSave = async () => {
      if (!validateForm()) {
        return;
      }

      setLoading(true);
      try {
        const toBase64 = (str: string) => globalThis.btoa(str);
        await updatePasswordFn({
          data: {
            oldPassword: toBase64(formData.oldPassword),
            newPassword: toBase64(formData.newPassword),
          },
        });
        showSnackbar({
          type: 'success',
          message: t('me.changePassword.success'),
        });
        setOpen(false);
        resetForm();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    // 处理关闭
    const handleClose = () => {
      if (!loading) {
        setOpen(false);
        resetForm();
      }
    };

    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <SettingsIcon sx={{ mr: 1 }} />
            {t('me.changePassword.title')}
          </Box>
        </DialogTitle>

        <DialogContent>
          <Box pt={1}>
            <TextField
              fullWidth
              label={t('me.table.currentPassword')}
              type={showOldPassword ? 'text' : 'password'}
              margin="normal"
              value={formData.oldPassword}
              onChange={handleInputChange('oldPassword')}
              error={!!errors.oldPassword}
              helperText={errors.oldPassword}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton
                      aria-label="toggle old password visibility"
                      onClick={() => setShowOldPassword(!showOldPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showOldPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label={t('me.table.newPassword')}
              type={showNewPassword ? 'text' : 'password'}
              margin="normal"
              value={formData.newPassword}
              onChange={handleInputChange('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton
                      aria-label="toggle new password visibility"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                },
              }}
            />
            <TextField
              fullWidth
              label={t('me.table.confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              margin="normal"
              value={formData.confirmPassword}
              onChange={handleInputChange('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              disabled={loading}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      onMouseDown={(e) => e.preventDefault()}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  ),
                },
              }}
            />
          </Box>
        </DialogContent>

        <DialogActions>
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

ThePasswordDialog.displayName = 'ThePasswordDialog';

export default ThePasswordDialog;
