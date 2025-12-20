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
  IconButton,
  Chip,
  OutlinedInput,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { ResponsiveButton } from '@/layout/responsive';
import type { User } from '@/pages/me/type';

interface FormData {
  username: string;
  password: string;
  departmentId: number | null;
  roleIdArr: number[];
  isEnabled: boolean;
}

interface UserFormDialogProps {
  open: boolean;
  user: User | null; // null表示添加用户，有值表示编辑用户
  loading: boolean;
  onClose: () => void;
  onSave: (data: FormData) => void;
}

// 预定义的角色选项
const roleOptions = [
  { value: 1, label: '超级管理员' },
  { value: 2, label: '管理员' },
  { value: 3, label: '普通用户' },
];

export default function UserFormDialog({
  open,
  user,
  loading,
  onClose,
  onSave,
}: UserFormDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    departmentId: null,
    roleIdArr: [3], // 默认普通用户
    isEnabled: true,
  });
  const [showPassword, setShowPassword] = useState(false);

  const isEditing = !!user;

  // 当用户数据改变时更新表单
  useEffect(() => {
    if (user) {
      setFormData({
        username: String(user.username),
        password: '',
        departmentId: user.departmentId || null,
        roleIdArr: user.roleIdArr || [],
        isEnabled: user.isEnabled,
      });
    } else {
      setFormData({
        username: '',
        password: '',
        departmentId: null,
        roleIdArr: [3], // 默认普通用户
        isEnabled: true,
      });
    }
  }, [user]);

  // 处理表单数据变化
  const handleFormChange = (
    field: keyof FormData,
    value: string | boolean | number | null | number[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // 处理角色多选变化
  const handleRoleChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    handleFormChange('roleIdArr', typeof value === 'string' ? value.split(',').map(Number) : value);
  };

  // 处理保存
  const handleSave = () => {
    if (isEditing && user) {
      // 编辑用户
      const updateData: FormData & { id: number } = {
        ...formData,
        id: user.id,
      };

      // 只有输入了新密码才更新密码
      if (!formData.password.trim()) {
        delete updateData.password;
      }

      onSave(updateData);
    } else {
      // 添加用户
      onSave(formData);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditing ? '编辑用户' : '添加新用户'}</DialogTitle>

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
            label={isEditing ? '新密码' : '密码'}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => handleFormChange('password', e.target.value)}
            margin="normal"
            required={!isEditing}
            helperText={isEditing ? '留空则不修改密码' : ''}
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

          <TextField
            fullWidth
            label="部门ID"
            type="number"
            value={formData.departmentId || ''}
            onChange={(e) =>
              handleFormChange('departmentId', e.target.value ? Number(e.target.value) : null)
            }
            margin="normal"
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>角色</InputLabel>
            <Select
              multiple
              value={formData.roleIdArr}
              onChange={handleRoleChange}
              input={<OutlinedInput label="角色" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const role = roleOptions.find((r) => r.value === value);
                    return <Chip key={value} label={role?.label || value} size="small" />;
                  })}
                </Box>
              )}
            >
              {roleOptions.map((role) => (
                <MenuItem key={role.value} value={role.value}>
                  {role.label}
                </MenuItem>
              ))}
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
        <ResponsiveButton onClick={onClose}>取消</ResponsiveButton>
        <ResponsiveButton onClick={handleSave} variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={20} /> : isEditing ? '保存' : '添加'}
        </ResponsiveButton>
      </DialogActions>
    </Dialog>
  );
}
