/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect } from 'react';
import { Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { TextField } from '@/components/Form';
import * as UserAPI from '@/api/system/user';
import type { ListAllUserRes } from '@/api/system/type';
import type { AttendanceRecord } from '../index';
import type { SchemaCrudConfig } from '@/components/Crud';
import type { FilterState } from './TheFilter';
import type { ListAttendanceReq } from '@/api/enterprise/type';
import dayjs from 'dayjs';

interface AttendanceFormFieldsProps {
  form: Partial<AttendanceRecord>;
  setForm: React.Dispatch<React.SetStateAction<Partial<AttendanceRecord>>>;
  t: (key: string) => string;
}

export const formConfig: SchemaCrudConfig<
  AttendanceRecord,
  FilterState,
  ListAttendanceReq
>['form'] = {
  schema: { type: 'object' },
  defaultForm: {
    employeeId: undefined,
    date: dayjs().format('YYYY-MM-DD'),
    _checkInStr: '',
    _checkOutStr: '',
    status: 0,
    remark: '',
  },
  afterOpen: (form, isEdit, row) => {
    if (!isEdit || !row) return form;
    return {
      ...form,
      employeeId: row.employeeObj?.value ?? row.employeeId,
      date: row.date,
      _checkInStr: row.checkInTime ? dayjs(row.checkInTime).format('HH:mm:ss') : '',
      _checkOutStr: row.checkOutTime ? dayjs(row.checkOutTime).format('HH:mm:ss') : '',
      status: row.status,
      remark: row.remark || '',
    };
  },
  beforeSubmit: (form) => {
    const { _checkInStr, _checkOutStr, ...rest } = form;
    return {
      ...rest,
      employeeId: Number(form.employeeId),
      checkInTime: _checkInStr ? dayjs(`${form.date} ${_checkInStr}`).valueOf() : null,
      checkOutTime: _checkOutStr ? dayjs(`${form.date} ${_checkOutStr}`).valueOf() : null,
    };
  },
  renderForm: (form, setForm, _isMobile, t) => (
    <AttendanceFormFields form={form} setForm={setForm} t={t} />
  ),
};

function AttendanceFormFields({ form, setForm, t }: AttendanceFormFieldsProps) {
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
        name="date"
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
          name="_checkInStr"
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
          name="_checkOutStr"
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
        name="remark"
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
