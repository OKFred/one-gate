import React, { useState, forwardRef, useImperativeHandle, memo, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Box,
  useTheme,
  IconButton,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import * as AttendanceAPI from '@/api/enterprise/attendance';
import * as UserAPI from '@/api/system/user';
import type { Props } from '../index';
import { useResponsive } from '@/hooks/useResponsive';
import { useTranslation } from '@/hooks/useTranslation';
import dayjs from 'dayjs';

export interface TheFormRef {
  onOpen: (row?: any) => void;
}

const DEFAULT_FORM = {
  employeeId: '',
  date: dayjs().format('YYYY-MM-DD'),
  checkInTime: null,
  checkOutTime: null,
  status: 0,
  remark: '',
};

const TheForm = memo(
  forwardRef<TheFormRef, Props>(({ localObj }, ref) => {
    const { tableRef } = localObj;
    const theme = useTheme();
    const { isMobile } = useResponsive();
    const t = useTranslation();

    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<any>(DEFAULT_FORM);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
      if (open) {
        UserAPI.listAllFn({ data: {} }).then(res => {
          setUsers(res.data?.data || []);
        });
      }
    }, [open]);

    useImperativeHandle(ref, () => ({
      onOpen: (row?: any) => {
        if (row) {
          setEditId(row.id);
          setForm({
            employeeId: row.employeeObj?.value || row.employeeId,
            date: row.date,
            checkInTime: row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : null,
            checkOutTime: row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : null,
            status: row.status,
            remark: row.remark || '',
          });
        } else {
          setEditId(null);
          setForm(DEFAULT_FORM);
        }
        setOpen(true);
      },
    }), []);

    const handleCancel = () => {
      setOpen(false);
      setEditId(null);
      setForm(DEFAULT_FORM);
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        const payload = {
          ...form,
          // Convert time strings back to timestamps if necessary, 
          // but our backend expects numbers. 
          // We'll combine date + time for checkIn/Out.
          checkInTime: form.checkInTime ? dayjs(`${form.date} ${form.checkInTime}`).valueOf() : null,
          checkOutTime: form.checkOutTime ? dayjs(`${form.date} ${form.checkOutTime}`).valueOf() : null,
        };

        if (editId) {
          await AttendanceAPI.updateFn({ data: { id: editId, ...payload } });
        } else {
          await AttendanceAPI.addFn({ data: payload });
        }
        handleCancel();
        tableRef.current?.refresh();
      } catch (error) {
        console.warn(error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Dialog
        open={open}
        onClose={handleCancel}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>{editId ? '编辑考勤' : '新增考勤'}</Box>
          {isMobile && (
            <IconButton onClick={handleCancel}>
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent sx={{ mt: 1 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <FormControl fullWidth required>
                <InputLabel>员工</InputLabel>
                <Select
                  value={form.employeeId}
                  label="员工"
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                >
                  {users.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.username}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="日期"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  label="签到时间"
                  type="time"
                  value={form.checkInTime || ''}
                  onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 1 }}
                />
                <TextField
                  label="签退时间"
                  type="time"
                  value={form.checkOutTime || ''}
                  onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ step: 1 }}
                />
              </Stack>

              <FormControl fullWidth>
                <InputLabel>状态</InputLabel>
                <Select
                  value={form.status}
                  label="状态"
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <MenuItem value={0}>正常</MenuItem>
                  <MenuItem value={1}>迟到</MenuItem>
                  <MenuItem value={2}>早退</MenuItem>
                  <MenuItem value={3}>旷工</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="备注"
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                fullWidth
                multiline
                rows={3}
                inputProps={{ maxLength: 500 }}
              />
            </Stack>
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCancel} disabled={loading}>取消</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={loading}>保存</Button>
        </DialogActions>
      </Dialog>
    );
  }),
);

export default TheForm;
