import { useState, useEffect } from 'react';
import { TextField, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import * as UserAPI from '@/api/system/user';
import type { ListAllUserRes } from '@/api/system/type';
import type { AttendanceRecord } from '../index';

interface AttendanceFormFieldsProps {
  form: Partial<AttendanceRecord>;
  setForm: (updater: (prev: Partial<AttendanceRecord>) => Partial<AttendanceRecord>) => void;
  t: (key: string) => string;
}

export default function AttendanceFormFields({ form, setForm, t }: AttendanceFormFieldsProps) {
  const [users, setUsers] = useState<ListAllUserRes>([]);

  useEffect(() => {
    UserAPI.listAllFn({ data: {} }).then((res) => {
      setUsers(res.data?.data || []);
    });
  }, []);

  const update = (patch: Partial<AttendanceRecord>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <Stack spacing={3} sx={{ mt: 1 }}>
      {/* 员工选择 */}
      <FormControl fullWidth required>
        <InputLabel>{t('enterprise.attendance.employee')}</InputLabel>
        <Select
          value={form.employeeId ?? ''}
          label={t('enterprise.attendance.employee')}
          onChange={(e) => update({ employeeId: e.target.value as number })}
        >
          {users.map((u) => (
            <MenuItem key={u.id} value={u.id}>
              {u.username}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* 日期 */}
      <TextField
        label={t('enterprise.attendance.date')}
        type="date"
        value={form.date ?? ''}
        onChange={(e) => update({ date: e.target.value })}
        required
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
      />

      {/* 打卡时间 / 下班时间 */}
      <Stack direction="row" spacing={2}>
        <TextField
          label={t('enterprise.attendance.checkInTime')}
          type="time"
          value={form._checkInStr ?? ''}
          onChange={(e) => update({ _checkInStr: e.target.value })}
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { step: 1 },
          }}
        />
        <TextField
          label={t('enterprise.attendance.checkOutTime')}
          type="time"
          value={form._checkOutStr ?? ''}
          onChange={(e) => update({ _checkOutStr: e.target.value })}
          fullWidth
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { step: 1 },
          }}
        />
      </Stack>

      {/* 状态 */}
      <FormControl fullWidth>
        <InputLabel>{t('enterprise.attendance.status')}</InputLabel>
        <Select
          value={form.status ?? 0}
          label={t('enterprise.attendance.status')}
          onChange={(e) => update({ status: e.target.value as 0 | 1 | 2 | 3 })}
        >
          <MenuItem value={0}>{t('enterprise.attendance.status.normal')}</MenuItem>
          <MenuItem value={1}>{t('enterprise.attendance.status.late')}</MenuItem>
          <MenuItem value={2}>{t('enterprise.attendance.status.earlyLeave')}</MenuItem>
          <MenuItem value={3}>{t('enterprise.attendance.status.absent')}</MenuItem>
        </Select>
      </FormControl>

      {/* 备注 */}
      <TextField
        label={t('column.remark')}
        value={form.remark ?? ''}
        onChange={(e) => update({ remark: e.target.value })}
        fullWidth
        multiline
        rows={3}
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
    </Stack>
  );
}
