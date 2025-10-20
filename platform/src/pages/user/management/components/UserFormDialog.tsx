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
import { ResponsiveButton } from '@/layout/responsive';
import type { User, UserAddRequest, UserUpdateRequest } from '@/api/system/user';

interface FormData {
  username: string;
  password: string;
  department: string;
  role: string;
  isEnabled: boolean;
}

interface UserFormDialogProps {
  open: boolean;
  user: User | null; // null表示添加用户，有值表示编辑用户
  loading: boolean;
  onClose: () => void;
  onSave: (data: UserAddRequest | UserUpdateRequest) => void;
}

export default function UserFormDialog({ 
  open, 
  user, 
  loading, 
  onClose, 
  onSave 
}: UserFormDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    department: '',
    role: '普通用户',
    isEnabled: true,
  });

  const isEditing = !!user;

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
    } else {
      setFormData({
        username: '',
        password: '',
        department: '',
        role: '普通用户',
        isEnabled: true,
      });
    }
  }, [user]);

  // 处理表单数据变化
  const handleFormChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // 处理保存
  const handleSave = () => {
    if (isEditing && user) {
      // 编辑用户
      const updateData: UserUpdateRequest = {
        id: user.id,
        username: formData.username,
        department: formData.department,
        role: formData.role,
        isEnabled: formData.isEnabled,
      };

      // 只有输入了新密码才更新密码
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      onSave(updateData);
    } else {
      // 添加用户
      const addData: UserAddRequest = {
        username: formData.username,
        password: formData.password,
        department: formData.department,
        role: formData.role,
        isEnabled: formData.isEnabled,
      };

      onSave(addData);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {isEditing ? '编辑用户' : '添加新用户'}
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
            label={isEditing ? "新密码" : "密码"}
            type="password"
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            margin="normal"
            required={!isEditing}
            helperText={isEditing ? "留空则不修改密码" : ""}
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
        <ResponsiveButton onClick={onClose}>
          取消
        </ResponsiveButton>
        <ResponsiveButton 
          onClick={handleSave} 
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : (isEditing ? '保存' : '添加')}
        </ResponsiveButton>
      </DialogActions>
    </Dialog>
  );
}
