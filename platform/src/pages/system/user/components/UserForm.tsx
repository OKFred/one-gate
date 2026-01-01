import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  OutlinedInput,
  useTheme,
  IconButton,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import type { AddUserParams } from '../type';
import { useResponsive } from '@/hooks/useResponsive';
import hasValue from '@/utils/hasValue';

interface UserFormDialogProps {
  open: boolean;
  form: AddUserParams;
  editId: number | null;
  onFormChange: (form: AddUserParams) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

// 预定义的角色选项
const roleOptions = [
  { value: 1, label: '超级管理员' },
  { value: 2, label: '管理员' },
  { value: 3, label: '普通用户' },
];

export default function UserFormDialog({
  open,
  form,
  editId,
  onFormChange,
  onSubmit,
  onCancel,
}: UserFormDialogProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  // 处理角色多选变化
  const handleRoleChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    onFormChange({
      ...form,
      roleIdArr: typeof value === 'string' ? value.split(',').map(Number) : value,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      sx={{
        '& .MuiDialog-paper': {
          margin: isMobile ? 0 : theme.spacing(4),
          maxHeight: isMobile ? '100vh' : 'calc(100vh - 64px)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: isMobile ? 1 : 2,
        }}
      >
        <Box>{editId ? '编辑用户' : '添加新用户'}</Box>
        {isMobile && (
          <IconButton edge="end" color="inherit" onClick={onCancel} aria-label="close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>

      <DialogContent
        sx={{
          pb: isMobile ? 1 : 2,
          px: isMobile ? 2 : 3,
        }}
      >
        <form onSubmit={handleSubmit}>
          <Stack spacing={isMobile ? 2 : 3} sx={{ mt: 1 }}>
            <TextField
              label="用户名"
              value={form.username}
              onChange={(e) => onFormChange({ ...form, username: e.target.value })}
              required
              fullWidth
              size={isMobile ? 'medium' : 'medium'}
            />

            <TextField
              label={editId ? '新密码' : '密码'}
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => onFormChange({ ...form, password: e.target.value })}
              required={!editId}
              fullWidth
              size={isMobile ? 'medium' : 'medium'}
              helperText={editId ? '留空则不修改密码' : ''}
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
              label="部门ID"
              type="number"
              value={form.departmentId || ''}
              onChange={(e) => {
                const value = e.target.value;
                onFormChange({
                  ...form,
                  departmentId: hasValue(value) ? Number(value) : null,
                });
              }}
              fullWidth
              size={isMobile ? 'medium' : 'medium'}
            />

            <FormControl fullWidth required size={isMobile ? 'medium' : 'medium'}>
              <InputLabel>角色</InputLabel>
              <Select
                multiple
                value={form.roleIdArr}
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
                  checked={form.isEnabled}
                  onChange={(e) => onFormChange({ ...form, isEnabled: e.target.checked })}
                  disabled={editId === 1}
                />
              }
              label="启用账户"
            />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2,
          flexDirection: isMobile ? 'column-reverse' : 'row',
          gap: isMobile ? 1 : 0,
        }}
      >
        <Button onClick={onCancel} fullWidth={isMobile} size={isMobile ? 'large' : 'medium'}>
          取消
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
        >
          {editId ? '更新' : '添加'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
