import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  CircularProgress,
} from '@mui/material';
import { Settings as SettingsIcon } from '@mui/icons-material';
import { ResponsiveButton } from '@/layout/responsive';
import type { User } from '@/api/user';

interface FormData {
  username: string;
  password: string;
  department: string;
  role: string;
  isEnabled: boolean;
}

interface UserEditDialogProps {
  open: boolean;
  user: User | null;
  loading: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
}

export default function UserEditDialog({ 
  open, 
  user, 
  loading, 
  onClose, 
  onSave 
}: UserEditDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    department: '',
    role: '',
    isEnabled: true,
  });

  // 当用户数据改变时更新表单
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        password: '',
        department: user.department,
        role: user.role,
        isEnabled: user.isEnabled,
      });
    }
  }, [user]);

  // 处理表单数据变化
  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <SettingsIcon sx={{ mr: 1 }} />
          编辑个人信息
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box pt={1}>
          <TextField
            fullWidth
            label="用户名"
            value={formData.username}
            onChange={(e) => handleFormChange('username', e.target.value)}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="新密码"
            type="password"
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            margin="normal"
            helperText="留空则不修改密码"
          />
          
          <TextField
            fullWidth
            label="部门"
            value={formData.department}
            onChange={(e) => handleFormChange('department', e.target.value)}
            margin="normal"
            required
          />
          
          <FormControl fullWidth margin="normal" required>
            <InputLabel>角色</InputLabel>
            <Select
              value={formData.role}
              label="角色"
              onChange={(e) => handleFormChange('role', e.target.value)}
            >
              <MenuItem value="管理员">管理员</MenuItem>
              <MenuItem value="普通用户">普通用户</MenuItem>
              <MenuItem value="操作员">操作员</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={formData.isEnabled}
                onChange={(e) => handleFormChange('isEnabled', e.target.checked)}
              />
            }
            label="启用账户"
            sx={{ mt: 2 }}
          />
        </Box>
      </DialogContent>
      
      <DialogActions>
        <ResponsiveButton onClick={handleClose}>
          取消
        </ResponsiveButton>
        <ResponsiveButton 
          onClick={handleSave} 
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : '保存'}
        </ResponsiveButton>
      </DialogActions>
    </Dialog>
  );
}
