import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { ResponsiveButton } from '@/components/Responsive/index';
import { useTranslation } from '@/hooks/useTranslation';
import type { User } from '@/pages/me/type';

interface FormData {
  password: string;
}

interface TheDialogProps {
  open: boolean;
  user: User | null;
  loading: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}

export default function TheDialog({ open, loading, onClose, onSave }: TheDialogProps) {
  const t = useTranslation();
  const [formData, setFormData] = useState(
    /* <FormData> */ {
      password: '',
    },
  );
  const [showPassword, setShowPassword] = useState(false);

  // 当用户数据改变时更新表单
  /*   useEffect(() => {
    if (user) {
      setFormData({
        // password: '',
      });
    }
  }, [user]); */

  // 处理表单数据变化
  const handleFormChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 处理保存
  const handleSave = () => {
    onSave(formData);
  };

  // 处理关闭
  const handleClose = () => {
    onClose();
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
            label={t('me.edit.newPassword')}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
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
        <ResponsiveButton onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : t('common.actions.save')}
        </ResponsiveButton>
      </DialogActions>
    </Dialog>
  );
}
